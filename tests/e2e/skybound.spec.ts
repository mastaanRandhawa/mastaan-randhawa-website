import { expect, test, type Page } from "@playwright/test";

const errorsOf = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
});

test("title screen shows who this is and the key links without playing", async ({ page, request }) => {
  const errors = errorsOf(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /skybound/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Mastaan Randhawa").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /start flying/i })).toBeVisible();
  const nav = page.getByRole("navigation", { name: /quick links/i });
  await expect(nav.getByRole("link", { name: /resume/i })).toHaveAttribute("href", /\.pdf$/);
  await expect(nav.getByRole("link", { name: /github/i })).toHaveAttribute("href", "https://github.com/mastaanRandhawa");
  await expect(nav.getByRole("link", { name: /linkedin/i })).toHaveAttribute("href", /linkedin\.com/);
  const pdf = await request.get("/ResumeMay2025Tech.pdf");
  expect(pdf.status()).toBe(200);
  expect(errors).toEqual([]);
});

test("classic portfolio lists every project and links back to the game", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /view portfolio/i }).click();
  // The original site shows six projects, then "Show More Projects".
  await page.getByRole("button", { name: /show more projects/i }).click();
  for (const t of ["BC Tigers Tournament Hub", "RISC-V Processor", "Multi-Level Cache System", "Ferrari Website"]) {
    await expect(page.getByRole("heading", { name: t })).toBeAttached();
  }
  await expect(page.locator("#experience")).toContainText("ThoughtsWin Systems");
  await expect(page.locator("#certifications")).toContainText("Databricks Certified Data Engineer Associate");
  await expect(page.locator("#education")).toContainText("Simon Fraser University");
  await page.getByRole("button", { name: /fly the 3d version/i }).first().click();
  await expect(page.getByRole("button", { name: /start flying/i })).toBeVisible({ timeout: 30_000 });
});

test("old section links still work (deep link opens the portfolio)", async ({ page }) => {
  await page.goto("/#experience");
  await expect(page.locator("#experience")).toBeInViewport({ timeout: 15_000 });
});

test("falls back to the portfolio when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: any[]) {
      if (type.startsWith("webgl")) return null;
      return orig.call(this, type as "2d", ...rest);
    } as typeof orig;
  });
  await page.goto("/");
  await expect(page.getByText(/needs WebGL/i)).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#portfolio")).toBeAttached();
});

test("fly: takeoff, controls, pause, map, landing at a destination and taking off", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = errorsOf(page);
  await page.goto("/");
  await page.getByRole("button", { name: /start flying/i }).click({ timeout: 30_000 });
  await page.waitForFunction(() => window.__skybound?.runtime.phase === "flying", null, { timeout: 30_000 });
  await expect(page.getByText(/airspeed/i)).toBeVisible();

  const before = await page.evaluate(() => window.__skybound!.runtime.flight.pitch);
  await page.keyboard.down("KeyS"); // S pulls back = climb
  await page.waitForTimeout(600);
  await page.keyboard.up("KeyS");
  const after = await page.evaluate(() => window.__skybound!.runtime.flight.pitch);
  expect(after).toBeGreaterThan(before + 0.1);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /pause menu/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("KeyM");
  await expect(page.getByRole("dialog", { name: /world map/i })).toBeVisible();
  await page.keyboard.press("KeyM");

  // Fly next to the Launch Airfield briefing and press F.
  await page.evaluate(() => {
    const S = window.__skybound!;
    const d = S.world().destinations.find((x) => x.id === "about")!;
    S.resetFlightAt(d.pos[0] + 30, d.pos[1] + 25, d.pos[2] + 60, 0.3, 30);
  });
  await page.waitForTimeout(300);
  // F flies to the airfield and lands; the briefing opens once parked.
  await page.keyboard.press("KeyF");
  await page.waitForFunction(() => window.__skybound!.runtime.phase === "visit", null, { timeout: 5_000 });
  const panel = page.getByRole("dialog", { name: "Mastaan Randhawa" });
  await expect(panel).toBeVisible({ timeout: 40_000 });
  await expect(panel).toContainText("Simon Fraser University");
  await expect(page.getByRole("button", { name: /take off/i })).toBeVisible();
  // Closing the sheet takes off again.
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.waitForFunction(() => window.__skybound!.runtime.visit?.stage === "takeoff" || window.__skybound!.runtime.visit?.stage === "climb", null, { timeout: 5_000 });
  expect(errors).toEqual([]);
});
