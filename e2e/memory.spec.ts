import { expect, test, type Page, type Locator } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_PATH = path.join(__dirname, "artifacts", "calculator-initial.png");

function attachConsoleGuard(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => {
    errors.push(`pageerror: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });
  return {
    assertClean() {
      expect(errors, errors.join("\n")).toEqual([]);
    },
  };
}

async function openCalculator(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("application", { name: "Calculadora" })).toBeVisible();
}

function result(page: Page) {
  return page.getByTestId("result");
}

function expression(page: Page) {
  return page.getByTestId("expression");
}

function key(page: Page, dataKey: string) {
  return page.locator(`[data-key="${dataKey}"]`);
}

async function tapDigit(page: Page, digit: string) {
  await key(page, `digit-${digit}`).click();
}

async function tapDigits(page: Page, value: string) {
  for (const ch of value) {
    if (ch === ",") {
      await key(page, "decimal").click();
    } else {
      await tapDigit(page, ch);
    }
  }
}

async function tapOp(page: Page, op: "add" | "subtract" | "multiply" | "divide" | "equals" | "ac" | "backspace" | "percent") {
  const map = {
    add: "add",
    subtract: "subtract",
    multiply: "multiply",
    divide: "divide",
    equals: "equals",
    ac: "ac",
    backspace: "backspace",
    percent: "percent",
  } as const;
  await key(page, map[op]).click();
}

async function box(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function nearly(actual: number, expected: number, tol = 1) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tol);
}

test.describe("Memory Controls E2E", () => {
  test.describe.configure({ mode: "serial" });

  test("presence, geometry, alignment, and screenshot (viewport A)", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    const mAdd = page.getByRole("button", { name: "Memory Add" });
    const mSub = page.getByRole("button", { name: "Memory Subtract" });
    const mRec = page.getByRole("button", { name: "Memory Recall" });

    await expect(mAdd).toBeVisible();
    await expect(mSub).toBeVisible();
    await expect(mRec).toBeVisible();
    await expect(mAdd).toHaveText("m+");
    await expect(mSub).toHaveText("m-");
    await expect(mRec).toHaveText("mr");
    await expect(key(page, "memory-add")).toBeVisible();
    await expect(key(page, "memory-subtract")).toBeVisible();
    await expect(key(page, "memory-recall")).toBeVisible();

    const win = page.locator(".calculator-window");
    const winBox = await box(win);
    nearly(winBox.width, 456);
    nearly(winBox.height, 912);

    for (const btn of [mAdd, mSub, mRec]) {
      const b = await box(btn);
      nearly(b.width, 80);
      nearly(b.height, 80);
      const radius = await btn.evaluate((el) => getComputedStyle(el).borderRadius);
      expect(radius === "40px" || radius === "50%").toBeTruthy();
    }

    const addBox = await box(mAdd);
    const subBox = await box(mSub);
    const recBox = await box(mRec);
    nearly(subBox.x - (addBox.x + addBox.width), 28);
    nearly(recBox.x - (subBox.x + subBox.width), 28);
    expect(addBox.x).toBeLessThan(subBox.x);
    expect(subBox.x).toBeLessThan(recBox.x);

    const displayBottom = (await box(page.getByLabel("Display"))).y +
      (await box(page.getByLabel("Display"))).height;
    const memoryTop = (await box(page.getByLabel("Memory Controls"))).y;
    const memoryBottom =
      (await box(page.getByLabel("Memory Controls"))).y +
      (await box(page.getByLabel("Memory Controls"))).height;
    const keypadTop = (await box(page.getByLabel("Teclado"))).y;
    expect(memoryTop).toBeGreaterThanOrEqual(displayBottom - 1);
    expect(keypadTop).toBeGreaterThanOrEqual(memoryBottom - 1);

    // Centers align with first three keypad columns (7, 8, 9).
    const col7 = await box(key(page, "digit-7"));
    const col8 = await box(key(page, "digit-8"));
    const col9 = await box(key(page, "digit-9"));
    const center = (b: { x: number; width: number }) => b.x + b.width / 2;
    nearly(center(addBox), center(col7), 2);
    nearly(center(subBox), center(col8), 2);
    nearly(center(recBox), center(col9), 2);

    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    consoleGuard.assertClean();
  });

  test("A: 8 m+ AC mr → 8", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigit(page, "8");
    await key(page, "memory-add").click();
    await tapOp(page, "ac");
    await key(page, "memory-recall").click();

    await expect(result(page)).toHaveText("8");
    consoleGuard.assertClean();
  });

  test("B: 8 m+ AC 2 m+ AC mr → 10", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigit(page, "8");
    await key(page, "memory-add").click();
    await tapOp(page, "ac");
    await tapDigit(page, "2");
    await key(page, "memory-add").click();
    await tapOp(page, "ac");
    await key(page, "memory-recall").click();

    await expect(result(page)).toHaveText("10");
    consoleGuard.assertClean();
  });

  test("C: 10 m+ AC 4 m- AC mr → 6", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigits(page, "10");
    await key(page, "memory-add").click();
    await tapOp(page, "ac");
    await tapDigit(page, "4");
    await key(page, "memory-subtract").click();
    await tapOp(page, "ac");
    await key(page, "memory-recall").click();

    await expect(result(page)).toHaveText("6");
    consoleGuard.assertClean();
  });

  test("D: 5 m+ AC 8 + mr = → 13", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigit(page, "5");
    await key(page, "memory-add").click();
    await tapOp(page, "ac");
    await tapDigit(page, "8");
    await tapOp(page, "add");
    await key(page, "memory-recall").click();
    await tapOp(page, "equals");

    await expect(result(page)).toHaveText("13");
    await expect(expression(page)).toHaveText("8+5");
    consoleGuard.assertClean();
  });

  test("E: 9 m+ AC AC AC mr → 9", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigit(page, "9");
    await key(page, "memory-add").click();
    await tapOp(page, "ac");
    await tapOp(page, "ac");
    await tapOp(page, "ac");
    await key(page, "memory-recall").click();

    await expect(result(page)).toHaveText("9");
    consoleGuard.assertClean();
  });

  test("F: Backspace progressive 8+8 → 8+ → 8 → 0", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigit(page, "8");
    await tapOp(page, "add");
    await tapDigit(page, "8");

    await tapOp(page, "backspace");
    await expect(expression(page)).toHaveText("8+");
    await expect(result(page)).toHaveText("8");

    await tapOp(page, "backspace");
    await expect(expression(page)).toHaveText("");
    await expect(result(page)).toHaveText("8");

    await tapOp(page, "backspace");
    await expect(result(page)).toHaveText("0");
    consoleGuard.assertClean();
  });

  test("G: 100 + 15 % = → 115", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigits(page, "100");
    await tapOp(page, "add");
    await tapDigits(page, "15");
    await tapOp(page, "percent");
    await tapOp(page, "equals");

    await expect(result(page)).toHaveText("115");
    consoleGuard.assertClean();
  });

  test("H: 427 + 379 = → 806", async ({ page }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 1200, height: 1100 });
    await openCalculator(page);

    await tapDigits(page, "427");
    await tapOp(page, "add");
    await tapDigits(page, "379");
    await tapOp(page, "equals");

    await expect(result(page)).toHaveText("806");
    consoleGuard.assertClean();
  });

  test("viewport B: short height keeps 456×912 and scroll reaches equals", async ({
    page,
  }) => {
    const consoleGuard = attachConsoleGuard(page);
    await page.setViewportSize({ width: 800, height: 680 });
    await openCalculator(page);

    const win = page.locator(".calculator-window");
    const winBox = await box(win);
    nearly(winBox.width, 456);
    nearly(winBox.height, 912);

    const overflowY = await page.evaluate(() => {
      const doc = document.documentElement;
      const body = document.body;
      return {
        scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
        clientHeight: doc.clientHeight,
        bodyOverflowY: getComputedStyle(body).overflowY,
      };
    });
    expect(overflowY.scrollHeight).toBeGreaterThan(overflowY.clientHeight);
    expect(["auto", "scroll", "overlay"]).toContain(overflowY.bodyOverflowY);

    const equals = key(page, "equals");
    await equals.scrollIntoViewIfNeeded();
    await expect(equals).toBeVisible();
    await equals.click();

    // "=" alone is a no-op from fresh state; proves clickability after scroll.
    await expect(result(page)).toHaveText("0");

    await tapDigits(page, "12");
    await tapOp(page, "add");
    await tapDigit(page, "3");
    await equals.scrollIntoViewIfNeeded();
    await equals.click();
    await expect(result(page)).toHaveText("15");

    consoleGuard.assertClean();
  });
});
