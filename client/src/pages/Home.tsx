/*
Design reminder for this file — H 1.0 Pro:
- Philosophy: Swiss Internationalism x Luxury Financial Terminal.
- Hard references: matte black industrial panel, ultra-thin gold lines, deep chamber layering, restrained glow, grid matrix.
- Avoid centered landing-page feel, purple gradients, bubbly cards, excessive roundness, emojis.
- Use gold only for active value, profit emphasis, and critical action states.
*/

import { useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AIChatBox, type Message as ChatMessage } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import {
  deriveOrLoadLocalVault,
  detectOkxWallet,
  loadLocalVault,
  maskAddress,
  type LocalVaultRecord,
} from "@/lib/localVault";

type EngineKey = "arbitrage" | "momentum" | "treasury";
type WalletMode = "detecting" | "okx_wallet" | "local_vault";

type LaunchContext = {
  version?: string;
  mode?: "simulation" | "production-ready";
  settleAsset?: string;
  settleChain?: string;
  collectorAddress?: string;
  engines?: string[];
  userId?: number;
  botUsername?: string;
  issuedAt?: string;
};

type ExecutionItem = {
  id: string;
  engine: EngineKey;
  label: string;
  route: string;
  status: "queued" | "running" | "settled";
  timestamp: string;
  pnl: number;
};

type KlinePoint = {
  label: string;
  open: number;
  close: number;
  high: number;
  low: number;
};

const BASE_USDT_BALANCE = 12680;

const ENGINE_LABELS: Record<EngineKey, string> = {
  arbitrage: "恒定套利",
  momentum: "动能捕获",
  treasury: "全域归集",
};

const FALLBACK_EXECUTIONS: ExecutionItem[] = [
  {
    id: "AX-2041",
    engine: "arbitrage",
    label: "ETH / USDT 价差捕捉",
    route: "Arbitrum · Uniswap V3 → OKX DEX",
    status: "running",
    timestamp: "14:31:08",
    pnl: 82.14,
  },
  {
    id: "MM-1883",
    engine: "momentum",
    label: "ETH 动能窗口追踪",
    route: "Base · Spot + Perps Overlay",
    status: "queued",
    timestamp: "14:31:19",
    pnl: 0,
  },
  {
    id: "TR-9054",
    engine: "treasury",
    label: "跨链利润归集",
    route: "Solana → EVM USDT Settlement",
    status: "settled",
    timestamp: "14:30:54",
    pnl: 126.88,
  },
  {
    id: "AX-2036",
    engine: "arbitrage",
    label: "BTC / USDC 网格净值校正",
    route: "Base · OKX DEX Loop",
    status: "settled",
    timestamp: "14:29:43",
    pnl: 47.23,
  },
];

const fallbackKlineData: KlinePoint[] = [
  { label: "09:00", open: 100.8, close: 102.2, high: 103.1, low: 100.1 },
  { label: "09:30", open: 102.2, close: 101.6, high: 102.8, low: 101.1 },
  { label: "10:00", open: 101.6, close: 104.1, high: 104.8, low: 101.4 },
  { label: "10:30", open: 104.1, close: 103.7, high: 104.9, low: 103.1 },
  { label: "11:00", open: 103.7, close: 105.8, high: 106.4, low: 103.4 },
  { label: "11:30", open: 105.8, close: 106.9, high: 107.5, low: 105.3 },
  { label: "12:00", open: 106.9, close: 105.7, high: 107.1, low: 105.2 },
  { label: "12:30", open: 105.7, close: 107.8, high: 108.4, low: 105.1 },
  { label: "13:00", open: 107.8, close: 109.2, high: 110.1, low: 107.4 },
  { label: "13:30", open: 109.2, close: 108.6, high: 109.9, low: 108.2 },
  { label: "14:00", open: 108.6, close: 111.4, high: 112.2, low: 108.1 },
  { label: "14:30", open: 111.4, close: 110.8, high: 111.9, low: 110.2 },
];

