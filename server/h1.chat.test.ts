import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  bindInviteCodeToUser: vi.fn(),
  getReferralOverview: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "LLM fallback" } }],
  })),
}));

vi.mock("./okx", async () => {
  const actual = await vi.importActual<typeof import("./okx")>("./okx");

  return {
    ...actual,
    getOkxDemoConnectivitySnapshot: vi.fn(async () => ({
      connected: true,
      level: "authenticated",
      note: "demo ready",
      restBaseUrl: "https://www.okx.com",
      requiredHeaders: ["x-simulated-trading"],
      status: 200,
    })),
    getOkxMarketSnapshot: vi.fn(async (instId: string) => ({
      instId,
      ticker: {
        instId,
        last: 67890.12,
        open24h: 63810,
        high24h: 68950.55,
        low24h: 62123.45,
        vol24h: 15234.56,
        volCcy24h: 99887766.55,
        bidPx: 67889.11,
        askPx: 67890.13,
        ts: 1711111111111,
      },
      instrument: {
        instId,
        instType: "SPOT",
        baseCcy: instId.split("-")[0] ?? "BTC",
        quoteCcy: instId.split("-")[1] ?? "USDT",
        state: "live",
        tickSz: "0.1",
        lotSz: "0.0001",
        lever: null,
        listTime: 1700000000000,
      },
      candles: [
        { ts: 1711110000000, open: 67100, high: 67500, low: 66980, close: 67320, confirm: true },
        { ts: 1711110600000, open: 67320, high: 67910, low: 67250, close: 67780, confirm: true },
        { ts: 1711111200000, open: 67780, high: 68050, low: 67690, close: 67890.12, confirm: true },
      ],
      priceChange: 4080.12,
      priceChangePct: 6.39,
    })),
  };
});

import { bindInviteCodeToUser, getReferralOverview } from "./db";
import { getOkxMarketSnapshot } from "./okx";
import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-open-id",
    email: "user@example.com",
    name: "Logic Tester",
    loginMethod: "manus",
    role: "user",
    inviteCode: "H1SELF42",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("h1.chat", () => {
  it("returns OKX market and token details for market questions", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.h1.chat({
      messages: [{ role: "user", content: "BTC 行情" }],
    });

    expect(getOkxMarketSnapshot).toHaveBeenCalledWith("BTC-USDT");
    expect(result.content).toContain("BTC-USDT 当前最新成交价");
    expect(result.content).toContain("现货交易对 BTC-USDT");
    expect(result.content).toContain("最近 K 线收盘");
  });

  it("returns token information when users ask for coin details", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.h1.chat({
      messages: [{ role: "user", content: "ETH 代币信息" }],
    });

    expect(getOkxMarketSnapshot).toHaveBeenCalledWith("ETH-USDT");
    expect(result.content).toContain("基础币 ETH");
    expect(result.content).toContain("最小价格精度 0.1");
  });

  it("binds inviter code through chat instructions for logged-in users", async () => {
    vi.mocked(bindInviteCodeToUser).mockResolvedValue({
      status: "bound",
      binding: {
        userId: 42,
        inviterUserId: 7,
        inviteCode: "H1ABCD12",
      },
      inviter: { id: 7 },
    } as never);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.h1.chat({
      messages: [{ role: "user", content: "帮我绑定上级邀请码 H1ABCD12" }],
    });

    expect(bindInviteCodeToUser).toHaveBeenCalledWith({ userId: 42, inviteCode: "H1ABCD12" });
    expect(result.content).toContain("已绑定成功");
    expect(result.content).toContain("5% 规则");
  });

  it("returns referral overview through chat for logged-in users", async () => {
    vi.mocked(getReferralOverview).mockResolvedValue({
      inviteCode: "H1SELF42",
      inviterInviteCode: "H1UP8888",
      referralCount: 3,
      totalReward: 12.5,
      projectedReward: 19.85,
      ratePct: 5,
    });

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.h1.chat({
      messages: [{ role: "user", content: "我的邀请码和团队收益" }],
    });

    expect(getReferralOverview).toHaveBeenCalled();
    expect(result.content).toContain("你当前的邀请码是 H1SELF42");
    expect(result.content).toContain("累计邀请收益：12.50 USDT");
    expect(result.content).toContain("当前邀请分润比例为 5%");
  });

  it("returns strategy status details for strategy questions", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.h1.chat({
      messages: [{ role: "user", content: "当前策略状态" }],
    });

    expect(result.content).toContain("当前 AI智能策略主观察标的是 ETH-USDT");
    expect(result.content).toContain("Arbitrum");
    expect(result.content).toContain("已结算策略数");
  });
});
