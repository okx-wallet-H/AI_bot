import { appRouter } from "../server/routers.ts";
import { ensureUserInviteCode, getUserByOpenId, upsertUser } from "../server/db.ts";

const runId = Date.now();
const inviterOpenId = `selftest-inviter-${runId}`;
const inviteeOpenId = `selftest-invitee-${runId}`;

async function createUser(openId, name) {
  await upsertUser({
    openId,
    name,
    email: `${openId}@example.com`,
    loginMethod: "manus",
    role: "user",
    lastSignedIn: new Date(),
  });

  const user = await getUserByOpenId(openId);
  if (!user) {
    throw new Error(`USER_CREATE_FAILED:${openId}`);
  }

  return user;
}

async function main() {
  const inviter = await createUser(inviterOpenId, "Self Test Inviter");
  const invitee = await createUser(inviteeOpenId, "Self Test Invitee");
  const inviteCode = await ensureUserInviteCode(inviter.id);

  const req = { protocol: "https", headers: {} };
  const res = {};

  const publicCaller = appRouter.createCaller({ user: null, req, res });
  const authCaller = appRouter.createCaller({ user: invitee, req, res });

  const bootstrap = await publicCaller.h1.bootstrap();
  const market = await publicCaller.h1.chat({
    messages: [{ role: "user", content: "BTC 行情" }],
  });
  const token = await publicCaller.h1.chat({
    messages: [{ role: "user", content: "ETH 代币信息" }],
  });
  const bind = await authCaller.h1.chat({
    messages: [{ role: "user", content: `帮我绑定上级邀请码 ${inviteCode}` }],
  });
  const referral = await authCaller.h1.chat({
    messages: [{ role: "user", content: "我的邀请码和团队收益" }],
  });

  console.log(
    JSON.stringify(
      {
        bootstrap: {
          marketInstId: bootstrap.marketOverview?.instId ?? null,
          marketLast: bootstrap.marketOverview?.last ?? null,
          inviteCode: bootstrap.referralOverview?.inviteCode ?? null,
        },
        market: market.content,
        token: token.content,
        bind: bind.content,
        referral: referral.content,
        inviteCode,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
