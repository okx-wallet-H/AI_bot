/*
H 1.0 Pro share poster utility
- 使用 Canvas 在前端本地生成黑金收益海报
- 适配 Telegram Mini App 分享场景
- 不依赖服务端，不上传用户私钥或敏感数据
*/

export type SharePosterInput = {
  netProfit: number;
  grossProfit: number;
  commissionAmount: number;
  collectorAddress: string;
  executionMode: string;
  walletMode: string;
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function maskAddress(address: string) {
  if (!address) return "N/A";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function buildSharePoster(input: SharePosterInput) {
  if (typeof window === "undefined") {
    throw new Error("Share poster can only be generated in browser runtime.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1600;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(540, 120, 40, 540, 120, 820);
  gradient.addColorStop(0, "rgba(255,215,0,0.16)");
  gradient.addColorStop(0.45, "rgba(255,215,0,0.06)");
  gradient.addColorStop(1, "rgba(255,215,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 40; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(0,0,0,0.68)";
  roundRect(ctx, 72, 64, 936, 1472, 40, true, false);

  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, 72, 64, 936, 1472, 40, false, true);

  ctx.strokeStyle = "rgba(255,215,0,0.12)";
  roundRect(ctx, 92, 84, 896, 1432, 28, false, true);

  ctx.fillStyle = "rgba(255,255,255,0.52)";
  ctx.font = '500 28px "IBM Plex Sans SC", sans-serif';
  ctx.letterSpacing = "4px" as never;
  ctx.fillText("TELEGRAM MINI APP · H 1.0 PRO", 128, 132);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '700 96px "Oswald", sans-serif';
  ctx.fillText("H 1.0", 128, 258);
  ctx.fillStyle = "#FFD700";
  ctx.fillText("PRO", 128, 352);

  roundRect(ctx, 740, 102, 188, 146, 28, true, false, "rgba(255,255,255,0.03)");
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, 740, 102, 188, 146, 28, false, true);
  ctx.fillStyle = "rgba(255,255,255,0.46)";
  ctx.font = '500 20px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("SETTLE", 772, 144);
  ctx.fillStyle = "#FFD700";
  ctx.font = '600 34px "JetBrains Mono", monospace';
  ctx.fillText("EVM · USDT", 772, 198);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(128, 418);
  ctx.lineTo(952, 418);
  ctx.stroke();

  roundRect(ctx, 128, 460, 824, 288, 28, true, false, "rgba(255,255,255,0.02)");
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 128, 460, 824, 288, 28, false, true);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '600 40px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("净利润", 164, 546);
  ctx.fillStyle = "#FFD700";
  ctx.font = '700 82px "JetBrains Mono", monospace';
  ctx.fillText(formatAmount(input.netProfit), 164, 648);
  ctx.font = '600 40px "JetBrains Mono", monospace';
  ctx.fillText("USDT", 164, 702);

  ctx.fillStyle = "rgba(255,255,255,0.54)";
  ctx.font = '500 28px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("已扣除 10% x402 自动分账", 164, 738);

  roundRect(ctx, 128, 792, 398, 240, 24, true, false, "rgba(255,255,255,0.02)");
  roundRect(ctx, 554, 792, 398, 240, 24, true, false, "rgba(255,255,255,0.02)");
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, 128, 792, 398, 240, 24, false, true);
  roundRect(ctx, 554, 792, 398, 240, 24, false, true);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '500 22px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("Gross Profit", 164, 842);
  ctx.fillText("Collector", 590, 842);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '700 46px "JetBrains Mono", monospace';
  ctx.fillText(formatAmount(input.grossProfit), 164, 924);
  ctx.fillStyle = "#FFD700";
  ctx.fillText(maskAddress(input.collectorAddress), 590, 924);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '500 22px "IBM Plex Sans SC", sans-serif';
  ctx.fillText(`Fee Split ${formatAmount(input.commissionAmount)} USDT`, 164, 972);
  ctx.fillText("0x463b41d75e1018...13a7b4", 590, 972);

  roundRect(ctx, 128, 1080, 824, 250, 28, true, false, "rgba(255,255,255,0.02)");
  ctx.strokeStyle = "rgba(255,215,0,0.10)";
  roundRect(ctx, 128, 1080, 824, 250, 28, false, true);

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '500 22px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("Execution Layer", 164, 1132);
  ctx.fillText("Wallet Mode", 520, 1132);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = '600 34px "JetBrains Mono", monospace';
  ctx.fillText(input.executionMode, 164, 1188);
  ctx.fillText(input.walletMode, 520, 1188);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = '500 28px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("Arbitrum · Base · Solana", 164, 1260);
  ctx.fillText("Signal Server / Client Signing", 164, 1306);

  ctx.fillStyle = "rgba(255,255,255,0.34)";
  ctx.font = '500 22px "IBM Plex Sans SC", sans-serif';
  ctx.fillText("H 1.0 Pro · Black Gold Intelligence Terminal", 128, 1446);
  ctx.fillText("Telegram Mini App · Simulated execution with real split structure", 128, 1486);

  return canvas.toDataURL("image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean,
  stroke: boolean,
  fillStyle?: string,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fillStyle ?? "#000000";
    ctx.fill();
  }

  if (stroke) {
    ctx.stroke();
  }
}
