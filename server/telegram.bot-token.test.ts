import { describe, expect, it } from "vitest";

describe("telegram bot token", () => {
  it("authenticates successfully against Telegram getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    expect(token, "TELEGRAM_BOT_TOKEN should be defined").toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok).toBe(true);

    const payload = (await response.json()) as {
      ok?: boolean;
      result?: {
        id?: number;
        is_bot?: boolean;
        username?: string;
      };
      description?: string;
    };

    expect(payload.ok, payload.description ?? "Telegram getMe returned a non-ok payload").toBe(true);
    expect(payload.result?.is_bot).toBe(true);
    expect(typeof payload.result?.id).toBe("number");
    expect(payload.result?.username).toBeTruthy();
  }, 30_000);
});
