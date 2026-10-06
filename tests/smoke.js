'use strict';
// Browser smoke tests (needs Playwright + Chromium: npm i, npx playwright install chromium).
const assert = require('assert');
const { chromium } = require('playwright');
const { createServer } = require('../scripts/serve.js');

const WIDTHS = [1440, 1280, 1024, 950, 768, 430, 390, 375, 350];
const FONT_HOSTS = /fonts\.(googleapis|gstatic)\.com/;
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); passed++; };

async function open(browser, url, viewport, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  const page = await context.newPage();
  const problems = [];
  const requests = [];
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) problems.push(`console ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));
  await page.route(FONT_HOSTS, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' })); // offline: fallback fonts apply
  page.on('request', r => { if (!FONT_HOSTS.test(r.url())) requests.push(`${r.method()} ${r.url()}`); });
  await page.goto(url, { waitUntil: 'load' });
  return { context, page, problems, requests };
}

(async () => {
  const server = createServer();
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    // 1. Overflow at every width, console clean, only local same-origin requests.
    for (const width of WIDTHS) {
      const { context, page, problems, requests } = await open(browser, url, { width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      eq(overflow, 0, `horizontal overflow at ${width}px`);
      eq(problems, [], `console problems at ${width}px`);
      ok(requests.every(r => r.startsWith('GET ' + url)), `non-local request at ${width}px: ${requests}`);
      await context.close();
    }

    // 2. Service preselection from every CTA (desktop).
    {
      const { context, page } = await open(browser, url, { width: 1280, height: 900 });
      const cases = [
        ['.service-quote', 'Boilers'], ['.service h3 a[data-service="Central heating"]', 'Central heating'],
        ['.service h3 a[data-service="Gas appliances"]', 'Gas appliances'], ['.service h3 a[data-service="Plumbing"]', 'Plumbing'],
        ['#availability', 'Location availability'], ['.gas-copy .button', 'Gas appliances']
      ];
      for (const [selector, expected] of cases) {
        await page.selectOption('#service', '');
        await page.click(selector);
        eq(await page.inputValue('#service'), expected, `preselect via ${selector}`);
      }
      await context.close();
    }

    // 3. Form: validation, focus, demo-only behaviour (nothing sent, stored or kept).
    {
      const { context, page, problems, requests } = await open(browser, url, { width: 1280, height: 900 });
      await page.click('.quote-form [type=submit]');
      eq(await page.evaluate(() => document.activeElement.id), 'name', 'first invalid field focused');
      eq(await page.locator('[aria-invalid="true"]').count(), 4, 'four required fields flagged');
      ok((await page.textContent('.form-status')).includes('4 fields'), 'error status message');
      await page.fill('#name', 'Test'); await page.fill('#phone', 'abc'); await page.fill('#email', 'nope');
      await page.selectOption('#service', 'Plumbing'); await page.fill('#message', 'Leak');
      await page.click('.quote-form [type=submit]');
      eq(await page.evaluate(() => document.activeElement.id), 'phone', 'invalid phone focused');
      ok((await page.textContent('#phone-error')).includes('valid phone'), 'phone message');
      await page.fill('#phone', '07403 556650');
      await page.click('.quote-form [type=submit]');
      eq(await page.evaluate(() => document.activeElement.id), 'email', 'invalid email focused');
      await page.fill('#email', '');
      await page.click('.quote-form [type=submit]');
      ok((await page.textContent('.form-status')).includes('has not been sent'), 'demo success says nothing was sent');
      eq(await page.locator('[aria-invalid="true"]').count(), 0, 'no invalid fields after success');
      eq(await page.evaluate(() => [localStorage.length, sessionStorage.length, document.cookie]), [0, 0, ''], 'no storage written');
      eq(requests.filter(r => !r.startsWith('GET ' + url)), [], 'form made no non-local or non-GET request');
      eq(problems, [], 'console clean through form use');
      await context.close();
    }

    // 4. Mobile menu: aria state, Escape + focus restore, outside click, link navigation.
    {
      const { context, page, problems } = await open(browser, url, { width: 390, height: 844 });
      const btn = page.locator('.menu-toggle');
      eq(await btn.getAttribute('aria-expanded'), 'false');
      await btn.click();
      eq(await btn.getAttribute('aria-expanded'), 'true');
      ok(await page.locator('#mobile-menu').isVisible(), 'menu visible');
      await page.keyboard.press('Escape');
      ok(!(await page.locator('#mobile-menu').isVisible()), 'Escape closes menu');
      eq(await page.evaluate(() => document.activeElement.className), 'menu-toggle', 'focus restored to toggle');
      await btn.click();
      await page.mouse.click(200, 600);
      ok(!(await page.locator('#mobile-menu').isVisible()), 'outside click closes menu');
      await btn.click();
      await page.click('#mobile-menu a[href="#faq"]');
      ok(!(await page.locator('#mobile-menu').isVisible()), 'link closes menu');
      eq(await page.evaluate(() => document.activeElement.id), 'faq', 'target focused after menu link');
      eq(problems, []);
      await context.close();
    }

    // 5. Privacy dialog: open, Escape, close buttons, backdrop, focus restoration.
    {
      const { context, page, problems } = await open(browser, url, { width: 390, height: 700 });
      const opener = page.locator('.privacy-link');
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      ok(await page.locator('#privacy').evaluate(d => d.open), 'dialog opens');
      await page.keyboard.press('Escape');
      ok(!(await page.locator('#privacy').evaluate(d => d.open)), 'Escape closes dialog');
      eq(await page.evaluate(() => document.activeElement.className), 'privacy-link', 'focus restored (Escape)');
      await opener.click(); await page.click('.close-dialog');
      ok(!(await page.locator('#privacy').evaluate(d => d.open)), '× closes dialog');
      await opener.click(); await page.click('.close-privacy');
      ok(!(await page.locator('#privacy').evaluate(d => d.open)), 'Close button closes dialog');
      await opener.click(); await page.mouse.click(3, 3);
      ok(!(await page.locator('#privacy').evaluate(d => d.open)), 'backdrop click closes dialog');
      const fits = await opener.click().then(() => page.locator('#privacy').evaluate(d => { const r = d.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }));
      ok(fits, 'dialog fits small viewport');
      eq(problems, []);
      await context.close();
    }

    // 6. Mobile fixed bar vs. focused form fields.
    {
      const { context, page } = await open(browser, url, { width: 390, height: 844 }, { reducedMotion: 'reduce' }); // instant scroll
      const bar = page.locator('.mobile-actions');
      eq(await bar.evaluate(e => getComputedStyle(e).position), 'fixed', 'bar fixed on mobile');
      ok((await bar.boundingBox()).height >= 56, 'bar touch target height');
      for (const id of ['name', 'phone', 'email', 'service', 'message']) {
        await page.focus('#' + id);
        await page.waitForTimeout(150);
        const gap = await page.evaluate(i => document.getElementById(i).getBoundingClientRect().bottom, id);
        const barTop = (await bar.boundingBox()).y;
        ok(gap <= barTop + 0.5, `#${id} bottom (${Math.round(gap)}) hidden behind bar (${Math.round(barTop)})`);
      }
      await context.close();
      const short = await open(browser, url, { width: 390, height: 420 });
      eq(await short.page.locator('.mobile-actions').evaluate(e => getComputedStyle(e).position), 'static', 'bar released on short viewport');
      await short.context.close();
    }

    // 7. Reduced motion respected.
    {
      const { context, page } = await open(browser, url, { width: 1280, height: 900 }, { reducedMotion: 'reduce' });
      eq(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
      await context.close();
    }
    console.log(`smoke: OK (${passed} assertions)`);
  } catch (error) {
    console.error('smoke: FAILED\n' + error.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
