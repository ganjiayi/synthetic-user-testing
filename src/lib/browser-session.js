/**
 * Browser session for testing interactive prototypes (e.g. Claude Design HTML
 * exports) with Playwright. Used when a study's artefact is flagged
 * (plan.study_context.artefact_config.artefact_type === 'interactive_prototype')
 * rather than a static screenshot.
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
 *
 * Returns a structured result distinguishing why a click did or didn't
 * register a page change, since "nothing happened" can mean three very
 * different things: the element was never found, the click itself errored
 * (timeout, detached node), or the click landed but the element has no
 * handler wired to it (e.g. a decorative CTA in a static mockup).
 *
 * @returns {{ found: boolean, clicked: boolean, changed: boolean, reason: 'not_found'|'click_error'|'no_change'|'changed', error?: string }}
 */
async function executeClick(page, description) {
  if (!description) return { found: false, clicked: false, changed: false, reason: 'not_found' };
  const before = await fingerprint(page);

  let locator = null;
  try {
    const byText = page.getByText(description, { exact: false }).first();
    if (await byText.count() > 0) {
      locator = byText;
    } else {
      const safe = description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const byButton = page.getByRole('button', { name: new RegExp(safe, 'i') }).first();
      if (await byButton.count() > 0) {
        locator = byButton;
      } else {
        const byLink = page.getByRole('link', { name: new RegExp(safe, 'i') }).first();
        if (await byLink.count() > 0) locator = byLink;
      }
    }
  } catch (err) {
    return { found: false, clicked: false, changed: false, reason: 'click_error', error: err.message };
  }

  if (!locator) {
    return { found: true, clicked: false, changed: false, reason: 'not_found' };
  }

  try {
    await locator.click({ timeout: 3000 });
  } catch (err) {
    return { found: true, clicked: false, changed: false, reason: 'click_error', error: err.message };
  }

  await page.waitForTimeout(600); // allow transition/animation to settle
  const after = await fingerprint(page);
  const changed = before !== after;
  return { found: true, clicked: true, changed, reason: changed ? 'changed' : 'no_change' };
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
