/*
H 1.0 Pro Telegram Bot entry
- Uses Telegraf to launch the Telegram Mini App
- Sends Chinese Web App buttons, session metadata, and product context
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

type MiniAppTab = "trade" | "logs" | "calendar" | "share";

const launchPayload: LaunchPayload = {
  version: "1.0.0-pro",
  mode: "simulation",
  settleAsset: "USDT",
  settleChain: "EVM",
  collectorAddress: process.env.COLLECTOR_EVM_ADDRESS ?? "0x463b41d75e1018ba7a0a62f421219558ee13a7b4",
  engines: ["arbitrage", "momentum", "treasury"],
};

function buildMiniAppUrl(tab: MiniAppTab = "trade", userId?: number) {
  const encoded = Buffer.from(
    JSON.stringify({
      ...launchPayload,
      tab,
      userId,
      botUsername,
      issuedAt: new Date().toISOString(),
    }),
  ).toString("base64url");

  const connector = miniAppUrl.includes("?") ? "&" : "?";
  return `${miniAppUrl}${connector}tab=${tab}&launch=${encoded}`;
}

function buildInlineLaunchKeyboard(userId?: number) {
  return Markup.inlineKeyboard([
    [Markup.button.webApp("H", buildMiniAppUrl("trade", userId))],
    [Markup.button.callback("查看当前状态", "h1:status")],
  ]);
}

function buildQuickLaunchKeyboard(userId?: number) {
  const keyboard = [
    [{ text: "实时执行记录", web_app: { url: buildMiniAppUrl("logs", userId) } }],
    [{ text: "我的收益日历", web_app: { url: buildMiniAppUrl("calendar", userId) } }],
    [{ text: "分享你的好友", web_app: { url: buildMiniAppUrl("share", userId) } }],
    [{ text: "开启智能交易", web_app: { url: buildMiniAppUrl("trade", userId) } }],
  ];

  return {
    reply_markup: {
      keyboard,
      resize_keyboard: true,
      is_persistent: true,
    },
  };
}

const bot = new Telegraf(botToken);

bot.start(async (ctx) => {
  const firstName = ctx.from?.first_name ?? "交易员";
  const openUrl = buildMiniAppUrl("trade", ctx.from?.id);

  const intro = [
    `欢迎进入 ${appName}。`,
    "当前版本为仿真执行模式，前端负责签名与本地金库，收益按 10% 自动分账结构展示。",
    `统一归集地址：${launchPayload.collectorAddress}`,
    `如按钮未显示，可直接打开：${openUrl}`,
  ].join("\n");

  await ctx.reply(`你好，${firstName}。\n\n${intro}`, buildInlineLaunchKeyboard(ctx.from?.id));
  await ctx.reply("下方输入框上方已载入快捷入口。", buildQuickLaunchKeyboard(ctx.from?.id));
});

bot.command("app", async (ctx) => {
  await ctx.reply("请选择你要打开的功能入口。", buildInlineLaunchKeyboard(ctx.from?.id));
  await ctx.reply("下方输入框上方已载入快捷入口。", buildQuickLaunchKeyboard(ctx.from?.id));
});

bot.command("status", async (ctx) => {
  await ctx.reply(
    [
      "H 1.0 Pro 当前运行参数：",
      `- 执行模式：${launchPayload.mode === "simulation" ? "仿真执行" : "生产就绪"}`,
      `- 结算资产：${launchPayload.settleAsset}`,
      `- 结算链：${launchPayload.settleChain}`,
      `- 三大引擎：恒定套利 / 动能捕获 / 全域归集`,
      "- 信号在服务端生成，执行与签名在客户端完成",
    ].join("\n"),
    buildQuickLaunchKeyboard(ctx.from?.id),
  );
});

bot.action("h1:status", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    [
      "系统状态说明：",
      "1. 当前版本为仿真执行模式。",
      "2. 检测到 OKX 钱包时走授权连接链路。",
      "3. 未检测到钱包时前端会在本地派生随机私钥，并加密保存。",
      "4. 净利润展示已扣除 10% 分账。",
    ].join("\n"),
    buildQuickLaunchKeyboard(ctx.from?.id),
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
