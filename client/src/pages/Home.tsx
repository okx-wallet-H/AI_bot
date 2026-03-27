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
import { cn } from "@/lib/utils";
import {
  deriveOrLoadLocalVault,
  detectOkxWallet,
  loadLocalVault,
  maskAddress,
  type LocalVaultRecord,
} from "@/lib/localVault";
import { buildSharePoster } from "@/lib/sharePoster";

type EngineKey = "arbitrage" | "momentum" | "treasury";
type WalletMode = "detecting" | "okx_wallet" | "local_vault";
type ActiveTab = "logs" | "calendar" | "trade" | "share";

type ExecutionItem = {
  id: string;
  engine: EngineKey;
  label: string;
  route: string;
  status: "queued" | "running" | "settled";
  timestamp: string;
  pnl: number;
};

type ProfitDay = {
  day: number;
  net: number;
  intensity: 1 | 2 | 3 | 4;
};

const heroAsset =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663458603911/jVUUJFwbpYACbDdU3jYF5M/h1pro-hero-terminal-aEmzawCsmmqmeV35EX7d9K.webp";
const executionAsset =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663458603911/jVUUJFwbpYACbDdU3jYF5M/h1pro-execution-stream-PBGqKoKQiXcVBmg7v3SBok.webp";
const calendarAsset =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663458603911/jVUUJFwbpYACbDdU3jYF5M/h1pro-profit-calendar-FJscPUkd4nkqKj3expAgs2.webp";
const posterAsset =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663458603911/jVUUJFwbpYACbDdU3jYF5M/h1pro-share-poster-4stsqTr9TuXXmXeey6bKqa.webp";

const ENGINE_LABELS: Record<EngineKey, string> = {
  arbitrage: "恒定套利",
  momentum: "动能捕获",
  treasury: "全域归集",
};

const engineMetrics = [
  {
    key: "arbitrage",
    title: "恒定套利",
    detail: "DEX 现货网格 · Uniswap V3 / OKX DEX",
    spread: "+0.42%",
  },
  {
    key: "momentum",
    title: "动能捕获",
    detail: "Spot + Perps 混合波动执行",
    spread: "+1.18%",
  },
  {
    key: "treasury",
    title: "全域归集",
    detail: "跨链净值归并 · Arbitrum / Base / Solana",
    spread: "+0.87%",
  },
] as const;

