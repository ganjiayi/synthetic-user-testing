/**
 * Browser session for testing interactive prototypes (e.g. Claude Design HTML
 * exports) with Playwright. Used when a study's artefact is a live URL
 * (plan.study_context.artefact_config.api_mode === 'live_url') rather than a
 * static screenshot.
 *
 * Locally this drives the system-installed Chrome via playwright-core.
 * On Vercel it drives the serverless-optimised @sparticuz/chromium binary.
 */

function isServerlessEnv() {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function launchBrowser() {
  const { chromium } = require('playwright-core');

  if (isServerlessEnv()) {
    const sparticuzChromium = require('@sparticuz/chromium');
    return chromium.launch({
      args:           sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless:       true,
    });
  }

  return chromium.launch({ channel: 'chrome', headless: true });
}

async function openSession(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  return { browser, page };
}

async function screenshot(page) {
  const buf = await page.screenshot({ type: 'png' });
  return { b64: buf.toString('base64'), mediaType: 'image/png' };
}

async function fingerprint(page) {
  const bodyLength = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
  return `${page.url()}::${bodyLength}`;
}

/**
 * Attempts to click an element matching a plain-English description.
 * Returns true if the page state changed afterwards (URL or visible text),
 * which is the signal that the click actually landed on something.
 */
async function executeClick(page, description) {
  if (!description) return false;
  const before = await fingerprint(page);

  try {
    const byText = page.getByText(description, { exact: false }).first();
    if (await byText.count() > 0) {
      await byText.click({ timeout: 3000 });
    } else {
      const safe = description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await page.getByRole('button', { name: new RegExp(safe, 'i') }).first()
        .click({ timeout: 3000 })
        .catch(() => page.getByRole('link', { name: new RegExp(safe, 'i') }).first().click({ timeout: 3000 }));
    }
  } catch {
    return false;
  }

  await page.waitForTimeout(600); // allow transition/animation to settle
  const after = await fingerprint(page);
  return before !== after;
}

async function executeScroll(page, direction) {
  const delta = direction === 'up' ? -600 : 600;
  await page.mouse.wheel(0, delta);
  await page.waitForTimeout(300);
}

async function closeSession(session) {
  if (session?.browser) {
    await session.browser.close().catch(() => {});
  }
}

module.exports = {
  openSession,
  screenshot,
  executeClick,
  executeScroll,
  closeSession,
};
