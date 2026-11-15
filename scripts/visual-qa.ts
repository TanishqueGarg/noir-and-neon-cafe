import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";

const baseUrl = process.env.VISUAL_QA_BASE_URL || "http://localhost:3000";
const outputDir = path.join(process.cwd(), "docs", "visual-qa");
const screenshotsDir = path.join(outputDir, "screenshots");
let activeBrowser: Browser | undefined;

const viewports = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet-landscape", width: 1024, height: 768 },
  { name: "tablet-portrait", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
] as const;

const routes = [
  "/",
  "/menu",
  "/menu/midnight-cortado",
  "/order",
  "/reservations",
  "/about",
  "/gallery",
  "/contact",
  "/privacy",
  "/terms",
  "/admin/login",
] as const;

const screenshotCases = [
  { name: "home-desktop", route: "/", viewport: viewports[0] },
  { name: "home-mobile", route: "/", viewport: viewports[4] },
  { name: "menu-desktop", route: "/menu", viewport: viewports[0] },
  { name: "menu-mobile", route: "/menu", viewport: viewports[4] },
  {
    name: "reservations-desktop",
    route: "/reservations",
    viewport: viewports[1],
  },
  { name: "order-checkout", route: "/order", viewport: viewports[1] },
  { name: "about-desktop", route: "/about", viewport: viewports[0] },
  { name: "gallery-desktop", route: "/gallery", viewport: viewports[0] },
  { name: "contact-desktop", route: "/contact", viewport: viewports[1] },
  { name: "admin-login-desktop", route: "/admin/login", viewport: viewports[1] },
] as const;

type StyleSnapshot = {
  selector: string;
  backgroundColor: string;
  color: string;
  display: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  position: string;
  textDecoration: string;
};

type QaResult = {
  generatedAt: string;
  baseUrl: string;
  cssResponses: Array<{ url: string; status: number; contentType: string }>;
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  computedStyles: Record<string, StyleSnapshot | null>;
  responsiveChecks: Array<{
    route: string;
    viewport: string;
    status: number | null;
    horizontalOverflow: number;
    bodyBackground: string;
    fontFamily: string;
  }>;
  screenshots: string[];
  assertions: Array<{ name: string; passed: boolean; detail: string }>;
};

async function goto(page: Page, route: string) {
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  await page.locator("body").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return response;
}

async function revealFullPage(page: Page) {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = "auto";
    const distance = Math.max(320, Math.floor(window.innerHeight * 0.75));
    for (let top = 0; top < document.documentElement.scrollHeight; top += distance) {
      window.scrollTo({ top, behavior: "auto" });
      await new Promise((resolve) => window.setTimeout(resolve, 70));
    }
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every(
      (image) => !image.currentSrc || (image.complete && image.naturalWidth > 0),
    ),
  ).catch(() => undefined);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.waitForTimeout(250);
}

async function seedCart(page: Page) {
  const alreadySeeded = await page.evaluate(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("noir-neon-cart") || "null");
      return Boolean(cart?.state?.items?.length);
    } catch {
      return false;
    }
  });
  if (alreadySeeded) return;
  await goto(page, "/menu");
  await page.waitForFunction(
    () => localStorage.getItem("noir-neon-cart") !== null,
  );
  const addButton = page.locator('button[aria-label^="Add "]').first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await addButton.click();
    const persisted = await page
      .waitForFunction(
        () => {
          try {
            const cart = JSON.parse(
              localStorage.getItem("noir-neon-cart") || "null",
            );
            return Boolean(cart?.state?.items?.length);
          } catch {
            return false;
          }
        },
        undefined,
        { timeout: 2_500 },
      )
      .then(() => true)
      .catch(() => false);
    if (persisted) break;
    await page.waitForTimeout(500);
  }
  const persisted = await page.evaluate(() => {
    try {
      const cart = JSON.parse(localStorage.getItem("noir-neon-cart") || "null");
      return Boolean(cart?.state?.items?.length);
    } catch {
      return false;
    }
  });
  if (!persisted) throw new Error("Cart did not persist after three hydrated clicks.");
  await page.keyboard.press("Escape");
}

