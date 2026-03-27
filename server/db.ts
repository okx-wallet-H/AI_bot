import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, inviteBindings, referralRewards, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase();
}

function buildInviteCode(userId: number) {
  const base = userId.toString(36).toUpperCase();
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `H1${base}${suffix}`;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "inviteCode"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by id: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByInviteCode(inviteCode: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by invite code: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.inviteCode, normalizeInviteCode(inviteCode)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function ensureUserInviteCode(userId: number) {
  const db = await getDb();
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  if (user.inviteCode) {
    return user.inviteCode;
  }

  if (!db) {
    return buildInviteCode(userId);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = buildInviteCode(userId);

    try {
      await db.update(users).set({ inviteCode }).where(eq(users.id, userId));
      return inviteCode;
    } catch (error) {
      if (attempt === 4) {
        console.error("[Database] Failed to assign invite code:", error);
        throw new Error("INVITE_CODE_ASSIGN_FAILED");
      }
    }
  }

  throw new Error("INVITE_CODE_ASSIGN_FAILED");
}

export async function getInviteBindingForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get invite binding: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(inviteBindings)
    .where(eq(inviteBindings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function bindInviteCodeToUser(params: { userId: number; inviteCode: string }) {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_NOT_AVAILABLE");
  }

  const inviteCode = normalizeInviteCode(params.inviteCode);
  const user = await getUserById(params.userId);
  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  const ownInviteCode = await ensureUserInviteCode(params.userId);
  if (ownInviteCode === inviteCode) {
    throw new Error("INVITE_CODE_SELF_NOT_ALLOWED");
  }

  const existingBinding = await getInviteBindingForUser(params.userId);
  if (existingBinding) {
    if (existingBinding.inviteCode === inviteCode) {
      return { status: "already_bound" as const, binding: existingBinding };
    }
    throw new Error("INVITE_CODE_ALREADY_BOUND");
  }

  const inviter = await getUserByInviteCode(inviteCode);
  if (!inviter) {
    throw new Error("INVITE_CODE_NOT_FOUND");
  }

  if (inviter.id === params.userId) {
    throw new Error("INVITE_CODE_SELF_NOT_ALLOWED");
  }

  await db.insert(inviteBindings).values({
    userId: params.userId,
    inviterUserId: inviter.id,
    inviteCode,
  });

  return {
    status: "bound" as const,
    binding: {
      userId: params.userId,
      inviterUserId: inviter.id,
      inviteCode,
    },
    inviter,
  };
}

export async function recordReferralReward(params: {
  inviterUserId: number;
  inviteeUserId: number;
  baseAmount: number;
  rewardAmount: number;
  source?: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error("DATABASE_NOT_AVAILABLE");
  }

  await db.insert(referralRewards).values({
    inviterUserId: params.inviterUserId,
    inviteeUserId: params.inviteeUserId,
    source: params.source ?? "team_profit",
    rateBps: 500,
    baseAmount: params.baseAmount.toFixed(2),
    rewardAmount: params.rewardAmount.toFixed(2),
  });
}

export async function getReferralOverview(userId: number, projectedBaseProfit = 0) {
  const inviteCode = await ensureUserInviteCode(userId);
  const binding = await getInviteBindingForUser(userId);
  const db = await getDb();

  if (!db) {
    return {
      inviteCode,
      inviterInviteCode: binding?.inviteCode ?? null,
      referralCount: 0,
      totalReward: 0,
      projectedReward: 0,
      ratePct: 5,
    };
  }

  const directReferrals = await db
    .select()
    .from(inviteBindings)
    .where(eq(inviteBindings.inviterUserId, userId));

  const rewardRows = await db
    .select()
    .from(referralRewards)
    .where(eq(referralRewards.inviterUserId, userId));

  const totalReward = Number(
    rewardRows
      .reduce((sum, item) => sum + Number(item.rewardAmount ?? 0), 0)
      .toFixed(2),
  );

  const projectedReward = Number((directReferrals.length * projectedBaseProfit * 0.05).toFixed(2));

  return {
    inviteCode,
    inviterInviteCode: binding?.inviteCode ?? null,
    referralCount: directReferrals.length,
    totalReward,
    projectedReward,
    ratePct: 5,
  };
}

export async function hasInviteBindingBetween(userId: number, inviterUserId: number) {
  const db = await getDb();
  if (!db) {
    return false;
  }

  const result = await db
    .select()
    .from(inviteBindings)
    .where(and(eq(inviteBindings.userId, userId), eq(inviteBindings.inviterUserId, inviterUserId)))
    .limit(1);

  return result.length > 0;
}
