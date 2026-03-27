/*
H 1.0 Pro shared domain types
- Shared across bot, signal engine, and frontend adapters
- Focused on simulation-first execution with production-ready settlement structure
*/

export type EngineKey = "arbitrage" | "momentum" | "treasury";
export type ChainKey = "arbitrum" | "base" | "solana";
export type AssetKey = "BTC" | "ETH" | "SOL" | "USDT" | "USDC";
export type ExecutionStatus = "queued" | "running" | "settled";
export type ExecutionMode = "simulation" | "production-ready";

export interface OrderIntent {
  id: string;
  engine: EngineKey;
  chain: ChainKey;
  marketType: "spot" | "perps" | "bridge";
  baseAsset: AssetKey;
  quoteAsset: AssetKey;
  route: string;
  rationale: string;
  expectedEdgeBps: number;
  gasCostUsd: number;
  expectedProfitUsd: number;
  createdAt: string;
}

export interface ExecutionFeedItem {
  id: string;
  engine: EngineKey;
  label: string;
  route: string;
  status: ExecutionStatus;
  timestamp: string;
  pnl: number;
}

export interface X402SplitPayload {
  enabled: boolean;
  protocol: "x402";
  settleAsset: "USDT";
  settleChain: "EVM";
  collectorAddress: string;
  commissionRate: number;
  routeHint?: string;
  metadata?: Record<string, string>;
}

export interface SettlementBreakdown {
  orderId: string;
  engine: EngineKey;
  mode: ExecutionMode;
  grossProfit: number;
  commissionRate: number;
  commissionAmount: number;
  netProfit: number;
  settleAsset: "USDT";
  settleChain: "EVM";
  collectorAddress: string;
  x402: X402SplitPayload;
  settledAt: string;
}

export interface SignalSnapshot {
  generatedAt: string;
  mode: ExecutionMode;
  chains: ChainKey[];
  assets: AssetKey[];
  orderIntents: OrderIntent[];
  executionFeed: ExecutionFeedItem[];
  settlements: SettlementBreakdown[];
}

export interface RuntimeConfig {
  appName: string;
  mode: ExecutionMode;
  collectorAddress: string;
  commissionRate: number;
  okxEnv: "demo" | "live";
  okxSite: "global" | "eea" | "us";
}