const faqItems = [
  {
    id: "faq-1",
    question: "什么是 H 智能交易策略？",
    answer:
      "H 1.0 策略模型是基于 OKX Onchain OS 原生开发的 Web3 基础设施，是一种全新的金融形态。它集合了 OKX 交易所的数据能力，并将核心能力以 Skills 形式封装，让更多用户都可以使用交易所级别的行情分析、策略信号与执行辅助。",
  },
  {
    id: "faq-2",
    question: "这个 AI 有什么优势与功能？",
    answer:
      "AI 助手基于 Agent 的原生钱包 Agentic Wallet 与交易所级数据能力工作，为资产安全、行情识别与策略协同提供支持。你可以在对话框发送任何行情问题，系统会协助查询并监听 130+ 链上代币动态，同时给出策略分析与投资辅助信息。",
  },
  {
    id: "faq-3",
    question: "可以自己搭建策略自动买卖吗？",
    answer:
      "可以。你可以直接在对话框中向 AI 助手索取最新资讯、策略思路与行情信息，并在此基础上继续自建策略交易与自动化买卖逻辑。",
  },
] as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function decodeLaunchContext(value: string | null): LaunchContext | null {
  if (!value || typeof window === "undefined") return null;

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as LaunchContext;
  } catch {
    return null;
  }
}

function showNotice(message: string) {
  if (typeof window === "undefined") return;

  try {
    const webApp = WebApp as unknown as { showAlert?: (text: string) => void };
    if (webApp.showAlert) {
      webApp.showAlert(message);
      return;
    }
  } catch {
    // ignore Telegram runtime mismatch in browser preview
  }

  window.alert(message);
}

function KlineChart({ data }: { data: KlinePoint[] }) {
  const width = 320;
  const height = 176;
  const chartTop = 14;
  const chartBottom = 142;
  const candleWidth = 12;
  const gap = 10;
  const minPrice = Math.min(...data.map((item) => item.low));
  const maxPrice = Math.max(...data.map((item) => item.high));
  const priceRange = Math.max(maxPrice - minPrice, 1);

  const scaleY = (price: number) => chartTop + ((maxPrice - price) / priceRange) * (chartBottom - chartTop);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[11rem] w-full overflow-visible">
      {[0, 1, 2, 3].map((index) => {
        const y = chartTop + ((chartBottom - chartTop) / 4) * index;
        return (
          <line
            key={index}
            x1="0"
            x2={width}
            y1={y}
            y2={y}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 5"
          />
        );
      })}

      {data.map((item, index) => {
        const x = 18 + index * (candleWidth + gap);
        const highY = scaleY(item.high);
        const lowY = scaleY(item.low);
        const openY = scaleY(item.open);
        const closeY = scaleY(item.close);
        const bullish = item.close >= item.open;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 4);
        const bodyColor = bullish ? "#FFD700" : "rgba(255,255,255,0.74)";

        return (
          <g key={item.label}>
            <line
              x1={x + candleWidth / 2}
              x2={x + candleWidth / 2}
              y1={highY}
              y2={lowY}
              stroke={bodyColor}
              strokeWidth="1.15"
            />
            <rect
              x={x}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              rx="2"
              fill={bodyColor}
              opacity={bullish ? 0.95 : 0.72}
            />
          </g>
        );
      })}

      {data.filter((_, index) => index % 2 === 0).map((item, index) => {
        const originalIndex = index * 2;
        const x = 18 + originalIndex * (candleWidth + gap) + candleWidth / 2;
        return (
          <text
            key={item.label}
            x={x}
            y="166"
            textAnchor="middle"
            fill="rgba(255,255,255,0.34)"
            fontSize="10"
          >
            {item.label}
          </text>
        );
      })}
    </svg>
  );
}