const initialExecutions: ExecutionItem[] = [
  {
    id: "AX-2041",
    engine: "arbitrage",
    label: "USDT / ETH 价差捕捉",
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

const profitCalendar: ProfitDay[] = [
  { day: 1, net: 62.3, intensity: 2 },
  { day: 2, net: 0, intensity: 1 },
  { day: 3, net: 124.6, intensity: 4 },
  { day: 4, net: 85.4, intensity: 3 },
  { day: 5, net: 19.6, intensity: 2 },
  { day: 6, net: 0, intensity: 1 },
  { day: 7, net: 151.1, intensity: 4 },
  { day: 8, net: 47.8, intensity: 2 },
  { day: 9, net: 0, intensity: 1 },
  { day: 10, net: 93.5, intensity: 3 },
  { day: 11, net: 121.3, intensity: 4 },
  { day: 12, net: 17.2, intensity: 2 },
  { day: 13, net: 0, intensity: 1 },
  { day: 14, net: 72.4, intensity: 3 },
  { day: 15, net: 44.1, intensity: 2 },
  { day: 16, net: 138.7, intensity: 4 },
  { day: 17, net: 0, intensity: 1 },
  { day: 18, net: 31.8, intensity: 2 },
  { day: 19, net: 58.2, intensity: 2 },
  { day: 20, net: 94.2, intensity: 3 },
  { day: 21, net: 0, intensity: 1 },
  { day: 22, net: 188.4, intensity: 4 },
  { day: 23, net: 42.8, intensity: 2 },
  { day: 24, net: 67.5, intensity: 3 },
  { day: 25, net: 0, intensity: 1 },
  { day: 26, net: 81.3, intensity: 3 },
  { day: 27, net: 115.6, intensity: 4 },
  { day: 28, net: 22.9, intensity: 2 },
  { day: 29, net: 53.6, intensity: 2 },
  { day: 30, net: 96.1, intensity: 3 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function statusLabel(status: ExecutionItem["status"]) {
  if (status === "queued") return "排队中";
  if (status === "running") return "执行中";
  return "已结算";
}

function statusClass(status: ExecutionItem["status"]) {
  if (status === "queued") return "text-white/52 border-white/10 bg-white/6";
  if (status === "running") return "text-primary border-primary/30 bg-primary/8";
  return "text-white border-white/12 bg-white/8";
}

export default function Home() {
  const [walletMode, setWalletMode] = useState<WalletMode>("detecting");
  const [localVault, setLocalVault] = useState<LocalVaultRecord | null>(null);
  const [vaultReadyBadge, setVaultReadyBadge] = useState("Await Trigger");
  const [isBootstrappingVault, setIsBootstrappingVault] = useState(false);
  const [posterDataUrl, setPosterDataUrl] = useState("");
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [posterRefreshSeed, setPosterRefreshSeed] = useState(0);
  const [selectedProfitDay, setSelectedProfitDay] = useState<ProfitDay>(profitCalendar[21]);
  const [isTradingEnabled, setIsTradingEnabled] = useState(false);
  const [executions, setExecutions] = useState(initialExecutions);
  const [activeTab, setActiveTab] = useState<ActiveTab>("trade");

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      WebApp.ready();
      WebApp.expand();
      WebApp.setHeaderColor("#000000");
      WebApp.setBackgroundColor("#000000");

      const hasInjectedWallet = detectOkxWallet();
      const existingVault = hasInjectedWallet ? null : await loadLocalVault();

      if (cancelled) return;

      setWalletMode(hasInjectedWallet ? "okx_wallet" : "local_vault");
      setLocalVault(existingVault);
      setVaultReadyBadge(hasInjectedWallet ? "TEE Link" : existingVault ? "Vault Ready" : "Await Trigger");
    }

    boot().catch(() => {
      if (!cancelled) {
        setWalletMode("local_vault");
        setVaultReadyBadge("Fallback");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isTradingEnabled) return;

    const timer = window.setInterval(() => {
      setExecutions((current) => {
        const next = [...current];
        const firstRunningIndex = next.findIndex((item) => item.status === "running");

        if (firstRunningIndex >= 0) {
          next[firstRunningIndex] = {
            ...next[firstRunningIndex],
            status: "settled",
            pnl: Number((next[firstRunningIndex].pnl + 18.36).toFixed(2)),
            timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
          };
        }

        next.unshift({
          id: `HX-${Math.floor(Math.random() * 9000 + 1000)}`,
          engine: ["arbitrage", "momentum", "treasury"][Math.floor(Math.random() * 3)] as EngineKey,
          label: ["ETH / USDT 波段探测", "SOL 流动性偏移归集", "USDC → USDT 统一结算"][Math.floor(Math.random() * 3)],
          route: ["Arbitrum · DEX Mesh", "Base · Spot + Perps", "Solana → EVM Route"][Math.floor(Math.random() * 3)],
          status: "running",
          timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
          pnl: Number((Math.random() * 90 + 20).toFixed(2)),
        });

        return next.slice(0, 6);
      });
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isTradingEnabled]);

  const settlement = useMemo(() => {
    const grossProfit = executions
      .filter((item) => item.status === "settled")
      .reduce((sum, item) => sum + item.pnl, 0);
    const commissionAmount = grossProfit * 0.1;
    const netProfit = grossProfit - commissionAmount;

    return { grossProfit, commissionAmount, netProfit };
  }, [executions]);

  const walletTitle =
    walletMode === "detecting"
      ? "侦测执行环境"
      : walletMode === "okx_wallet"
        ? "已检测到 OKX 钱包"
        : localVault
          ? "本地派生地址已就绪"
          : "未检测到钱包";

  const walletDescription =
    walletMode === "detecting"
      ? "正在检查 WebView 注入环境与安全执行上下文。"
      : walletMode === "okx_wallet"
        ? "后续将通过异步授权建立安全会话，签名仍保留在钱包侧。"
        : localVault
          ? `地址 ${maskAddress(localVault.address)} 已写入加密空间，私钥不会离开当前设备。`
          : "点击“开启智能交易”后，将在本地 3 秒内派生随机地址并加密保存私钥。";

  const tabs = [
    { key: "logs", label: "实时执行记录" },
    { key: "calendar", label: "盈亏收益日历" },
    { key: "trade", label: "开启智能交易" },
    { key: "share", label: "分享给你的好友" },
  ] as const;

  useEffect(() => {
    if (activeTab !== "share") return;

    let cancelled = false;

    async function generatePoster() {
      setIsGeneratingPoster(true);
      try {
        const dataUrl = await buildSharePoster({
          netProfit: settlement.netProfit,
          grossProfit: settlement.grossProfit,
          commissionAmount: settlement.commissionAmount,
          collectorAddress: "0x463b41d75e1018ba7a0a62f421219558ee13a7b4",
          executionMode: isTradingEnabled ? "SIMULATION LIVE" : "SIMULATION READY",
          walletMode: walletMode === "okx_wallet" ? "OKX CONNECT" : localVault ? maskAddress(localVault.address) : "LOCAL VAULT",
        });

        if (!cancelled) {
          setPosterDataUrl(dataUrl);
        }
      } finally {
        if (!cancelled) {
          setIsGeneratingPoster(false);
        }
      }
    }

    void generatePoster();

    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    isTradingEnabled,
    localVault,
    posterRefreshSeed,
    settlement.commissionAmount,
    settlement.grossProfit,
    settlement.netProfit,
    walletMode,
  ]);

  async function handleTradeActivation() {
    setActiveTab("trade");

    if (walletMode === "detecting" || isBootstrappingVault) {
      return;
    }

    if (isTradingEnabled) {
      setIsTradingEnabled(false);
      return;
    }

    if (walletMode === "local_vault" && !localVault) {
      setIsBootstrappingVault(true);
      const start = performance.now();

      try {
        const vault = await deriveOrLoadLocalVault();
        const elapsedSeconds = Math.max(1, Math.min(3, Math.ceil((performance.now() - start) / 1000)));
        setLocalVault(vault);
        setVaultReadyBadge(`${elapsedSeconds}s Ready`);
      } finally {
        setIsBootstrappingVault(false);
      }
    }

    setIsTradingEnabled(true);
  }

  function handleDownloadPoster() {
    if (!posterDataUrl || typeof document === "undefined") return;

    const link = document.createElement("a");
    link.href = posterDataUrl;
    link.download = "h1pro-share-poster.png";
    link.click();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.08),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.02)_0%,_rgba(255,255,255,0)_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-screen terminal-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,_rgba(255,215,0,0.08),_rgba(255,215,0,0))]" />

      <main className="relative z-10 mx-auto flex w-full max-w-[31rem] flex-col px-4 pb-32 pt-4 sm:px-5">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="terminal-panel overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.13]"
            style={{ backgroundImage: `url(${heroAsset})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(0,0,0,0.18)_0%,_rgba(0,0,0,0.76)_36%,_rgba(0,0,0,0.94)_100%)]" />

          <div className="relative p-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3.5">
              <div>
                <p className="terminal-kicker">Telegram Mini App · H 1.0 Pro</p>
                <h1 className="mt-2 font-display text-[2.8rem] uppercase leading-[0.84] tracking-[0.08em] text-white">
                  H 1.0
                  <span className="block text-primary">PRO</span>
                </h1>
              </div>
              <div className="terminal-chip w-[8.4rem] shrink-0 rounded-[1.35rem] px-3.5 py-3">
                <span className="text-[0.56rem] tracking-[0.24em] text-white/42">SETTLE</span>
                <div className="mt-2.5 flex items-center gap-3 font-mono text-[0.92rem] text-primary">
                  <span>EVM</span>
                  <span className="text-white/20">·</span>
                  <span>USDT</span>
                </div>
                <span className="mt-2.5 block text-[0.66rem] text-white/42">10% x402 Split</span>
              </div>
            </div>

            <div className="mt-3.5 space-y-3">
              <div className="relative overflow-hidden rounded-[1.4rem] border border-white/8 bg-black/42 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="pointer-events-none absolute inset-x-4 top-12 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <p className="max-w-[18rem] text-[0.92rem] leading-8 text-white/76">
                  黑金智能交易终端。<br />
                  信号在服务端，执行与签名在客户端。
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="terminal-metric min-h-[7.8rem] px-3.5 py-3.5">
                    <span className="terminal-metric-label">净利润</span>
                    <strong className="terminal-value mt-3 text-[1.42rem] leading-[1.3] text-primary">
                      {formatCurrency(settlement.netProfit)}
                      <span className="mt-1 block text-[0.88rem]">USDT</span>
                    </strong>
                    <p className="terminal-footnote">已扣除 10% 分账</p>
                  </div>

                  <div className="terminal-metric min-h-[7.8rem] px-3.5 py-3.5">
                    <span className="terminal-metric-label">执行链路</span>
                    <strong className="terminal-value mt-3 text-[1.06rem] leading-[1.8] text-white">
                      ARB <span className="text-white/24">·</span> BASE <span className="text-white/24">·</span> SOL
                    </strong>
                    <p className="terminal-footnote">统一归集到 EVM</p>
                  </div>
                </div>
              </div>

              <div className="terminal-card rounded-[1.4rem] bg-white/[0.022] px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="terminal-kicker">Wallet Mode</span>
                    <h2 className="mt-3 text-[1.28rem] leading-[1.35] text-white">{walletTitle}</h2>
                  </div>
                  <div className="terminal-chip rounded-[0.95rem] px-3 py-2 text-right">
                    <span className="text-[0.54rem] tracking-[0.22em] text-white/42">VAULT</span>
                    <span className="mt-1 block font-mono text-[0.8rem] text-primary">
                      {walletMode === "okx_wallet" ? "OKX" : localVault ? "LOCAL" : "SCAN"}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-[0.9rem] leading-7 text-white/58">{walletDescription}</p>

                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                  <div className="rounded-[0.95rem] border border-white/8 bg-black/38 px-3 py-2.5 font-mono text-[0.77rem] text-white/46">
                    <span>Collector</span>
                    <span className="ml-2 text-white/58">0x463b...a7b4</span>
                  </div>
                  <div className="rounded-[0.95rem] border border-primary/14 bg-primary/8 px-3 py-2.5 font-mono text-[0.77rem] text-primary">
                    {vaultReadyBadge}
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5">
                {engineMetrics.map((metric) => (
                  <div key={metric.key} className="terminal-row rounded-[1.1rem] px-3.5 py-2.5">
                    <div>
                      <p className="font-medium tracking-[0.08em] text-white">{metric.title}</p>
                      <p className="mt-0.5 text-[0.78rem] leading-5 text-white/46">{metric.detail}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[1rem] text-primary">{metric.spread}</p>
                      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.24em] text-white/34">Signal</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6 }}
          className="terminal-panel mt-4 overflow-hidden"
        >
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center",
              activeTab === "logs" && "opacity-[0.12]",
              activeTab === "calendar" && "opacity-[0.14]",
              activeTab === "trade" && "opacity-[0.1]",
              activeTab === "share" && "opacity-[0.14]",
            )}
            style={{
              backgroundImage:
                activeTab === "logs"
                  ? `url(${executionAsset})`
                  : activeTab === "calendar"
                    ? `url(${calendarAsset})`
                    : activeTab === "share"
                      ? `url(${posterAsset})`
                      : `url(${heroAsset})`,
            }}
          />

          <div className="relative p-4">
            {activeTab === "logs" && (
              <div>
                <div className="section-header">
                  <div>
                    <p className="terminal-kicker">Execution Feed</p>
                    <h3 className="section-title">实时执行记录</h3>
                  </div>
                  <div className="terminal-chip rounded-[1rem] px-3 py-2 text-right">
                    <span className="text-[0.56rem] tracking-[0.22em] text-white/42">LIVE</span>
                    <span className="mt-1 block font-mono text-[0.86rem] text-primary">{executions.length} Streams</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2.5">
                  {executions.map((item) => (
                    <div key={item.id} className="terminal-log-row rounded-[1.1rem] px-3.5 py-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-[0.4rem] h-2.5 w-2.5 shrink-0 rounded-full bg-primary shadow-[0_0_14px_rgba(255,215,0,0.55)]" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[0.76rem] uppercase tracking-[0.18em] text-white/48">{item.id}</span>
                            <span className="text-[0.72rem] text-primary">{ENGINE_LABELS[item.engine]}</span>
                          </div>
                          <p className="mt-1 text-sm text-white">{item.label}</p>
                          <p className="mt-1 truncate text-[0.75rem] leading-5 text-white/42">{item.route}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em]", statusClass(item.status))}>
                          {statusLabel(item.status)}
                        </span>
                        <p className="mt-2 font-mono text-[0.76rem] text-white/42">{item.timestamp}</p>
                        <p className="mt-1 font-mono text-[0.88rem] text-primary">+{formatCurrency(item.pnl)} USDT</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "calendar" && (
              <div>
                <div className="section-header">
                  <div>
                    <p className="terminal-kicker">Profit Calendar</p>
                    <h3 className="section-title">盈亏收益日历</h3>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[0.86rem] text-primary">+{formatCurrency(settlement.netProfit)} USDT</p>
                    <p className="text-[0.64rem] uppercase tracking-[0.18em] text-white/36">Net of Commission</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {profitCalendar.map((cell) => (
                    <button
                      key={cell.day}
                      type="button"
                      onClick={() => setSelectedProfitDay(cell)}
                      className={cn(
                        "calendar-cell text-left transition-all duration-300",
                        cell.intensity === 1 && "calendar-cell-1",
                        cell.intensity === 2 && "calendar-cell-2",
                        cell.intensity === 3 && "calendar-cell-3",
                        cell.intensity === 4 && "calendar-cell-4",
                        selectedProfitDay.day === cell.day && "border-primary/40 shadow-[0_0_18px_rgba(255,215,0,0.08)]",
                      )}
                    >
                      <span className="text-[0.6rem] text-white/46">{cell.day}</span>
                      <span className="mt-2 block font-mono text-[0.7rem] text-white/78">
                        {cell.net > 0 ? cell.net.toFixed(0) : "—"}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="terminal-row mt-3 rounded-[1.1rem] px-3.5 py-3">
                  <div>
                    <p className="font-medium tracking-[0.08em] text-white">日期明细 · {selectedProfitDay.day} 日</p>
                    <p className="mt-1 text-[0.8rem] leading-6 text-white/46">
                      展示扣除 10% 分账后的净利润结果，可作为海报与审计对账的日度参考。
                    </p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[0.92rem] text-primary">
                    {selectedProfitDay.net > 0 ? `+${formatCurrency(selectedProfitDay.net)}` : "0.00"} USDT
                  </div>
                </div>
              </div>
            )}

            {activeTab === "trade" && (
              <div>
                <div className="section-header">
                  <div>
                    <p className="terminal-kicker">Smart Trading</p>
                    <h3 className="section-title">开启智能交易</h3>
                  </div>
                  <div className="terminal-chip rounded-[1rem] px-3 py-2 text-right">
                    <span className="text-[0.56rem] tracking-[0.22em] text-white/42">MODE</span>
                    <span className="mt-1 block font-mono text-[0.86rem] text-primary">SIMULATION</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="terminal-row rounded-[1.15rem] px-4 py-3.5">
                    <div>
                      <p className="font-medium tracking-[0.08em] text-white">双轨开户</p>
                      <p className="mt-1 text-[0.84rem] leading-6 text-white/48">
                        {walletMode === "okx_wallet"
                          ? "检测到 OKX 钱包，将走授权连接与安全执行会话。"
                          : localVault
                            ? `本地地址 ${maskAddress(localVault.address)} 已就绪，交易将在设备侧签名。`
                            : "未检测到钱包；点击启动后将在本地 3 秒内派生随机私钥。"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[0.92rem] text-primary">
                      {walletMode === "okx_wallet" ? "OKX" : localVault ? "LOCAL" : "SCAN"}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="terminal-metric min-h-[6.3rem] px-3 py-3">
                      <span className="terminal-metric-label">Gross</span>
                      <strong className="terminal-value mt-2 text-[1rem] text-white">{formatCurrency(settlement.grossProfit)}</strong>
                    </div>
                    <div className="terminal-metric min-h-[6.3rem] px-3 py-3">
                      <span className="terminal-metric-label">x402</span>
                      <strong className="terminal-value mt-2 text-[1rem] text-primary">{formatCurrency(settlement.commissionAmount)}</strong>
                    </div>
                    <div className="terminal-metric min-h-[6.3rem] px-3 py-3">
                      <span className="terminal-metric-label">Net</span>
                      <strong className="terminal-value mt-2 text-[1rem] text-primary">{formatCurrency(settlement.netProfit)}</strong>
                    </div>
                  </div>

                  <div className="terminal-row rounded-[1.1rem] px-3.5 py-3">
                    <div>
                      <p className="font-medium tracking-[0.08em] text-white">本地执行状态</p>
                      <p className="mt-1 text-[0.8rem] leading-6 text-white/46">
                        {localVault
                          ? `当前本地地址 ${maskAddress(localVault.address)} 已加密保存，可用于设备侧签名。`
                          : walletMode === "okx_wallet"
                            ? "已切换至 OKX 钱包连接链路，后续将进行异步授权。"
                            : "等待触发本地地址派生。"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[0.82rem] text-primary">
                      {walletMode === "okx_wallet" ? "TEE" : localVault ? maskAddress(localVault.address) : "PENDING"}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleTradeActivation}
                    disabled={walletMode === "detecting" || isBootstrappingVault}
                    className={cn(
                      "h-14 rounded-[1.1rem] border text-sm tracking-[0.18em] uppercase disabled:opacity-70",
                      isTradingEnabled
                        ? "border-primary/30 bg-primary/14 text-primary"
                        : "border-white/10 bg-white/[0.03] text-white/78 hover:border-primary/24 hover:text-primary",
                    )}
                  >
                    {isBootstrappingVault
                      ? "本地地址派生中"
                      : isTradingEnabled
                        ? "交易执行中"
                        : walletMode === "okx_wallet"
                          ? "授权并启动仿真交易"
                          : localVault
                            ? "启动本地金库仿真交易"
                            : "派生地址并启动仿真交易"}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "share" && (
              <div>
                <div className="section-header">
                  <div>
                    <p className="terminal-kicker">Share Poster</p>
                    <h3 className="section-title">分享给你的好友</h3>
                  </div>
                  <div className="terminal-chip rounded-[1rem] px-3 py-2 text-right">
                    <span className="text-[0.56rem] tracking-[0.22em] text-white/42">EXPORT</span>
                    <span className="mt-1 block font-mono text-[0.86rem] text-primary">PNG</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1.3rem] border border-primary/14 bg-black/46 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm">
                    <div className="overflow-hidden rounded-[1rem] border border-primary/18 bg-black/60">
                      {posterDataUrl ? (
                        <img src={posterDataUrl} alt="H 1.0 Pro 分享海报" className="block h-auto w-full" />
                      ) : (
                        <div className="flex min-h-[18rem] items-center justify-center px-6 text-center text-sm leading-7 text-white/52">
                          {isGeneratingPoster ? "正在生成黑金收益海报..." : "点击下方按钮生成当前收益海报。"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Button
                      variant="outline"
                      onClick={() => setPosterRefreshSeed((value) => value + 1)}
                      disabled={isGeneratingPoster}
                      className="h-12 rounded-[1rem] border border-white/10 bg-white/[0.03] text-[0.76rem] tracking-[0.16em] text-white/78 uppercase hover:border-primary/24 hover:text-primary disabled:opacity-60"
                    >
                      {isGeneratingPoster ? "生成中" : "刷新海报"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleDownloadPoster}
                      disabled={!posterDataUrl}
                      className="h-12 rounded-[1rem] border border-primary/24 bg-primary/10 text-[0.76rem] tracking-[0.16em] text-primary uppercase disabled:opacity-60"
                    >
                      下载 PNG
                    </Button>
                  </div>

                  <div className="terminal-row rounded-[1.1rem] px-3.5 py-3">
                    <div>
                      <p className="font-medium tracking-[0.08em] text-white">海报内容摘要</p>
                      <p className="mt-1 text-[0.8rem] leading-6 text-white/46">
                        净利润、分账金额、统一归集地址与当前执行模式会同步写入海报画面。
                      </p>
                    </div>
                    <div className="shrink-0 text-right font-mono text-[0.86rem] text-primary">
                      +{formatCurrency(settlement.netProfit)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/8 bg-black/88 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[31rem] grid-cols-4 gap-2.5">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant="outline"
              onClick={() => {
                if (tab.key === "trade") {
                  void handleTradeActivation();
                  return;
                }
                setActiveTab(tab.key);
              }}
              className={cn(
                "relative h-auto min-h-[4.75rem] rounded-[1rem] border px-2 py-3 text-left text-[0.66rem] leading-5 whitespace-normal transition-all duration-300 before:absolute before:inset-[4px] before:rounded-[0.8rem] before:border before:content-['']",
                activeTab === tab.key
                  ? "border-primary/38 bg-primary/16 text-primary shadow-[0_0_28px_rgba(255,215,0,0.08)] before:border-primary/20"
                  : "border-white/8 bg-white/[0.03] text-white/72 hover:border-primary/18 hover:bg-white/[0.045] hover:text-white before:border-white/5",
              )}
            >
              <span className="relative z-10 block text-center">{tab.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}
