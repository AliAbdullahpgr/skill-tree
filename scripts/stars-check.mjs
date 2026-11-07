import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';

const base = process.env.TEST_URL || 'http://127.0.0.1:3091';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const definitions = JSON.parse(readFileSync(new URL('../src/lib/skills.json', import.meta.url), 'utf8'));
const topics = JSON.parse(readFileSync(new URL('../src/lib/roadmap-content.json', import.meta.url), 'utf8')).topics;
const errors = [];
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')));
const find = async (page, name) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open skill search' }).click();
  await page.getByRole('textbox', { name: 'Find a skill' }).fill(name);
  await page.locator('.search-results>button').filter({ hasText: name }).first().click();
  await page.locator('.inspector-hero h2').filter({ hasText: name }).waitFor();
};
const capture = async (page, name) => {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode().catch(() => {}))); });
  await page.screenshot({ path: `.artifacts/stars/${name}.png`, fullPage: true });
};
mkdirSync('.artifacts/stars', { recursive: true });

try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: width === 1440 ? 900 : 844 }, isMobile: width < 700, hasTouch: width < 700, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base); await page.waitForSelector('.react-flow__node');
    await find(page, 'HTML');
    assert.equal(await page.getByRole('radio').count(), 5);
    const stars = await page.locator('.star-rating').boundingBox(), body = await page.locator('.inspector-body').boundingBox();
    assert.ok(stars.x >= body.x && stars.x + stars.width <= body.x + body.width);
    assert.ok(stars.y >= body.y && stars.y + stars.height <= body.y + body.height);
    assert.equal(await page.getByRole('radio', { name: /^4 stars/ }).getAttribute('aria-checked'), 'true');
    // Hover previews are transient and must not write a rating.
    if (width === 1440) {
      await page.getByRole('radio', { name: /^2 stars/ }).hover();
      assert.equal(await page.locator('.star-rating .filled').count(), 2);
      assert.equal((await saved(page)).levels.html, 4);
    }
    await page.getByRole('radio', { name: /^3 stars/ }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')).levels.html === 3);
    assert.equal(await page.locator('.star-rating .filled').count(), 3);
    assert.match(await page.locator('.proficiency-description').innerText(), /independently/);
    await capture(page, `${width}-three-stars`);
    await page.reload(); await page.waitForSelector('.react-flow__node'); await find(page, 'HTML');
    assert.equal(await page.getByRole('radio', { name: /^3 stars/ }).getAttribute('aria-checked'), 'true');
    await page.getByRole('radio', { name: /^3 stars/ }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('radio', { name: /^4 stars/ }).getAttribute('aria-checked'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('radio', { name: /^5 stars/ }).getAttribute('aria-checked'), 'true');
    await capture(page, `${width}-five-stars`);
    await page.getByRole('button', { name: 'Clear proficiency rating' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')).levels.html === 0);
    assert.equal(await page.getByRole('radio', { checked: true }).count(), 0);
    assert.equal(await page.locator('.star-rating .filled').count(), 0);
    assert.equal((await saved(page)).levels.react, 2, 'resealing must preserve descendant ratings');
    await capture(page, `${width}-unrated`);
    await find(page, 'Complexity');
    assert.equal(await page.getByRole('radio').count(), 0, 'locked skills cannot be rated');
    assert.equal(await page.locator('.roadmap-description').innerText(), topics.complexity.description);
    assert.deepEqual(await page.locator('.roadmap-links a').evaluateAll(links => links.map(link => link.getAttribute('href'))), topics.complexity.resources.map(resource => resource.url));
    assert.match(await page.locator('.unlock-requirements').innerText(), /You 1\/5/);
    await capture(page, `${width}-prerequisite`);
    assert.equal(await page.locator('.inspector').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    assert.equal((await saved(page)).ratingScale, 5);
    await page.close();
    console.log(`PASS ${width}px: five whole stars, preview, autosave, keyboard, clear, persistence, locks, preserved roadmap content.`);
  }

  for (const key of ['skillweave-progress-v1', 'arcana-progress-v1']) {
    const legacy = { version: 1, levels: { ...Object.fromEntries(definitions.map(skill => [skill.id, skill.initialLevel])), react: 5, typescript: 3, nextjs: 4 }, history: [{ name: 'React', from: 4, to: 5, at: '2026-11-01T12:00:00Z' }], goalId: 'frontend', theme: 'moonstone', sample: false };
    const page = await browser.newPage();
    await page.addInitScript(({ key, legacy }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(legacy)); }, { key, legacy });
    await page.goto(base); await page.waitForSelector('.react-flow__node');
    await page.waitForFunction(() => localStorage.getItem('skillweave-progress-v2'));
    const migrated = await saved(page);
    assert.equal(migrated.levels.react, 3); assert.equal(migrated.levels.nextjs, 2);
    assert.equal(migrated.history[0].from, 2); assert.equal(migrated.history[0].to, 3);
    assert.equal(migrated.theme, 'moonstone'); assert.equal(migrated.goalId, 'frontend');
    await find(page, 'Next.js'); assert.equal(await page.getByRole('radio').count(), 5);
    await page.reload(); await page.waitForSelector('.react-flow__node');
    assert.deepEqual(await saved(page), migrated, 'migration must run only once');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export backup' }).click();
    const backup = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
    assert.equal(backup.version, 2); assert.equal(backup.ratingScale, 5);
    assert.equal(backup.levels.react, 3);
    await page.close();
    console.log(`PASS ${key}: progress/history/theme/goal migration, retained unlock, idempotent reload, version-2 export.`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
