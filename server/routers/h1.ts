import { z } from "zod";
import type { User } from "../../drizzle/schema";
import {
  bindInviteCodeToUser,
  getReferralOverview,
} from "../db";
import { invokeLLM } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";
import {
  getOkxDemoConnectivitySnapshot,
  getOkxMarketSnapshot,
  normalizeOkxSpotInstId,
} from "../okx";
import {
  buildClientExecutionHints,
  createSimulationSnapshot,
  loadRuntimeConfig,
  summarizeSnapshot,
} from "../../signals/src/index";

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const SYMBOL_ALIASES: Record<string, string> = {
  btc: "BTC",
  比特币: "BTC",
  bitcoin: "BTC",
  eth: "ETH",
  以太坊: "ETH",
  ethereum: "ETH",
  sol: "SOL",
  solana: "SOL",
  okb: "OKB",
  usdt: "USDT",
  usdc: "USDC",
  doge: "DOGE",
  狗狗币: "DOGE",
  xrp: "XRP",
  bnb: "BNB",
};

function formatAmount(value: number, digits = 2) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPercent(value: number, digits = 2) {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(digits)}%`;
}

function formatShortTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function extractInviteCode(message: string) {
  const direct = message.match(/(?:邀请码|invite\s*code|code)\s*[:：]?\s*([A-Za-z0-9]{4,32})/i)?.[1];
  if (direct) return direct.toUpperCase();

  const tokens = message.match(/[A-Za-z0-9]{4,32}/g) ?? [];
  const filtered = tokens
    .map((item) => item.toUpperCase())
    .filter((item) => !["AI", "OKX", "USDT", "BTC", "ETH", "SOL", "PRICE", "TOKEN"].includes(item));

  return filtered.at(-1) ?? null;
}

function inferInstIdFromMessage(message: string) {
  const pairMatch = message.match(/([A-Za-z0-9]{2,12})\s*[-\/]\s*([A-Za-z0-9]{2,12})/);
  if (pairMatch) {
    return normalizeOkxSpotInstId(`${pairMatch[1]}-${pairMatch[2]}`);
  }

  const lower = message.toLowerCase();
  for (const [alias, symbol] of Object.entries(SYMBOL_ALIASES)) {
    if (lower.includes(alias.toLowerCase())) {
      return normalizeOkxSpotInstId(symbol);
    }
  }

  const uppercaseToken = message.match(/\b([A-Z]{2,10})\b/)?.[1];
  if (uppercaseToken) {
    return normalizeOkxSpotInstId(uppercaseToken);
  }

  return null;
}

async function getIntegrationAudit() {
  const demoTrading = await getOkxDemoConnectivitySnapshot();

  return {
    executionMode: "simulation-first" as const,
    agentTradeKit: {
      connected: false,
      level: "not_integrated" as const,
      note: "当前代码库未发现 okx/agent-trade-kit 官方 SDK 或执行适配层，仍处于待接入状态。",
    },
    demoTrading,
    walletApi: {
      connected: false,
      level: "client_detect_only" as const,
      note: "当前前端仅做 OKX 钱包注入检测与本地金库派生，尚未接入官方钱包账户、签名或余额 API。",
    },
    onchainOs: {
      connected: false,
      level: "not_integrated" as const,
      note: "当前未发现 OnchainOS Skills、Market 或钱包 Open API 的真实调用；现阶段行情查询已接入 OKX 公共市场接口。",
    },
  };
}

async function getPrimaryMarketOverview(instId: string) {
  try {
    const snapshot = await getOkxMarketSnapshot(instId);

    return {
      instId: snapshot.instId,
      last: snapshot.ticker.last,
      open24h: snapshot.ticker.open24h,
      high24h: snapshot.ticker.high24h,
      low24h: snapshot.ticker.low24h,
      priceChange: snapshot.priceChange,
      priceChangePct: snapshot.priceChangePct,
      updatedAt: snapshot.ticker.ts,
      instrument: snapshot.instrument,
      candles: snapshot.candles.map((item) => ({
        label: formatShortTime(item.ts),
        open: item.open,
        close: item.close,
        high: item.high,
        low: item.low,
      })),
    };
  } catch {
    return null;
  }
}

async function buildBootstrapPayload(user?: User | null) {
  const config = loadRuntimeConfig();
  const snapshot = createSimulationSnapshot(config);
  const summary = summarizeSnapshot(snapshot);
  const primaryIntent = snapshot.orderIntents[0];
  const primaryInstId = normalizeOkxSpotInstId(
    `${primaryIntent?.baseAsset ?? "ETH"}-${primaryIntent?.quoteAsset ?? "USDT"}`,
  ) ?? "ETH-USDT";

  let referralOverview: Awaited<ReturnType<typeof getReferralOverview>> | null = null;

  if (user?.id) {
    try {
      referralOverview = await getReferralOverview(user.id, summary.netProfit);
    } catch {
      referralOverview = null;
    }
  }

  return {
    config,
    summary,
    executionHints: buildClientExecutionHints(snapshot),
    snapshot,
    integrationAudit: await getIntegrationAudit(),
    marketOverview: await getPrimaryMarketOverview(primaryInstId),
    referralOverview,
  };
}

type BootstrapPayload = Awaited<ReturnType<typeof buildBootstrapPayload>>;

function buildAssistantSystemPrompt(bootstrap: BootstrapPayload) {
  const { config, summary, integrationAudit, marketOverview, referralOverview } = bootstrap;

  const marketLine = marketOverview
    ? `当前真实行情锚点：${marketOverview.instId} 最新价 ${marketOverview.last.toFixed(2)}，24h 涨跌 ${formatPercent(marketOverview.priceChangePct)}。`
    : "当前真实行情锚点暂不可用，如查询失败必须明确说明失败原因。";

  const referralLine = referralOverview
    ? `当前登录用户邀请码：${referralOverview.inviteCode}；已绑定上级邀请码：${referralOverview.inviterInviteCode ?? "未绑定"}；当前邀请分润比例 ${referralOverview.ratePct}%。`
    : "若用户已登录，可帮助其查询邀请码状态、绑定上级邀请码，并说明 5% 邀请分润规则。";

  const demoStatus = integrationAudit.demoTrading.connected
    ? `已完成 OKX Demo Trading 真实鉴权，REST 走 https://www.okx.com，且请求头必须带 x-simulated-trading: 1。当前状态说明：${integrationAudit.demoTrading.note}`
    : `OKX Demo Trading 尚未形成可用鉴权闭环。当前状态说明：${integrationAudit.demoTrading.note}`;

  return [
    "你是 H 1.0 Pro 的黑金交易终端 AI 助手。",
    "你的职责是基于当前项目的真实接入状态，为用户提供行情信息、代币信息、邀请码绑定说明、资产解读与风险提示。",
    "当系统已经给出真实行情或邀请码结果时，优先直接引用这些结果；不要把未接入能力说成已经完成。",
    "回复风格要求：先给结论，再给依据；保持专业、克制、简洁，使用短段落；避免夸张营销语。",
    `当前运行模式：${integrationAudit.executionMode}。应用模式：${config.mode}。结算资产：EVM / USDT。归集地址：${config.collectorAddress}。`,
    `当前仿真快照：订单 ${summary.orderCount} 条，执行 ${summary.executionCount} 条，已结算 ${summary.settledCount} 条。`,
    `Demo Trading：${demoStatus}`,
    marketLine,
    referralLine,
    "当用户询问风险时，要强调：当前版本以 simulation-first 为主，收益展示与策略执行仍主要用于演示和仿真，不构成投资建议。",
  ].join("\n");
}