async function styleFor(page: Page, selector: string) {
  return page.evaluate((targetSelector) => {
    const element = document.querySelector(targetSelector);
    if (!element) return null;
    const style = getComputedStyle(element);
    return {
      selector: targetSelector,
      backgroundColor: style.backgroundColor,
      color: style.color,
      display: style.display,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      position: style.position,
      textDecoration: style.textDecoration,
    } satisfies StyleSnapshot;
  }, selector);
}

async function main() {
await mkdir(screenshotsDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
activeBrowser = browser;
const context = await browser.newContext({
  colorScheme: "dark",
  reducedMotion: "no-preference",
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);

const result: QaResult = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  cssResponses: [],
  consoleErrors: [],
  pageErrors: [],
  requestFailures: [],
  computedStyles: {},
  responsiveChecks: [],
  screenshots: [],
  assertions: [],
};

page.on("response", (response) => {
  if (response.url().includes("/_next/static/css/")) {
    const entry = {
      url: response.url(),
      status: response.status(),
      contentType: response.headers()["content-type"] || "",
    };
    if (!result.cssResponses.some((item) => item.url === entry.url)) {
      result.cssResponses.push(entry);
    }
  }
});
page.on("console", (message) => {
  if (message.type() === "error") result.consoleErrors.push(message.text());
});
page.on("pageerror", (error) => result.pageErrors.push(error.message));
page.on("requestfailed", (request) => {
  result.requestFailures.push(
    `${request.method()} ${request.url()} — ${request.failure()?.errorText || "failed"}`,
  );
});

await page.setViewportSize(viewports[0]);
await goto(page, "/");
result.computedStyles.body = await styleFor(page, "body");
result.computedStyles.navigation = await styleFor(page, "header");
result.computedStyles.heading = await styleFor(page, "h1");
result.computedStyles.primaryCta = await styleFor(
  page,
  'main section:first-of-type a[href="/menu"]',
);
result.computedStyles.footer = await styleFor(page, "footer");

await goto(page, "/menu");
result.computedStyles.productCard = await styleFor(page, "article");

await goto(page, "/contact");
result.computedStyles.formInput = await styleFor(page, "input");

await page.emulateMedia({ reducedMotion: "reduce" });
for (const testCase of screenshotCases) {
  await page.setViewportSize(testCase.viewport);
  if (testCase.route === "/order") {
    await seedCart(page);
  }
  await goto(page, testCase.route);
  if (testCase.route === "/order") {
    await page.getByRole("heading", { name: "Order summary" }).waitFor();
  }
  await revealFullPage(page);
  const screenshotPath = path.join(
    screenshotsDir,
    `${testCase.name}.png`,
  );
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
  });
  result.screenshots.push(path.relative(process.cwd(), screenshotPath));
}
await page.emulateMedia({ reducedMotion: "no-preference" });

