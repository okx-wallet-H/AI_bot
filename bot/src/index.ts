/*
H 1.0 Pro Telegram Bot entry
- Uses Telegraf to launch the Telegram Mini App
- Sends Web App button, session metadata, and product context
- Keeps secrets in environment variables only
*/

import "dotenv/config";
import { Markup, Telegraf } from "telegraf";

const rawBotToken = process.env.TELEGRAM_BOT_TOKEN;
const rawMiniAppUrl = process.env.TMA_WEBAPP_URL;
const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
const appName = process.env.TMA_APP_NAME ?? "H 1.0 Pro";

if (!rawBotToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in environment.");
}

if (!rawMiniAppUrl) {
  throw new Error("Missing TMA_WEBAPP_URL in environment.");
}

const botToken: string = rawBotToken;
const miniAppUrl: string = rawMiniAppUrl;

type LaunchPayload = {
  version: string;
  mode: "simulation" | "production-ready";
  settleAsset: "USDT";
  settleChain: "EVM";
  collectorAddress: string;
  engines: string[];
};

const launchPayload: LaunchPayload = {
  version: "1.0.0-pro",
  mode: "simulation",
  settleAsset: "USDT",
  settleChain: "EVM",
  collectorAddress: process.env.COLLECTOR_EVM_ADDRESS ?? "0x463b41d75e1018ba7a0a62f421219558ee13a7b4",
  engines: ["arbitrage", "momentum", "treasury"],
};

function buildStartKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.webApp("打开 H 1.0 Pro", miniAppUrl)],
    [Markup.button.callback("查看状态说明", "h1:status")],
  ]);
}

function buildDeepLinkText(userId?: number) {
  const encoded = Buffer.from(
    JSON.stringify({
      ...launchPayload,
      userId,
      botUsername,
      issuedAt: new Date().toISOString(),
    }),
  ).toString("base64url");

  return `${miniAppUrl}${miniAppUrl.includes("?") ? "&" : "?"}launch=${encoded}`;
}

const bot = new Telegraf(botToken);

bot.start(async (ctx) => {
  const firstName = ctx.from?.first_name ?? "Trader";
  const openUrl = buildDeepLinkText(ctx.from?.id);

  const intro = [
    `欢迎进入 ${appName}。`,
    "这是一个基于 Telegram Mini App 的黑金智能交易终端。",
    "当前默认运行于仿真执行模式，结算结构保留 10% x402 分账参数。",
    `统一归集地址：${launchPayload.collectorAddress}`,
    `如按钮失效，可直接打开：${openUrl}`,
  ].join("\n");

  await ctx.reply(`你好，${firstName}。\n\n${intro}`, buildStartKeyboard());
});

bot.command("app", async (ctx) => {
  await ctx.reply("点击下方按钮打开 Mini App。", buildStartKeyboard());
});

bot.command("status", async (ctx) => {
  await ctx.reply(
    [
      "H 1.0 Pro 当前运行参数：",
      `- 执行模式：${launchPayload.mode}`,
      `- 结算资产：${launchPayload.settleAsset}`,
      `- 结算链：${launchPayload.settleChain}`,
      `- 三大引擎：${launchPayload.engines.join(" / ")}`,
      "- 信号在服务端生成，执行与签名在客户端完成",
    ].join("\n"),
  );
});

bot.action("h1:status", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "系统状态说明：",
      "1. 首版为仿真执行模式。",
      "2. 检测到 OKX 钱包时走授权连接链路。",
      "3. 未检测到钱包时前端会在本地派生随机私钥，并加密保存。",
      "4. 净利润展示已扣除 10% 分账。",
    ].join("\n"),
  );
});

bot.catch((error) => {
  console.error("[h1-bot] runtime error", error);
});

async function main() {
  console.log("[h1-bot] starting bot process...");
  await bot.launch({ dropPendingUpdates: true });
  console.log("[h1-bot] bot launched successfully");

  const shutdown = async (signal: string) => {
    console.log(`[h1-bot] received ${signal}, shutting down`);
    await bot.stop(signal);
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

void main();