function coerceAssistantText(
  content: string | Array<{ type: "text" | "image_url" | "file_url"; text?: string }>,
) {
  if (typeof content === "string") {
    return content.trim();
  }

  return content
    .map((part) => (part.type === "text" ? part.text ?? "" : ""))
    .join("\n\n")
    .trim();
}

async function tryBuildInviteBindingReply(message: string, user?: User | null) {
  const wantsBind = /绑定.*邀请码|邀请码.*绑定|上级邀请码/.test(message);
  if (!wantsBind) return null;

  if (!user?.id) {
    return [
      "结论：要绑定上级邀请码，当前需要先登录账号。",
      "依据是邀请码绑定会把关系写入当前登录用户档案；未登录状态下我无法确认你要绑定到哪个账户。",
      "你登录后可以直接发送：帮我绑定上级邀请码 H1XXXX。",
    ].join("\n\n");
  }

  const inviteCode = extractInviteCode(message);
  if (!inviteCode) {
    return [
      "结论：我已经识别到你想绑定上级邀请码，但消息里还没有可用的邀请码。",
      "请直接发送完整指令，例如：帮我绑定上级邀请码 H1ABCD12。",
    ].join("\n\n");
  }

  try {
    const result = await bindInviteCodeToUser({ userId: user.id, inviteCode });

    if (result.status === "already_bound") {
      return [
        `结论：你的账户已经绑定过邀请码 ${inviteCode}。`,
        "当前系统检测到相同邀请码已存在绑定关系，因此无需重复提交。",
      ].join("\n\n");
    }

    return [
      `结论：上级邀请码 ${inviteCode} 已绑定成功。`,
      `你已建立上下级关系，后续邀请收益将按 5% 规则归集到对应上级账户。当前上级用户 ID：${result.inviter?.id ?? "已记录"}。`,
      "如果你还需要，我可以继续帮你查询当前邀请码、团队人数或最近的策略行情。",
    ].join("\n\n");
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (messageText === "INVITE_CODE_NOT_FOUND") {
      return [
        `结论：邀请码 ${inviteCode} 当前不存在。`,
        "请检查邀请码是否输入完整，或向上级确认其邀请码是否已经生成。",
      ].join("\n\n");
    }

    if (messageText === "INVITE_CODE_ALREADY_BOUND") {
      return [
        "结论：你的账户已经绑定过其他上级邀请码，当前不能重复更换。",
        "如需调整绑定关系，需要后续增加人工审核或管理员修改流程。",
      ].join("\n\n");
    }

    if (messageText === "INVITE_CODE_SELF_NOT_ALLOWED") {
      return [
        "结论：不能绑定自己的邀请码。",
        "请改为填写上级用户的邀请码，再重新发送绑定指令。",
      ].join("\n\n");
    }

    if (messageText === "DATABASE_NOT_AVAILABLE") {
      return [
        "结论：当前邀请码服务暂时不可写入。",
        "数据库连接当前不可用，请稍后重试。",
      ].join("\n\n");
    }

    return [
      "结论：邀请码绑定暂时失败。",
      `系统返回：${messageText}`,
      "你可以稍后再次发送绑定指令，我也可以先帮你查询行情或邀请码规则。",
    ].join("\n\n");
  }
}

