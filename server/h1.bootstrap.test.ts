import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { hasOkxDemoCredentials } from "./okx";
import { appRouter } from "./routers";

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

describe("h1.bootstrap", () => {
  it("returns runtime config, simulation snapshot and integration audit", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.h1.bootstrap();

    expect(result.config.appName).toBeTruthy();
    expect(result.config.collectorAddress).toMatch(/^0x[a-fA-F0-9]{8,}$/);
    expect(["demo", "live"]).toContain(result.config.okxEnv);
    expect(["global", "eea", "us"]).toContain(result.config.okxSite);

    expect(result.summary.orderCount).toBeGreaterThan(0);
    expect(result.summary.executionCount).toBeGreaterThan(0);
    expect(result.summary.settledCount).toBeGreaterThan(0);

    expect(result.snapshot.orderIntents).toHaveLength(3);
    expect(result.snapshot.executionFeed.length).toBeGreaterThan(0);
    expect(result.snapshot.settlements.length).toBeGreaterThan(0);

    expect(result.executionHints.every((item) => item.requiresClientSignature)).toBe(true);
    expect(result.executionHints.map((item) => item.engine)).toEqual(
      expect.arrayContaining(["arbitrage", "momentum", "treasury"]),
    );

    expect(result.integrationAudit).toMatchObject({
      executionMode: "simulation-first",
      agentTradeKit: {
        connected: false,
        level: "not_integrated",
      },
      walletApi: {
        connected: false,
        level: "client_detect_only",
      },
      onchainOs: {
        connected: false,
        level: "not_integrated",
      },
    });

    if (hasOkxDemoCredentials()) {
      expect(result.integrationAudit.demoTrading.connected).toBe(true);
      expect(result.integrationAudit.demoTrading.level).toBe("authenticated");
      expect(result.integrationAudit.demoTrading.requiredHeaders).toContain("x-simulated-trading");
    } else {
      expect(result.integrationAudit.demoTrading.connected).toBe(false);
      expect(result.integrationAudit.demoTrading.level).toBe("credentials_missing");
    }
  }, 30000);
});