for (const viewport of viewports) {
  await page.setViewportSize(viewport);
  for (const route of routes) {
    if (route === "/order") await seedCart(page);
    const response = await goto(page, route);
    await revealFullPage(page);
    const metrics = await page.evaluate(() => {
      const bodyStyle = getComputedStyle(document.body);
      return {
        overflow: Math.max(
          0,
          document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
        bodyBackground: bodyStyle.backgroundColor,
        fontFamily: bodyStyle.fontFamily,
      };
    });
    result.responsiveChecks.push({
      route,
      viewport: viewport.name,
      status: response?.status() ?? null,
      horizontalOverflow: metrics.overflow,
      bodyBackground: metrics.bodyBackground,
      fontFamily: metrics.fontFamily,
    });
  }
}

await page.setViewportSize(viewports[0]);
await goto(page, "/admin");
const unauthorizedAdminRedirected = new URL(page.url()).pathname === "/admin/login";

const body = result.computedStyles.body;
const heading = result.computedStyles.heading;
const navigation = result.computedStyles.navigation;
const primaryCta = result.computedStyles.primaryCta;
const productCard = result.computedStyles.productCard;
const footer = result.computedStyles.footer;
const formInput = result.computedStyles.formInput;

result.assertions.push(
  {
    name: "Stylesheet assets loaded",
    passed:
      result.cssResponses.length > 0 &&
      result.cssResponses.every(
        (item) => item.status === 200 && item.contentType.includes("text/css"),
      ),
    detail: JSON.stringify(result.cssResponses),
  },
  {
    name: "Body uses midnight background",
    passed: body?.backgroundColor === "rgb(8, 10, 15)",
    detail: body?.backgroundColor || "missing",
  },
  {
    name: "Custom body font is active",
    passed:
      Boolean(body?.fontFamily) &&
      !/times new roman|(^|,)\s*serif(\s|,|$)/i.test(body?.fontFamily || ""),
    detail: body?.fontFamily || "missing",
  },
  {
    name: "Editorial heading font is active",
    passed:
      Boolean(heading?.fontFamily) &&
      !/times new roman|(^|,)\s*serif(\s|,|$)/i.test(
        heading?.fontFamily || "",
      ) &&
      Number.parseFloat(heading?.fontSize || "0") >= 48,
    detail: `${heading?.fontFamily || "missing"} / ${heading?.fontSize || "missing"}`,
  },
  {
    name: "Navigation is custom fixed header",
    passed:
      navigation?.position === "fixed" &&
      navigation.backgroundColor !== "rgba(0, 0, 0, 0)",
    detail: `${navigation?.position || "missing"} / ${navigation?.backgroundColor || "missing"}`,
  },
  {
    name: "Primary CTA is styled",
    passed:
      Boolean(primaryCta) &&
      primaryCta?.backgroundColor !== "rgba(0, 0, 0, 0)" &&
      !primaryCta?.textDecoration.includes("underline"),
    detail: JSON.stringify(primaryCta),
  },
  {
    name: "Product card has dark surface",
    passed:
      Boolean(productCard) &&
      ["rgb(16, 20, 29)", "rgb(21, 26, 36)"].includes(
        productCard?.backgroundColor || "",
      ),
    detail: productCard?.backgroundColor || "missing",
  },
  {
    name: "Form inputs are custom styled",
    passed:
      Boolean(formInput) &&
      formInput?.backgroundColor !== "rgb(255, 255, 255)" &&
      Number.parseFloat(formInput?.fontSize || "0") > 0,
    detail: JSON.stringify(formInput),
  },
  {
    name: "Footer is dark and links inherit styling",
    passed:
      Boolean(footer) &&
      footer?.backgroundColor !== "rgb(255, 255, 255)" &&
      footer?.color !== "rgb(0, 0, 0)",
    detail: JSON.stringify(footer),
  },
  {
    name: "No horizontal overflow",
    passed: result.responsiveChecks.every(
      (check) => check.horizontalOverflow <= 1,
    ),
    detail: JSON.stringify(
      result.responsiveChecks.filter(
        (check) => check.horizontalOverflow > 1,
      ),
    ),
  },
  {
    name: "All public routes returned success",
    passed: result.responsiveChecks.every(
      (check) => check.status !== null && check.status < 400,
    ),
    detail: JSON.stringify(
      result.responsiveChecks.filter(
        (check) => check.status === null || check.status >= 400,
      ),
    ),
  },
  {
    name: "Unauthenticated admin access redirects to login",
    passed: unauthorizedAdminRedirected,
    detail: page.url(),
  },
  {
    name: "No browser page errors",
    passed: result.pageErrors.length === 0,
    detail: JSON.stringify(result.pageErrors),
  },
  {
    name: "All rendered images loaded",
    passed: result.requestFailures.every(
      (failure) => !/\.(?:png|jpe?g|webp|avif)(?:\?|\s|$)/i.test(failure),
    ),
    detail: JSON.stringify(
      result.requestFailures.filter((failure) =>
        /\.(?:png|jpe?g|webp|avif)(?:\?|\s|$)/i.test(failure),
      ),
    ),
  },
);

await writeFile(
  path.join(outputDir, "results.json"),
  JSON.stringify(result, null, 2),
  "utf8",
);
await browser.close();
activeBrowser = undefined;

for (const assertion of result.assertions) {
  console.log(`${assertion.passed ? "PASS" : "FAIL"}  ${assertion.name}`);
  if (!assertion.passed) console.log(`      ${assertion.detail}`);
}
console.log(
  `\nCaptured ${result.screenshots.length} screenshots and audited ${result.responsiveChecks.length} route/viewport combinations.`,
);
if (result.assertions.some((assertion) => !assertion.passed)) {
  process.exitCode = 1;
}
}

main().catch(async (error) => {
  await activeBrowser?.close().catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
});