async function tryBuildReferralReply(message: string, user?: User | null, bootstrap?: BootstrapPayload) {
  if (!/邀请码|邀请|分润|团队收益|上级|下级/.test(message)) return null;
  if (/绑定.*邀请码|邀请码.*绑定/.test(message)) return null;

  if (!user?.id) {
    return [
      "结论：邀请码与团队收益规则已经支持说明，但要查询你的个人邀请码与上下级状态，需要先登录账号。",
      "当前规则是：邀请好友绑定你的邀请码后，可抽取其盈利的 5%。",
      "登录后我可以直接返回你的邀请码、是否已绑定上级，以及当前团队收益概览。",
    ].join("\n\n");
  }

  try {
    const overview = await getReferralOverview(user.id, bootstrap?.summary.netProfit ?? 0);

    return [
      `结论：你当前的邀请码是 ${overview.inviteCode}。`,
      `已绑定上级邀请码：${overview.inviterInviteCode ?? "未绑定"}；当前直接邀请人数：${overview.referralCount}；累计邀请收益：${formatAmount(overview.totalReward)} USDT。`,
      `当前邀请分润比例为 ${overview.ratePct}% 。按当前策略累计收益口径估算，投影团队收益约为 ${formatAmount(overview.projectedReward)} USDT。`,
    ].join("\n\n");
  } catch {
    return [
      "结论：邀请码概览暂时无法读取。",
      "请稍后重试，或先继续查询行情与策略状态。",
    ].join("\n\n");
  }
}

