import crypto from "node:crypto";

const OKX_REST_BASE_URL = "https://www.okx.com";
const DEMO_TRADING_HEADER = "x-simulated-trading";

type HttpMethod = "GET" | "POST";

type OkxDemoCredentials = {
  apiKey: string;
  secretKey: string;
  passphrase: string;
};

type OkxJsonResponse<T = unknown> = {
  code?: string;
  msg?: string;
  data?: T;
  [key: string]: unknown;
};

type OkxTickerRow = {
  instId: string;
  last: string;
  open24h: string;
  high24h: string;
  low24h: string;
  vol24h: string;
  volCcy24h: string;
  bidPx?: string;
  askPx?: string;
  ts: string;
};

type OkxInstrumentRow = {
  instId: string;
  instType: string;
  baseCcy?: string;
  quoteCcy?: string;
  state?: string;
  tickSz?: string;
  lotSz?: string;
  lever?: string;
  listTime?: string;
};

export type OkxPublicTicker = {
  instId: string;
  last: number;
  open24h: number;
  high24h: number;
  low24h: number;
  vol24h: number;
  volCcy24h: number;
  bidPx: number | null;
  askPx: number | null;
  ts: number;
};

export type OkxPublicInstrument = {
  instId: string;
  instType: string;
  baseCcy: string | null;
  quoteCcy: string | null;
  state: string | null;
  tickSz: string | null;
  lotSz: string | null;
  lever: string | null;
  listTime: number | null;
};

export type OkxCandlePoint = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  confirm: boolean;
};

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? NaN);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchOkxJson<T>(requestPath: string, init?: RequestInit) {
  const response = await fetch(`${OKX_REST_BASE_URL}${requestPath}`, init);
  const text = await response.text();
  let payload: OkxJsonResponse<T> | string;

  try {
    payload = text ? (JSON.parse(text) as OkxJsonResponse<T>) : {};
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`OKX request failed: HTTP ${response.status}`);
  }

  if (typeof payload === "string") {
    throw new Error(`OKX returned non-JSON payload: ${payload.slice(0, 160)}`);
  }

  if (payload.code !== "0") {
    throw new Error(`OKX request failed: code ${payload.code ?? "unknown"} ${payload.msg ?? ""}`.trim());
  }

  return payload.data;
}

export function getOkxDemoCredentials(): OkxDemoCredentials | null {
  const apiKey = process.env.OKX_DEMO_API_KEY?.trim();
  const secretKey = process.env.OKX_DEMO_SECRET_KEY?.trim();
  const passphrase = process.env.OKX_DEMO_PASSPHRASE?.trim();

  if (!apiKey || !secretKey || !passphrase) {
    return null;
  }

  return { apiKey, secretKey, passphrase };
}

export function hasOkxDemoCredentials() {
  return Boolean(getOkxDemoCredentials());
}

export function hasOkxOnchainCredentials() {
  return Boolean(
    process.env.OKX_ONCHAIN_API_KEY?.trim() &&
      process.env.OKX_ONCHAIN_SECRET_KEY?.trim() &&
      process.env.OKX_ONCHAIN_PASSPHRASE?.trim() &&
      process.env.OKX_ONCHAIN_PROJECT_ID?.trim(),
  );
}

export function createOkxSignature(params: {
  secretKey: string;
  timestamp: string;
  method: HttpMethod;
  requestPath: string;
  body?: string;
}) {
  const prehash = `${params.timestamp}${params.method}${params.requestPath}${params.body ?? ""}`;
  return crypto.createHmac("sha256", params.secretKey).update(prehash).digest("base64");
}

export function buildOkxDemoHeaders(params: {
  method: HttpMethod;
  requestPath: string;
  body?: string;
}) {
  const credentials = getOkxDemoCredentials();

  if (!credentials) {
    throw new Error("OKX Demo Trading credentials are not configured");
  }

  const timestamp = new Date().toISOString();
  const signature = createOkxSignature({
    secretKey: credentials.secretKey,
    timestamp,
    method: params.method,
    requestPath: params.requestPath,
    body: params.body,
  });

  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": credentials.apiKey,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": credentials.passphrase,
    [DEMO_TRADING_HEADER]: "1",
  };
}

