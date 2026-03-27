import { describe, expect, it } from "vitest";

describe("telegram mini app url", () => {
  it("responds successfully with an html document", async () => {
    const url = process.env.TMA_WEBAPP_URL;

    expect(url, "TMA_WEBAPP_URL should be defined").toBeTruthy();

    const response = await fetch(url as string, {
      redirect: "follow",
      headers: {
        "user-agent": "vitest-url-check",
      },
    });

    expect(response.ok).toBe(true);

    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("H 1.0 Pro");
    expect(html).toContain("GitHub Pages");
  }, 30_000);
});