function buildStrategyReply(bootstrap: BootstrapPayload) {
  const primary = bootstrap.snapshot.orderIntents[0];
  const market = bootstrap.marketOverview;

  return [
    `结论：当前 AI智能策略主观察标的是 ${market?.instId ?? `${primary.baseAsset}-${primary.quoteAsset}`}。`,
    `当前策略路由：${primary.route}；预计边际：+${(primary.expectedEdgeBps / 100).toFixed(2)}%；已结算策略数：${bootstrap.summary.settledCount}。`,
    market
      ? `真实市场侧最新价 ${market.last.toFixed(2)}，24h 涨跌 ${formatPercent(market.priceChangePct)}，高低点区间 ${market.low24h.toFixed(2)} ~ ${market.high24h.toFixed(2)}。`
      : "当前真实市场锚点暂不可用，因此前端将回退到仿真 K 线与策略快照。",
  ].join("\n\n");
}

async function tryBuildMarketReply(message: string) {
  const isMarketQuestion = /行情|价格|走势|代币|token|币种|price|k线|K线|涨跌/.test(message);
  const instId = inferInstIdFromMessage(message);

  if (!isMarketQuestion && !instId) {
    return null;
  }

  if (!instId) {
    return [
      "结论：我可以帮你查 OKX 的实时行情与代币资料，但你这条消息里还没有明确的币种。",
      "请直接发送类似：BTC 行情、ETH 价格、SOL 代币信息、BTC-USDT K线。",
    ].join("\n\n");
  }

  try {
    const snapshot = await getOkxMarketSnapshot(instId);
    const latestCandles = snapshot.candles.slice(-3).map((item) => `${formatShortTime(item.ts)} ${item.close.toFixed(2)}`);

    return [
      `结论：${instId} 当前最新成交价为 ${formatAmount(snapshot.ticker.last, 4)} ${snapshot.instrument.quoteCcy ?? "USDT"}，24h 涨跌 ${formatPercent(snapshot.priceChangePct)}。`,
      `依据：24h 高点 ${formatAmount(snapshot.ticker.high24h, 4)}，24h 低点 ${formatAmount(snapshot.ticker.low24h, 4)}，24h 成交量 ${formatAmount(snapshot.ticker.vol24h, 2)} ${snapshot.instrument.baseCcy ?? ""}。`,
      `代币资料：现货交易对 ${snapshot.instrument.instId}，基础币 ${snapshot.instrument.baseCcy ?? "未知"}，计价币 ${snapshot.instrument.quoteCcy ?? "未知"}，最小价格精度 ${snapshot.instrument.tickSz ?? "未知"}，最小下单量 ${snapshot.instrument.lotSz ?? "未知"}。`,
      latestCandles.length > 0 ? `最近 K 线收盘：${latestCandles.join(" | ")}` : "当前未取到最近 K 线数据。",
    ].join("\n\n");
  } catch (error) {
    return [
      `结论：${instId} 的 OKX 行情暂时没有查询成功。`,
      `系统返回：${error instanceof Error ? error.message : "未知错误"}`,
      "你可以换一个交易对重试，例如 BTC-USDT、ETH-USDT、SOL-USDT。",
    ].join("\n\n");
  }
}

