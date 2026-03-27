/*
H 1.0 Pro simulation signal engine
- 首版默认运行于 simulation 模式
- 输出三大引擎的订单意图、执行流与结算结构
- 结算对象保留真实的 10% x402 分账参数接口
*/

import "dotenv/config";
import {
  type ChainKey,
  type ExecutionFeedItem,
  type ExecutionMode,
  type OrderIntent,
  type RuntimeConfig,
  type SettlementBreakdown,
  type SignalSnapshot,
} from "../../shared/h1/types";

function createId(prefix: string) {
  return `${prefix}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function nowClock() {
  return new Date().toLocaleTimeString("zh-CN", { hour12: false });
}

export function loadRuntimeConfig(): RuntimeConfig {
  return {
    appName: process.env.TMA_APP_NAME ?? "H 1.0 Pro",
    mode: (process.env.H1_EXECUTION_MODE as ExecutionMode) ?? "simulation",
    collectorAddress:
      process.env.COLLECTOR_EVM_ADDRESS ?? "0x463b41d75e1018ba7a0a62f421219558ee13a7b4",
    commissionRate: Number(process.env.H1_COMMISSION_RATE ?? "0.1"),
    okxEnv: process.env.OKX_ENV === "live" ? "live" : "demo",
    okxSite:
      process.env.OKX_SITE === "eea"
        ? "eea"
        : process.env.OKX_SITE === "us"
          ? "us"
          : "global",
  };
}

export function buildOrderIntents(): OrderIntent[] {
  const createdAt = nowIso();

  return [
    {
      id: createId("AX"),
      engine: "arbitrage",
      chain: "arbitrum",
      marketType: "spot",
      baseAsset: "ETH",
      quoteAsset: "USDT",
      route: "Arbitrum · Uniswap V3 → OKX DEX",
      rationale: "检测到 DEX 主流交易对出现可覆盖 gas 的现货价差，适合恒定套利网格执行。",
      expectedEdgeBps: 42,
      gasCostUsd: 0.18,
      expectedProfitUsd: 86.72,
      createdAt,
    },
    {
      id: createId("MM"),
      engine: "momentum",
      chain: "base",
      marketType: "perps",
      baseAsset: "BTC",
      quoteAsset: "USDT",
      route: "Base · Spot Trigger → Perps Overlay",
      rationale: "动量因子与波动扩张共振，允许用现货与永续合约组合放大收益窗口。",
      expectedEdgeBps: 118,
      gasCostUsd: 0.24,
      expectedProfitUsd: 132.48,
      createdAt,
    },
    {
      id: createId("TR"),
      engine: "treasury",
      chain: "solana",
      marketType: "bridge",
      baseAsset: "USDC",
      quoteAsset: "USDT",
      route: "Solana → EVM USDT Settlement",
      rationale: "跨链价差高于 0.8% 且覆盖 gas 成本，触发全域归集并统一结算到 EVM。",
      expectedEdgeBps: 87,
      gasCostUsd: 0.14,
      expectedProfitUsd: 141.23,
      createdAt,
    },
  ];
}

export function buildExecutionFeed(orderIntents: OrderIntent[]): ExecutionFeedItem[] {
  return orderIntents.map((intent, index) => ({
    id: intent.id,
    engine: intent.engine,
    label:
      intent.engine === "arbitrage"
        ? "USDT / ETH 价差捕捉"
        : intent.engine === "momentum"
          ? "BTC 波动放大窗口执行"
          : "跨链利润归集",
    route: intent.route,
    status: index === 1 ? "running" : "settled",
    timestamp: nowClock(),
    pnl: Number((intent.expectedProfitUsd * (index === 1 ? 0.42 : 0.95)).toFixed(2)),
  }));
}

export function buildSettlement(
  orderIntent: OrderIntent,
  grossProfit: number,
  runtimeConfig: RuntimeConfig,
): SettlementBreakdown {
  const commissionAmount = Number((grossProfit * runtimeConfig.commissionRate).toFixed(2));
  const netProfit = Number((grossProfit - commissionAmount).toFixed(2));

  return {
    orderId: orderIntent.id,
    engine: orderIntent.engine,
    mode: runtimeConfig.mode,
    grossProfit: Number(grossProfit.toFixed(2)),
    commissionRate: runtimeConfig.commissionRate,
    commissionAmount,
    netProfit,
    settleAsset: "USDT",
    settleChain: "EVM",
    collectorAddress: runtimeConfig.collectorAddress,
    x402: {
      enabled: true,
      protocol: "x402",
      settleAsset: "USDT",
      settleChain: "EVM",
      collectorAddress: runtimeConfig.collectorAddress,
      commissionRate: runtimeConfig.commissionRate,
      routeHint:
        orderIntent.engine === "treasury"
          ? "cross-chain-usdc-to-usdt-evm"
          : orderIntent.engine === "momentum"
            ? "perps-profit-to-spot-usdt-evm"
            : "dex-spot-profit-to-usdt-evm",
      metadata: {
        orderIntentId: orderIntent.id,
        sourceChain: orderIntent.chain,
        okxEnv: runtimeConfig.okxEnv,
        okxSite: runtimeConfig.okxSite,
      },
    },
    settledAt: nowIso(),
  };
}

export function buildSettlements(
  orderIntents: OrderIntent[],
  runtimeConfig: RuntimeConfig,
): SettlementBreakdown[] {
  return orderIntents.map((intent, index) => {
    const grossProfit = index === 0 ? 82.14 : index === 1 ? 56.27 : 126.88;
    return buildSettlement(intent, grossProfit, runtimeConfig);
  });
}

export function createSimulationSnapshot(
  runtimeConfig: RuntimeConfig = loadRuntimeConfig(),
): SignalSnapshot {
  const orderIntents = buildOrderIntents();
  const executionFeed = buildExecutionFeed(orderIntents);
  const settlements = buildSettlements(orderIntents, runtimeConfig);

  return {
    generatedAt: nowIso(),
    mode: runtimeConfig.mode,
    chains: ["arbitrum", "base", "solana"],
    assets: ["BTC", "ETH", "SOL", "USDT", "USDC"],
    orderIntents,
    executionFeed,
    settlements,
  };
}

export function summarizeSnapshot(snapshot: SignalSnapshot) {
  const grossProfit = snapshot.settlements.reduce((sum, item) => sum + item.grossProfit, 0);
  const commissionAmount = snapshot.settlements.reduce((sum, item) => sum + item.commissionAmount, 0);
  const netProfit = snapshot.settlements.reduce((sum, item) => sum + item.netProfit, 0);

  return {
    generatedAt: snapshot.generatedAt,
    orderCount: snapshot.orderIntents.length,
    executionCount: snapshot.executionFeed.length,
    settledCount: snapshot.settlements.length,
    grossProfit: Number(grossProfit.toFixed(2)),
    commissionAmount: Number(commissionAmount.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
  };
}

export function buildClientExecutionHints(snapshot: SignalSnapshot) {
  return snapshot.orderIntents.map((intent) => ({
    orderId: intent.id,
    engine: intent.engine,
    chain: intent.chain,
    route: intent.route,
    requiresClientSignature: true,
    walletPreference: preferredWalletMode(intent.chain),
    settlementTarget: "EVM/USDT",
  }));
}

function preferredWalletMode(chain: ChainKey) {
  if (chain === "solana") return "local_vault_or_okx_connect";
  return "okx_connect_preferred";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshot = createSimulationSnapshot();
  const summary = summarizeSnapshot(snapshot);
  const output = {
    config: loadRuntimeConfig(),
    summary,
    executionHints: buildClientExecutionHints(snapshot),
    snapshot,
  };

  console.log(JSON.stringify(output, null, 2));
}