export async function fetchOkxDemoAccountConfig() {
  const requestPath = "/api/v5/account/config";
  const response = await fetch(`${OKX_REST_BASE_URL}${requestPath}`, {
    method: "GET",
    headers: buildOkxDemoHeaders({ method: "GET", requestPath }),
  });

  const text = await response.text();
  let payload: OkxJsonResponse | string;

  try {
    payload = text ? (JSON.parse(text) as OkxJsonResponse) : {};
  } catch {
    payload = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

export async function getOkxDemoConnectivitySnapshot() {
  const credentialsReady = hasOkxDemoCredentials();

  if (!credentialsReady) {
    return {
      connected: false,
      level: "credentials_missing" as const,
      note: "尚未配置 OKX Demo Trading 所需的 API Key / Secret / Passphrase。",
      restBaseUrl: OKX_REST_BASE_URL,
      requiredHeaders: [DEMO_TRADING_HEADER],
    };
  }

  try {
    const result = await fetchOkxDemoAccountConfig();
    const payload = typeof result.payload === "string" ? { raw: result.payload } : result.payload;
    const okxCode = typeof payload?.code === "string" ? payload.code : undefined;

    if (result.ok && okxCode === "0") {
      return {
        connected: true,
        level: "authenticated" as const,
        note: "已通过 OKX Demo Trading 官方账户配置接口认证，可继续接入查询与下单适配层。",
        restBaseUrl: OKX_REST_BASE_URL,
        requiredHeaders: [DEMO_TRADING_HEADER],
        status: result.status,
      };
    }

    return {
      connected: false,
      level: "auth_failed" as const,
      note: `OKX Demo Trading 认证未通过，HTTP ${result.status} / code ${okxCode ?? "unknown"}`,
      restBaseUrl: OKX_REST_BASE_URL,
      requiredHeaders: [DEMO_TRADING_HEADER],
      status: result.status,
      payload,
    };
  } catch (error) {
    return {
      connected: false,
      level: "network_error" as const,
      note: error instanceof Error ? error.message : "访问 OKX Demo Trading 时发生未知错误。",
      restBaseUrl: OKX_REST_BASE_URL,
      requiredHeaders: [DEMO_TRADING_HEADER],
    };
  }
}

export function normalizeOkxSpotInstId(input: string, fallbackQuote = "USDT") {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, "").replace(/\//g, "-");

  if (!normalized) {
    return null;
  }

  if (/^[A-Z0-9]{2,15}-[A-Z0-9]{2,15}$/.test(normalized)) {
    return normalized;
  }

  if (/^[A-Z0-9]{2,15}$/.test(normalized)) {
    return `${normalized}-${fallbackQuote}`;
  }

  return null;
}

export async function fetchOkxPublicTicker(instId: string): Promise<OkxPublicTicker> {
  const data = (await fetchOkxJson<OkxTickerRow[]>(`/api/v5/market/ticker?instId=${encodeURIComponent(instId)}`)) ?? [];
  const row = data[0];

  if (!row) {
    throw new Error(`未找到 ${instId} 的实时行情`);
  }

  return {
    instId: row.instId,
    last: toNumber(row.last),
    open24h: toNumber(row.open24h),
    high24h: toNumber(row.high24h),
    low24h: toNumber(row.low24h),
    vol24h: toNumber(row.vol24h),
    volCcy24h: toNumber(row.volCcy24h),
    bidPx: row.bidPx ? toNumber(row.bidPx) : null,
    askPx: row.askPx ? toNumber(row.askPx) : null,
    ts: Number(row.ts),
  };
}

export async function fetchOkxPublicInstrument(instId: string): Promise<OkxPublicInstrument> {
  const data =
    (await fetchOkxJson<OkxInstrumentRow[]>(
      `/api/v5/public/instruments?instType=SPOT&instId=${encodeURIComponent(instId)}`,
    )) ?? [];
  const row = data[0];

  if (!row) {
    throw new Error(`未找到 ${instId} 的代币资料`);
  }

  return {
    instId: row.instId,
    instType: row.instType,
    baseCcy: row.baseCcy ?? null,
    quoteCcy: row.quoteCcy ?? null,
    state: row.state ?? null,
    tickSz: row.tickSz ?? null,
    lotSz: row.lotSz ?? null,
    lever: row.lever ?? null,
    listTime: row.listTime ? Number(row.listTime) : null,
  };
}

export async function fetchOkxPublicCandles(instId: string, bar = "1H", limit = 12): Promise<OkxCandlePoint[]> {
  const data =
    (await fetchOkxJson<string[][]>(
      `/api/v5/market/candles?instId=${encodeURIComponent(instId)}&bar=${encodeURIComponent(bar)}&limit=${limit}`,
    )) ?? [];

  return data
    .map((row) => ({
      ts: Number(row[0]),
      open: toNumber(row[1]),
      high: toNumber(row[2]),
      low: toNumber(row[3]),
      close: toNumber(row[4]),
      confirm: row[8] === "1",
    }))
    .sort((left, right) => left.ts - right.ts);
}

export async function getOkxMarketSnapshot(instId: string) {
  const [ticker, instrument, candles] = await Promise.all([
    fetchOkxPublicTicker(instId),
    fetchOkxPublicInstrument(instId),
    fetchOkxPublicCandles(instId),
  ]);

  const priceChange = ticker.last - ticker.open24h;
  const priceChangePct = ticker.open24h ? (priceChange / ticker.open24h) * 100 : 0;

  return {
    instId,
    ticker,
    instrument,
    candles,
    priceChange: Number(priceChange.toFixed(4)),
    priceChangePct: Number(priceChangePct.toFixed(4)),
  };
}
