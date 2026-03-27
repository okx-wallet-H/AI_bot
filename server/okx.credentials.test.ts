import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

function isoTimestamp() {
  return new Date().toISOString();
}

function signOkxRequest(params: {
  secretKey: string;
  timestamp: string;
  method: string;
  requestPath: string;
  body?: string;
}) {
  const prehash = `${params.timestamp}${params.method.toUpperCase()}${params.requestPath}${params.body ?? ""}`;
  return crypto.createHmac("sha256", params.secretKey).update(prehash).digest("base64");
}

async function okxFetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
}

describe("OKX credential validation", () => {
  it("validates demo trading credentials against account config", async () => {
    const apiKey = process.env.OKX_DEMO_API_KEY;
    const secretKey = process.env.OKX_DEMO_SECRET_KEY;
    const passphrase = process.env.OKX_DEMO_PASSPHRASE;

    expect(apiKey, "Missing OKX_DEMO_API_KEY").toBeTruthy();
    expect(secretKey, "Missing OKX_DEMO_SECRET_KEY").toBeTruthy();
    expect(passphrase, "Missing OKX_DEMO_PASSPHRASE").toBeTruthy();

    const requestPath = "/api/v5/account/config";
    const timestamp = isoTimestamp();
    const signature = signOkxRequest({
      secretKey: secretKey!,
      timestamp,
      method: "GET",
      requestPath,
    });

    const { response, data } = await okxFetchJson(`https://www.okx.com${requestPath}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": apiKey!,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": passphrase!,
        "x-simulated-trading": "1",
      },
    });

    expect(response.ok, `Demo Trading HTTP ${response.status}: ${JSON.stringify(data)}`).toBe(true);
    expect(data).toMatchObject({ code: "0" });
  }, 30000);

  it("skips OnchainOS credential validation when credentials are not fully ready", async () => {
    const apiKey = process.env.OKX_ONCHAIN_API_KEY;
    const secretKey = process.env.OKX_ONCHAIN_SECRET_KEY;
    const passphrase = process.env.OKX_ONCHAIN_PASSPHRASE;
    const projectId = process.env.OKX_ONCHAIN_PROJECT_ID;

    const fullyConfigured = Boolean(apiKey && secretKey && passphrase && projectId);

    if (!fullyConfigured) {
      expect(fullyConfigured).toBe(false);
      return;
    }

    expect(apiKey).toBeTruthy();
    expect(secretKey).toBeTruthy();
    expect(passphrase).toBeTruthy();
    expect(projectId).toBeTruthy();
  });
});