export default function Home() {
  const [walletMode, setWalletMode] = useState<WalletMode>("detecting");
  const [localVault, setLocalVault] = useState<LocalVaultRecord | null>(null);
  const [vaultReadyBadge, setVaultReadyBadge] = useState("等待连接");
  const [isBootstrappingVault, setIsBootstrappingVault] = useState(false);
  const [isStrategyEnabled, setIsStrategyEnabled] = useState(false);
  const [launchContext, setLaunchContext] = useState<LaunchContext | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const { data: bootstrapData, isLoading: isBootstrapLoading } = trpc.h1.bootstrap.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const h1ChatMutation = trpc.h1.chat.useMutation();

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        WebApp.ready();
        WebApp.expand();
        WebApp.setHeaderColor("#000000");
        WebApp.setBackgroundColor("#000000");
      } catch {
        // browser preview fallback
      }

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const decodedLaunch = decodeLaunchContext(params.get("launch"));

        if (!cancelled && decodedLaunch) {
          setLaunchContext(decodedLaunch);
        }
      }

      const hasInjectedWallet = detectOkxWallet();
      const existingVault = hasInjectedWallet ? null : await loadLocalVault();

      if (cancelled) return;

      setWalletMode(hasInjectedWallet ? "okx_wallet" : "local_vault");
      setLocalVault(existingVault);
      setVaultReadyBadge(hasInjectedWallet ? "已连接" : existingVault ? "本地金库已就绪" : "等待连接");
    }

    void boot().catch(() => {
      if (!cancelled) {
        setWalletMode("local_vault");
        setVaultReadyBadge("兼容模式");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const integrationAudit = bootstrapData?.integrationAudit;
  const demoTradingConnected = Boolean(integrationAudit?.demoTrading.connected);
  const walletApiConnected = Boolean(integrationAudit?.walletApi.connected);
  const onchainOsConnected = Boolean(integrationAudit?.onchainOs.connected);

  const executions = useMemo<ExecutionItem[]>(() => {
    if (!bootstrapData?.snapshot.executionFeed?.length) {
      return FALLBACK_EXECUTIONS;
    }

    return bootstrapData.snapshot.executionFeed.map((item) => ({
      id: item.id,
      engine: item.engine,
      label: item.label,
      route: item.route,
      status: item.status,
      timestamp: item.timestamp,
      pnl: item.pnl,
    }));
  }, [bootstrapData]);

  const orderIntents = useMemo(() => {
    if (!bootstrapData?.snapshot.orderIntents?.length) {
      return [
        {
          engine: "arbitrage" as const,
          route: "Arbitrum · Uniswap V3 → OKX DEX",
          expectedEdgeBps: 42,
          baseAsset: "BTC" as const,
          quoteAsset: "USDT" as const,
        },
        {
          engine: "momentum" as const,
          route: "Base · Spot + Perps Overlay",
          expectedEdgeBps: 118,
          baseAsset: "ETH" as const,
          quoteAsset: "USDT" as const,
        },
        {
          engine: "treasury" as const,
          route: "Solana → EVM / USDT Settlement",
          expectedEdgeBps: 87,
          baseAsset: "SOL" as const,
          quoteAsset: "USDT" as const,
        },
      ];
    }

    return bootstrapData.snapshot.orderIntents;
  }, [bootstrapData]);

  const settledExecutions = useMemo(() => executions.filter((item) => item.status === "settled"), [executions]);

  const settlement = useMemo(() => {
    const grossProfit = settledExecutions.reduce((sum, item) => sum + item.pnl, 0);
    const commissionAmount = grossProfit * 0.1;
    const netProfit = grossProfit - commissionAmount;

    return { grossProfit, commissionAmount, netProfit };
  }, [settledExecutions]);

  const totalUsdt = useMemo(() => BASE_USDT_BALANCE + settlement.netProfit, [settlement.netProfit]);
  const todayProfit = useMemo(
    () => settledExecutions.slice(0, 2).reduce((sum, item) => sum + item.pnl, 0),
    [settledExecutions],
  );
  const referralOverview = bootstrapData?.referralOverview;
  const cumulativeProfit = settlement.netProfit;
  const teamProfit = referralOverview?.projectedReward ?? Number((settlement.netProfit * 0.05).toFixed(2));

  const primaryIntent = orderIntents[0];
  const strategySignal = `+${(primaryIntent.expectedEdgeBps / 100).toFixed(2)}%`;
  const marketOverview = bootstrapData?.marketOverview;
  const klineSeries = marketOverview?.candles?.length ? marketOverview.candles : fallbackKlineData;
  const livePrice = marketOverview?.last ?? klineSeries[klineSeries.length - 1]?.close ?? 0;
  const openingPrice = marketOverview?.open24h ?? klineSeries[0]?.open ?? livePrice;
  const priceDelta = marketOverview?.priceChange ?? livePrice - openingPrice;
  const priceDeltaPct = marketOverview?.priceChangePct ?? (openingPrice ? (priceDelta / openingPrice) * 100 : 0);
  const primaryInstId = marketOverview?.instId ?? `${primaryIntent.baseAsset}-${primaryIntent.quoteAsset}`;
  const inviteCodeLabel = referralOverview?.inviteCode ?? "待生成";
  const inviterCodeLabel = referralOverview?.inviterInviteCode ?? "未绑定";
  const directReferralCount = referralOverview?.referralCount ?? 0;
  const realizedReferralReward = referralOverview?.totalReward ?? 0;
  const marketUpdatedLabel = marketOverview?.updatedAt
    ? new Date(marketOverview.updatedAt).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    : "--:--:--";
  const marketHighLowLabel = marketOverview
    ? `${marketOverview.low24h.toFixed(2)} / ${marketOverview.high24h.toFixed(2)}`
    : "仿真区间";
  const marketInstrumentLabel = marketOverview?.instrument?.baseCcy
    ? `${marketOverview.instrument.baseCcy}/${marketOverview.instrument.quoteCcy ?? "USDT"}`
    : primaryInstId;

  const walletReady = walletApiConnected || walletMode === "okx_wallet" || Boolean(localVault);
  const walletStatusTitle =
    walletMode === "detecting"
      ? "正在检测钱包状态"
      : walletMode === "okx_wallet"
        ? "已接入 OKX 钱包"
        : localVault
          ? "本地金库已就绪"
          : "未接入钱包";
  const walletStatusDetail =
    walletMode === "detecting"
      ? "正在检查 Telegram WebView 环境。"
      : walletMode === "okx_wallet"
        ? "已检测到原生钱包，后续可衔接官方授权连接、账户同步与签名确认。"
        : localVault
          ? `本地地址 ${maskAddress(localVault.address)} 已加密保存在当前设备中，可继续执行仿真链路。`
          : "尚未检测到钱包，可先连接钱包后再执行加仓与赎回。";
  const walletActionLabel = walletReady ? "已接入" : "连接钱包";
  const runtimeModeLabel =
    launchContext?.mode === "production-ready" || bootstrapData?.config.mode === "production-ready"
      ? "生产就绪"
      : "仿真执行";
  const settleLabel = `${launchContext?.settleChain ?? "EVM"} · ${launchContext?.settleAsset ?? "USDT"}`;
  const collectorShort = launchContext?.collectorAddress
    ? `${launchContext.collectorAddress.slice(0, 6)}...${launchContext.collectorAddress.slice(-4)}`
    : bootstrapData?.config.collectorAddress
      ? `${bootstrapData.config.collectorAddress.slice(0, 6)}...${bootstrapData.config.collectorAddress.slice(-4)}`
      : "0x463b...a7b4";

  const readinessTiles = [
    {
      label: "Demo Trading",
      value: demoTradingConnected ? "已认证" : "待认证",
      detail: demoTradingConnected ? "REST / HEADER OK" : "等待认证",
      emphasis: demoTradingConnected,
    },
    {
      label: "Wallet",
      value: walletReady ? "已接入" : "未接入",
      detail: walletReady ? vaultReadyBadge : "连接钱包后可执行",
      emphasis: walletReady,
    },
    {
      label: "OnchainOS",
      value: onchainOsConnected ? "已接入" : "待接入",
      detail: onchainOsConnected ? "Skills Ready" : "Project 鉴权待补",
      emphasis: onchainOsConnected,
    },
  ] as const;

  const strategyRows = orderIntents.map((intent) => ({
    key: intent.engine,
    title: intent.engine === "arbitrage" ? "AI 套利模型" : intent.engine === "momentum" ? "AI 动能模型" : "AI 归集模型",
    route: intent.route,
    signal: `+${(intent.expectedEdgeBps / 100).toFixed(2)}%`,
  }));

  const chatSuggestedPrompts = [
    "BTC 行情",
    "ETH 代币信息",
    "帮我绑定上级邀请码 H1ABCD12",
    "我的邀请码和团队收益",
  ];

  useEffect(() => {
    if (!bootstrapData || chatMessages.length > 0) return;

      const initialMessage = [
        "结论：当前首页已经聚焦为资产面板、AI 智能策略、数据分析与常见问答四个主区域。",
        `当前已同步 ${bootstrapData.summary.orderCount} 条策略意图、${bootstrapData.summary.executionCount} 条执行流与 ${bootstrapData.summary.settledCount} 条已结算记录。`,
        bootstrapData.marketOverview
          ? `当前真实行情锚点：${bootstrapData.marketOverview.instId} 最新价 ${bootstrapData.marketOverview.last.toFixed(2)}，24h 涨跌 ${bootstrapData.marketOverview.priceChangePct >= 0 ? "+" : ""}${bootstrapData.marketOverview.priceChangePct.toFixed(2)}%。`
          : "当前真实行情锚点暂不可用，页面会回退到仿真 K 线。",
        bootstrapData.referralOverview
          ? `你当前的邀请码是 ${bootstrapData.referralOverview.inviteCode}，已绑定上级：${bootstrapData.referralOverview.inviterInviteCode ?? "未绑定"}。`
          : "如果你要绑定上级邀请码，可以直接在这里发送：帮我绑定上级邀请码 + 你的邀请码。",
        "你也可以继续问我 BTC/ETH/SOL 行情、代币信息、邀请码状态、团队收益或策略状态。",
      ].join("\n\n");


    setChatMessages([{ role: "assistant", content: initialMessage }]);
  }, [bootstrapData, chatMessages.length]);

  async function handleChatSend(content: string) {
    const userMessage: ChatMessage = { role: "user", content };
    const nextMessages = [...chatMessages, userMessage];

    setChatMessages(nextMessages);

    try {
      const response = await h1ChatMutation.mutateAsync({
        messages: nextMessages.slice(-8),
      });

      setChatMessages([...nextMessages, { role: "assistant", content: response.content }]);
    } catch {
      setChatMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "结论：当前 AI 助手暂时没有返回新的结果。\n\n你仍然可以继续询问资产表现、策略状态，或直接发送“帮我绑定上级邀请码 + 邀请码”，我会基于当前快照继续为你解释。",
        },
      ]);
    }
  }

  async function ensureWalletReady() {
    if (walletMode === "detecting" || isBootstrappingVault) {
      return;
    }

    if (walletMode === "okx_wallet") {
      setVaultReadyBadge("已连接");
      showNotice("已检测到 OKX 钱包。后续可在此处接入授权连接与账户同步。");
      return;
    }

    if (localVault) {
      setVaultReadyBadge("本地金库已就绪");
      showNotice(`当前可继续使用本地金库地址 ${maskAddress(localVault.address)}。`);
      return;
    }

    setIsBootstrappingVault(true);
    const start = performance.now();

    try {
      const vault = await deriveOrLoadLocalVault();
      const elapsedSeconds = Math.max(1, Math.min(3, Math.ceil((performance.now() - start) / 1000)));
      setLocalVault(vault);
      setVaultReadyBadge(`${elapsedSeconds} 秒就绪`);
      showNotice(`本地地址已派生完成，当前地址 ${maskAddress(vault.address)}。`);
    } finally {
      setIsBootstrappingVault(false);
    }
  }

  async function handleStrategyToggle() {
    if (!walletReady) {
      await ensureWalletReady();
    }

    setIsStrategyEnabled((current) => !current);
    showNotice(isStrategyEnabled ? "AI智能策略已切换为待命。" : "AI智能策略已进入仿真执行状态。");
  }

  function handleRecharge() {
    showNotice("充值功能将接入钱包转入与归集链路。");
  }

  function handleWithdraw() {
    showNotice("提现功能将结合风控校验与清结算策略开放。");
  }

  function handleAddPosition() {
    showNotice("加仓功能会结合当前策略仓位、风险阈值与钱包可用余额执行。");
  }

  function handleRedeem() {
    showNotice("赎回功能将按照策略锁仓与结算规则执行。");
  }

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <div className="container max-w-[33rem] py-3.25">
        <div className="grid gap-2">
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="terminal-panel overflow-hidden"
          >
            <div className="relative p-[0.78rem]">
              <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-2">
                <div>
                  <p className="terminal-kicker">资产面板</p>
                  <h1 className="mt-0.5 text-[1.14rem] tracking-[0.08em] text-white">USDT 资产总览</h1>
                </div>
                <div className="terminal-chip rounded-[0.9rem] px-2.75 py-1.75 text-right">
                  <span className="text-[0.54rem] tracking-[0.22em] text-white/40">模式</span>
                  <span className="mt-1 block font-mono text-[0.82rem] text-primary">{runtimeModeLabel}</span>
                  <span className="mt-0.75 block text-[0.6rem] text-white/36">{settleLabel}</span>
                </div>
              </div>

              <div className="mt-0.75 rounded-[0.82rem] border border-white/[0.025] bg-[linear-gradient(90deg,rgba(255,255,255,0.002),rgba(255,255,255,0.006),rgba(255,255,255,0.002))] px-1.75 py-0.75">
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={`asset-strip-${index}`}
                      className={cn(
                        "h-2 rounded-[0.28rem] border border-white/[0.018] bg-white/[0.007]",
                        index === 0 || index === 9 ? "opacity-15" : index % 3 === 0 ? "opacity-20" : "opacity-15",
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-1 grid grid-cols-[1fr_auto] items-center gap-1.5 border-b border-white/6 pb-1.5">
                <div>
                  <strong className="terminal-value text-[1.72rem] leading-none text-primary">{formatCurrency(totalUsdt)}</strong>
                  <span className="mt-0.5 block font-mono text-[0.7rem] text-white/48">USDT</span>
                </div>
                <div className="self-center text-right">
                  <p className="text-[0.62rem] text-white/30">{walletStatusTitle}</p>
                  <p className="mt-0.5 text-[0.66rem] leading-[1.02] text-white/46">
                    {localVault ? maskAddress(localVault.address) : vaultReadyBadge}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {readinessTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className={cn(
                      "terminal-metric flex min-h-[4.12rem] flex-col justify-between rounded-[0.9rem] px-2.25 py-1.75",
                      tile.emphasis ? "border-primary/18 bg-primary/8" : "bg-white/[0.02]",
                    )}
                  >
                    <span className="terminal-metric-label">{tile.label}</span>
                    <strong className={cn("mt-1 font-mono text-[0.92rem] leading-none", tile.emphasis ? "text-primary" : "text-white")}>{tile.value}</strong>
                    <p className="mt-1 text-[0.58rem] tracking-[0.12em] text-white/32">{tile.detail}</p>
                  </div>
                ))}
              </div>

              <div className="terminal-row mt-1.25 rounded-[0.98rem] px-3 py-1.5">
                <div>
                  <p className="font-normal tracking-[0.08em] text-white">连接状态</p>
                  <p className="mt-0.5 text-[0.72rem] leading-[1.38] text-white/44">{walletStatusDetail}</p>
                </div>
                <div className="shrink-0 self-start pt-0.5 text-right font-mono text-[0.76rem] text-primary">{walletActionLabel}</div>
              </div>

              <div className="mt-0.75 grid grid-cols-2 gap-1">
                <Button
                  variant="outline"
                  onClick={handleRecharge}
                  className="h-[1.72rem] rounded-[0.76rem] border border-white/10 bg-white/[0.03] text-[0.66rem] tracking-[0.12em] text-white/78 hover:border-primary/24 hover:text-primary"
                >
                  充值
                </Button>
                <Button
                  variant="outline"
                  onClick={handleWithdraw}
                  className="h-[1.72rem] rounded-[0.76rem] border border-white/10 bg-white/[0.03] text-[0.66rem] tracking-[0.12em] text-white/78 hover:border-primary/24 hover:text-primary"
                >
                  提现
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAddPosition}
                  className="h-[1.72rem] rounded-[0.76rem] border border-white/10 bg-white/[0.03] text-[0.66rem] tracking-[0.12em] text-white/78 hover:border-primary/24 hover:text-primary"
                >
                  加仓
                </Button>
                <Button
                  variant="outline"
                  onClick={() => void ensureWalletReady()}
                  disabled={walletMode === "detecting" || isBootstrappingVault}
                  className="h-[1.72rem] rounded-[0.76rem] border border-primary/24 bg-primary/10 text-[0.66rem] tracking-[0.12em] text-primary disabled:opacity-60"
                >
                  {walletMode === "okx_wallet" ? "已接入" : localVault ? "已接入" : isBootstrappingVault ? "连接中" : "连接钱包"}
                </Button>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="terminal-panel overflow-hidden"
          >
            <div className="relative p-[0.78rem]">
              <div className="section-header">
                <div>
                  <p className="terminal-kicker">AI智能策略</p>
                  <h2 className="section-title">AI智能策略</h2>
                </div>
                <div className="terminal-chip rounded-[0.9rem] px-2.5 py-1.5 text-right">
                  <span className="text-[0.54rem] tracking-[0.22em] text-white/40">PRICE</span>
                  <span className="mt-1 block font-mono text-[0.82rem] text-primary">{livePrice.toFixed(2)}</span>
                  <span className="mt-0.5 block text-[0.58rem] text-white/36">{primaryInstId} · {priceDeltaPct >= 0 ? "+" : ""}{priceDeltaPct.toFixed(2)}%</span>
                </div>
              </div>

              <div className="mt-0.75 rounded-[0.82rem] border border-white/[0.025] bg-[linear-gradient(90deg,rgba(255,255,255,0.002),rgba(255,255,255,0.006),rgba(255,255,255,0.002))] px-1.75 py-0.75">
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <span
                      key={`strategy-strip-${index}`}
                      className={cn(
                        "h-2 rounded-[0.28rem] border border-white/[0.018] bg-white/[0.007]",
                        index === 1 || index === 8 ? "opacity-15" : index % 2 === 0 ? "opacity-20" : "opacity-15",
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="terminal-row mt-0.75 rounded-[0.96rem] px-3 py-1.25">
                <div>
                  <p className="font-normal tracking-[0.08em] text-white">当前策略</p>
                  <p className="mt-0.5 text-[0.8rem] text-primary">{strategyRows[0]?.title ?? "AI 套利模型"}</p>
                  <p className="mt-0.5 text-[0.66rem] leading-[1.3] text-white/38">{primaryIntent.route}</p>
                  <p className="mt-0.5 text-[0.58rem] tracking-[0.14em] text-white/26">{marketInstrumentLabel} · 更新 {marketUpdatedLabel}</p>
                </div>
                <div className="shrink-0 self-center text-right">
                  <p className="font-mono text-[0.78rem] text-primary">{strategySignal}</p>
                  <p className="mt-0.5 text-[0.53rem] tracking-[0.14em] text-white/28">预计边际</p>
                </div>
              </div>

              <div className="terminal-card mt-0.75 rounded-[0.92rem] border border-white/5 bg-white/[0.016] px-2.5 py-1.75">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.62rem] tracking-[0.16em] text-white/34">STRATEGY PRICE</p>
                    <p className="mt-0.5 font-mono text-[1rem] text-white">{livePrice.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.62rem] tracking-[0.16em] text-white/34">走势</p>
                    <p className="mt-0.5 font-mono text-[0.82rem] text-primary">{priceDelta >= 0 ? "+" : ""}{priceDelta.toFixed(2)}</p>
                    <p className="mt-0.5 text-[0.52rem] tracking-[0.14em] text-white/24">24H {marketHighLowLabel}</p>
                  </div>
                </div>
                <div className="mt-1.25 rounded-[0.84rem] border border-white/5 bg-black/34 px-2 py-1.75">
                  <KlineChart data={klineSeries} />
                </div>
              </div>

              <div className="mt-1.25 grid grid-cols-3 gap-1">
                <Button
                  variant="outline"
                  onClick={() => void handleStrategyToggle()}
                  className="h-[1.78rem] rounded-[0.76rem] border border-primary/24 bg-primary/10 text-[0.66rem] tracking-[0.12em] text-primary"
                >
                  {isStrategyEnabled ? "运行中" : "立即开启"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleAddPosition}
                  className="h-[1.78rem] rounded-[0.76rem] border border-white/10 bg-white/[0.03] text-[0.66rem] tracking-[0.12em] text-white/78 hover:border-primary/24 hover:text-primary"
                >
                  加仓
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRedeem}
                  className="h-[1.78rem] rounded-[0.76rem] border border-white/10 bg-white/[0.03] text-[0.66rem] tracking-[0.12em] text-white/78 hover:border-primary/24 hover:text-primary"
                >
                  赎回
                </Button>
              </div>

              <div className="terminal-row mt-1.25 rounded-[0.96rem] px-3 py-2">
                <div>
                  <p className="font-normal tracking-[0.08em] text-white">用户榜单</p>
                  <p className="mt-1 text-[0.76rem] leading-5 text-white/44">榜单功能暂时关闭，但前端区位已预留，后续可直接接入排行与收益统计。</p>
                </div>
                <div className="shrink-0 text-right font-mono text-[0.74rem] text-white/36">即将开放</div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="terminal-panel overflow-hidden"
          >
            <div className="relative p-3">
              <div className="section-header">
                <div>
                  <p className="terminal-kicker">数据分析</p>
                  <h2 className="section-title">数据分析</h2>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[0.88rem] text-primary">5%</p>
                  <p className="text-[0.66rem] tracking-[0.12em] text-white/34">邀请分润</p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <div className="terminal-metric min-h-[5.2rem] rounded-[0.96rem] px-3 py-2.5">
                  <span className="terminal-metric-label">今日盈亏</span>
                  <strong className="terminal-value mt-2 text-[1rem] text-primary">+{formatCurrency(todayProfit)}</strong>
                </div>
                <div className="terminal-metric min-h-[5.2rem] rounded-[0.96rem] px-3 py-2.5">
                  <span className="terminal-metric-label">累计盈亏</span>
                  <strong className="terminal-value mt-2 text-[1rem] text-white">+{formatCurrency(cumulativeProfit)}</strong>
                </div>
                <div className="terminal-metric min-h-[5.2rem] rounded-[0.96rem] px-3 py-2.5">
                  <span className="terminal-metric-label">团队收益</span>
                  <strong className="terminal-value mt-2 text-[1rem] text-primary">+{formatCurrency(teamProfit)}</strong>
                  <span className="mt-1 block text-[0.56rem] tracking-[0.12em] text-white/28">已邀请 {directReferralCount} 人</span>
                </div>
              </div>

              <div className="terminal-row mt-2 rounded-[0.98rem] px-3 py-2.5">
                <div>
                  <p className="font-normal tracking-[0.08em] text-white">邀请与绑定机制</p>
                  <p className="mt-1 text-[0.76rem] leading-5 text-white/46">
                    用户通过邀请码邀请后，绑定邀请码即可自动成为下级；邀请好友后，可抽取其盈利的 5%。如需绑定上级邀请码，请直接在下方对话框发送“帮我绑定上级邀请码 + 邀请码”。
                  </p>
                  <p className="mt-1 text-[0.62rem] tracking-[0.12em] text-white/30">我的邀请码 {inviteCodeLabel} · 上级 {inviterCodeLabel}</p>
                </div>
                <div className="shrink-0 text-right font-mono text-[0.74rem] text-primary">+{formatCurrency(realizedReferralReward)}</div>
              </div>

              <div className="terminal-row mt-2 rounded-[0.98rem] px-3 py-2.5">
                <div>
                  <p className="font-normal tracking-[0.08em] text-white">AI 助手入口</p>
                  <p className="mt-1 text-[0.76rem] leading-5 text-white/46">在前端对话框中可以继续查询 BTC / ETH / SOL 行情、代币信息、策略状态、邀请收益，并发起绑定上级邀请码的语义指令。</p>
                </div>
                <div className="shrink-0 text-right font-mono text-[0.72rem] text-white/36">BOT · {launchContext?.botUsername ?? "H_AGENTS"}</div>
              </div>

              <div className="mt-2 overflow-hidden rounded-[1rem] border border-white/8 bg-black/24">
                <AIChatBox
                  messages={chatMessages}
                  onSendMessage={handleChatSend}
                  isLoading={h1ChatMutation.isPending}
                  placeholder="例如：BTC 行情 / ETH 代币信息 / 帮我绑定上级邀请码 H1ABCD12"
                  suggestedPrompts={chatSuggestedPrompts}
                  emptyStateMessage="发送资产、策略或邀请码问题"
                  className="border-0 bg-transparent shadow-none"
                  height={320}
                />
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="terminal-panel overflow-hidden"
          >
            <div className="relative p-3">
              <div className="section-header">
                <div>
                  <p className="terminal-kicker">常见问答</p>
                  <h2 className="section-title">常见问答</h2>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[0.84rem] text-primary">FAQ</p>
                  <p className="text-[0.66rem] tracking-[0.12em] text-white/34">点击展开</p>
                </div>
              </div>

              <div className="mt-2 rounded-[1rem] border border-white/8 bg-white/[0.018] px-3">
                <Accordion type="single" collapsible>
                  {faqItems.map((item) => (
                    <AccordionItem key={item.id} value={item.id} className="border-white/8">
                      <AccordionTrigger className="py-4 text-[0.82rem] tracking-[0.04em] text-white hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 text-[0.76rem] leading-6 text-white/50">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-white/6 pt-1.5 text-[0.58rem] tracking-[0.12em] text-white/24">
                <span>{isBootstrapLoading ? "同步服务端状态中" : `bootstrap 已同步 · ${primaryInstId}`}</span>
                <span>{demoTradingConnected ? "DEMO AUTH VERIFIED" : "DEMO AUTH PENDING"}</span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