function buildFallbackReply(userMessage: string, bootstrap: BootstrapPayload) {
  const normalized = userMessage.toLowerCase();

  if (
    normalized.includes("demo") ||
    normalized.includes("模拟") ||
    normalized.includes("仿真") ||
    normalized.includes("交易")
  ) {
    return [
      "结论：当前 Demo Trading 的关键鉴权条件已经成立。",
      `依据是服务端已经验证了 OKX 模拟盘凭证，并要求 REST 继续走 https://www.okx.com，同时带上 x-simulated-trading: 1 请求头。当前状态为：${bootstrap.integrationAudit.demoTrading.note}`,
      "但需要注意，这代表模拟盘认证与状态联通已成立，不等于全部交易链路都已经完整落地。后续仍需要继续补下单、撤单、持仓与账单查询等接口。",
    ].join("\n\n");
  }

  if (normalized.includes("策略")) {
    return buildStrategyReply(bootstrap);
  }

  return [
    "结论：当前 H 1.0 Pro 已具备黑金终端首页、仿真信号快照、OKX 真实行情查询与邀请码规则说明能力。",
    `目前服务端可返回 ${bootstrap.summary.orderCount} 条策略意图、${bootstrap.summary.executionCount} 条执行流、${bootstrap.summary.settledCount} 条结算数据，并可直接在对话中查询 BTC / ETH / SOL 等行情与代币资料。`,
    "如果你继续发消息，我可以直接帮你查行情、解释策略状态、查询邀请码概览，或执行上级邀请码绑定。",
  ].join("\n\n");
}

export const h1Router = router({
  bootstrap: publicProcedure.query(async ({ ctx }) => buildBootstrapPayload(ctx.user ?? null)),

  chat: publicProcedure
    .input(
      z.object({
        messages: z.array(chatMessageSchema).min(1).max(12),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const bootstrap = await buildBootstrapPayload(ctx.user ?? null);
      const userFacingMessages = input.messages.filter((message) => message.role !== "system").slice(-8);
      const lastUserMessage = [...userFacingMessages].reverse().find((message) => message.role === "user")?.content ?? "";

      const inviteBindingReply = await tryBuildInviteBindingReply(lastUserMessage, ctx.user ?? null);
      if (inviteBindingReply) {
        return {
          content: inviteBindingReply,
          summary: bootstrap.summary,
          integrationAudit: bootstrap.integrationAudit,
        };
      }

      const referralReply = await tryBuildReferralReply(lastUserMessage, ctx.user ?? null, bootstrap);
      if (referralReply) {
        return {
          content: referralReply,
          summary: bootstrap.summary,
          integrationAudit: bootstrap.integrationAudit,
        };
      }

      const marketReply = await tryBuildMarketReply(lastUserMessage);
      if (marketReply) {
        return {
          content: marketReply,
          summary: bootstrap.summary,
          integrationAudit: bootstrap.integrationAudit,
        };
      }

      if (/策略状态|立即开启|加仓|赎回|策略/.test(lastUserMessage)) {
        return {
          content: buildStrategyReply(bootstrap),
          summary: bootstrap.summary,
          integrationAudit: bootstrap.integrationAudit,
        };
      }

      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: buildAssistantSystemPrompt(bootstrap),
            },
            ...userFacingMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
        });

        const content = coerceAssistantText(response.choices[0]?.message.content ?? "");

        return {
          content: content || buildFallbackReply(lastUserMessage, bootstrap),
          summary: bootstrap.summary,
          integrationAudit: bootstrap.integrationAudit,
        };
      } catch {
        return {
          content: buildFallbackReply(lastUserMessage, bootstrap),
          summary: bootstrap.summary,
          integrationAudit: bootstrap.integrationAudit,
        };
      }
    }),
});
