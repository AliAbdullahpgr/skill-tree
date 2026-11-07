import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';

// Run against the static export to verify the audited mobile and desktop stories.
const roadmapContent = JSON.parse(readFileSync(new URL('../src/lib/roadmap-content.json', import.meta.url), 'utf8')).topics;
const base = process.env.TEST_URL || 'http://127.0.0.1:3091';
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
const errors = [];
mkdirSync('.artifacts/ux-fixed', { recursive: true });
const screenshot = async (page, name) => {
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  return page.screenshot({ path: `.artifacts/ux-fixed/${name}.png`, fullPage: true });
};
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')));
const find = async (page, name) => {
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open skill search' }).click();
  await page.getByRole('textbox', { name: 'Find a skill' }).fill(name);
  await page.locator('.search-results>button').filter({ hasText: name }).first().click();
  await page.locator('.inspector-hero h2').filter({ hasText: name }).waitFor();
};
const dismiss = async page => { if (await page.getByRole('button', { name: 'Dismiss notification' }).isVisible()) await page.getByRole('button', { name: 'Dismiss notification' }).click(); };
const upload = (page, data) => page.locator('input[type=file]').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const mobile = viewport.width < 700;
    const prefix = mobile ? 'mobile' : 'desktop';
    const page = await browser.newPage({ viewport, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.waitForSelector('.react-flow__node');
    await page.waitForFunction(() => localStorage.getItem('skillweave-progress-v2'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // Demo data is flagged once, in the header; no banners elsewhere.
    assert.match(await page.locator('.demo-chip').innerText(), /demo data/i);
    assert.equal(await page.locator('.sample-banner,.search-demo,.inspector-demo-tag,.chronicle-note').count(), 0);
    assert.match(await page.locator('.progress-summary').innerText(), /15.*227.*rated/s);
    for (const label of ['Skills', 'History', 'Settings']) assert.equal(await page.locator('.tool-label').getByText(label, { exact: true }).isVisible(), true);
    const flow = await page.locator('.react-flow').boundingBox(), goal = await page.locator('.goal-control').boundingBox();
    assert.ok(flow.y + flow.height <= goal.y, 'goal control must not overlap the interactive board');
    await screenshot(page, `${prefix}-landing`);

    await page.getByRole('button', { name: 'Choose realm or branch' }).click();
    assert.equal(await page.locator('.branch-shortcuts button[aria-pressed=true]').innerText(), 'Frontend');
    assert.equal(await page.locator('.realm-menu').evaluate(e => getComputedStyle(e).backgroundColor.includes('0.')), false);
    await screenshot(page, `${prefix}-realm-menu`);
    await page.getByRole('button', { name: 'Close realm menu' }).click();
    assert.equal(await page.locator('.realm-menu').count(), 0);
    for (const branch of ['Frontend', 'Backend', 'Databases', 'System Design', 'AI', 'DSA', 'DevOps', 'Security', 'Testing', 'Mobile']) {
      await page.getByRole('button', { name: 'Choose realm or branch' }).click();
      await page.locator('.branch-shortcuts').getByRole('button', { name: branch, exact: true }).click();
      assert.match(await page.locator('.realm-trigger').innerText(), new RegExp(branch));
      assert.ok(parseInt(await page.locator('.canvas-controls>span').innerText()) >= (mobile ? 50 : 42));
    }
    await page.getByRole('button', { name: 'Choose realm or branch' }).click();
    await page.locator('.realm-menu').getByRole('button', { name: 'Personal Skills', exact: true }).click();
    assert.equal(await page.locator('[data-id=communication] .node-caption').isVisible(), true);
    await screenshot(page, `${prefix}-personal-realm`);

    await page.keyboard.press('/');
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Find a skill');
    assert.equal(await page.getByRole('textbox', { name: 'Find a skill' }).evaluate(e => e === document.activeElement), true);
    await page.getByRole('textbox', { name: 'Find a skill' }).fill('zzzz');
    assert.match(await page.locator('.search-results').innerText(), /0 results.*No skills match.*Try a skill or branch name/s);
    assert.doesNotMatch(await page.locator('.search-results').innerText(), /Demo profile/);
    await screenshot(page, `${prefix}-search-empty`);
    await page.getByRole('button', { name: 'clear search', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Find a skill' }).inputValue(), '');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Skills', exact: true }).click();
    assert.equal(await page.locator('.goal-control').count(), 0);
    assert.match(await page.locator('.codex-count').innerText(), /227 matches/);
    assert.match(await page.locator('.library-heading').innerText(), /Skill library.*227 skills/s);
    await page.getByRole('textbox', { name: 'Filter skills' }).fill('security');
    await page.getByRole('button', { name: 'Locked', exact: true }).click();
    assert.match(await page.locator('.codex-grid').first().textContent(), /Locked · needs .+ at \d stars? \(now \d stars?\)/);
    await screenshot(page, `${prefix}-codex-locked`);
    await page.getByRole('textbox', { name: 'Filter skills' }).fill('zzzz');
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    assert.match(await page.locator('.codex-count').innerText(), /227 matches/);
    await page.getByRole('textbox', { name: 'Filter skills' }).fill('Docker');
    assert.match(await page.locator('.codex-grid').textContent(), /Saved 1 star preserved/); // rows use content-visibility, so read text content
    await page.getByRole('button', { name: 'Clear skill filter' }).click();
    await page.getByRole('button', { name: 'History', exact: true }).click();
    assert.match(await page.locator('.library-heading h1').innerText(), /Demo history/);
    assert.equal(await page.locator('.sample-tag').count(), 4);
    assert.equal(await page.locator('.chronicle-list time').first().evaluate(e => getComputedStyle(e).whiteSpace), 'nowrap');
    await screenshot(page, `${prefix}-chronicle`);
    await page.keyboard.press('Escape');

    for (const name of ['Frontend Engineer', 'Backend Engineer', 'AI Engineer', 'DevOps Engineer', 'Security Engineer', 'Mobile Engineer']) {
      await page.getByRole('button', { name: 'Choose learning goal' }).click();
      assert.equal(await page.locator('.goal-suggested').count(), 1);
      await page.getByRole('button', { name: /Not sure\? Explore freely/ }).waitFor();
      const option = page.locator('.goal-option').filter({ has: page.getByText(name, { exact: true }) });
      // The suggested role has a badge nested in its strong element.
      const actual = await option.count() ? option : page.locator('.goal-option').filter({ hasText: name });
      await actual.scrollIntoViewIfNeeded();
      if (name === 'Mobile Engineer') await screenshot(page, `${prefix}-goal-menu-scrolled`);
      await actual.click();
      assert.equal(await page.locator('.goal-menu').count(), 0);
      assert.match(await page.locator('.goal-pill').innerText(), new RegExp(`${name}.*targets`, 's'));
      assert.match(await page.locator('.toast').innerText(), /goal set.*targets reached/s);
      assert.ok(parseInt(await page.locator('.canvas-controls>span').innerText()) >= (mobile ? 50 : 42));
      const toast = await page.locator('.toast').boundingBox(), area = await page.locator('.atlas-area').boundingBox();
      assert.ok(toast.y >= area.y + area.height, 'notification must occupy its own row');
      await dismiss(page);
    }
    await screenshot(page, `${prefix}-goal-selected`);
    await page.getByRole('button', { name: 'Suggested next skills', exact: true }).click();
    assert.ok(await page.locator('.next-list>li').count() > 0);
    assert.match(await page.locator('.next-level').first().innerText(), /Current \d+ stars? · (target|next unlock) \d+ stars?/);
    await screenshot(page, `${prefix}-next-steps`);
    const guide = page.getByRole('button', { name: 'Open guide', exact: true }).first();
    await guide.click();
    assert.equal(await page.locator('.goal-control').count(), 0);
    await page.locator('.roadmap-section h3').waitFor();
    await page.waitForFunction(() => document.activeElement?.matches('.roadmap-section h3'));
    const guideBox = await page.locator('.roadmap-section h3').boundingBox(), body = await page.locator('.inspector-body').boundingBox();
    assert.ok(guideBox.y >= body.y - 2 && guideBox.y < body.y + body.height);
    await screenshot(page, `${prefix}-direct-guide`);

    await find(page, 'React');
    const stars = await page.getByRole('radiogroup',{name:'Your proficiency'}).boundingBox();
    const editor = await page.locator('.inspector-body').boundingBox();
    assert.ok(stars.y >= editor.y && stars.y + stars.height <= editor.y + editor.height, 'star control must be visible without scrolling');
    assert.equal(await page.getByRole('radio').count(), 5);
    await page.getByRole('radio',{name:/^1 star /}).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')).levels.react === 1);
    assert.equal(await page.getByRole('radio',{name:/^1 star /}).getAttribute('aria-checked'), 'true');
    await page.getByRole('button',{name:'Clear proficiency rating'}).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')).levels.react === 0);
    assert.equal(await page.getByRole('radio',{checked:true}).count(), 0);
    await page.getByRole('radio',{name:/^2 stars/}).click();
    await dismiss(page);
    await screenshot(page, `${prefix}-rating-editor`);

    await find(page, 'Kubernetes');
    await page.getByText('Prerequisites', { exact: true }).waitFor();
    assert.match(await page.locator('.unlock-requirements').innerText(), /You 0\/5 · needs 2\/5/);
    assert.match(await page.locator('.locked-note').innerText(), /Locked.*Container Fundamentals.*Start with Linux/s);
    assert.equal(await page.locator('.roadmap-description').innerText(), roadmapContent.kubernetes.description);
    assert.deepEqual(await page.locator('.roadmap-links a').evaluateAll(links => links.map(link => link.getAttribute('href'))), roadmapContent.kubernetes.resources.map(resource => resource.url));
    assert.equal(await page.locator('.inspector-demo,.current-level,.inspector-save,.next-unlock').count(), 0);
    await screenshot(page, `${prefix}-locked-inspector`);
    await page.getByRole('button', { name: 'View path' }).click();
    // The card stays open on View path and the Engineering root is never part of the path.
    assert.equal(await page.locator('.inspector').count(), 1);
    assert.doesNotMatch(await page.locator('.dependency-guide').innerText(), /Engineering/);
    await page.getByRole('button', { name: 'Focus path on board' }).click();
    assert.equal(await page.locator('.inspector').count(), 0);
    await page.locator('.path-chip>button').first().click();
    assert.match(await page.locator('.path-steps').innerText(), /Linux.*Container Fundamentals/s);
    await screenshot(page, `${prefix}-path-steps`);
    await page.locator('.path-steps li button').filter({ hasText: 'Linux' }).click();
    assert.equal(await page.locator('.inspector-hero h2').innerText(), 'Linux');
    assert.match(await page.locator('.dependency-heading').innerText(), /Kubernetes/);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Legend', exact: true }).click();
    assert.equal(await page.locator('.level-legend li').count(), 5);
    assert.equal(await page.locator('.marker-legend li').count(), 10);
    await screenshot(page, `${prefix}-legend`);
    await page.getByRole('button', { name: 'How to use the board' }).click();
    assert.equal(await page.locator('.help-steps li').count(), 3);
    const help = await page.getByRole('button', { name: 'Back to the board', exact: true }).boundingBox();
    assert.ok(help.y + help.height <= viewport.height, 'help dismissal stays visible');
    await screenshot(page, `${prefix}-help`);
    await page.getByRole('button', { name: 'Back to the board', exact: true }).click();

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: /Moonstone/ }).click();
    assert.equal(await page.locator('.theme-moonstone').count(), 1);
    const sound = page.getByRole('switch', { name: 'Sound effects' });
    assert.equal(await sound.getAttribute('aria-checked'), 'false');
    await sound.click(); assert.equal(await sound.getAttribute('aria-checked'), 'true');
    await dismiss(page);
    await screenshot(page, `${prefix}-settings`);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export backup' }).click();
    const download = await downloadEvent, backup = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.equal(backup.sample, true); assert.equal(backup.theme, 'moonstone');
    const before = await saved(page);
    await upload(page, { version: 1, levels: [] });
    await page.getByRole('alert').filter({ hasText: 'Import failed' }).waitFor();
    assert.deepEqual(await saved(page), before);
    assert.equal(await page.getByRole('button', { name: 'Retry import' }).isVisible(), true);
    await screenshot(page, `${prefix}-import-error`);
    await upload(page, { ...backup, history: [null, { name: 'Invalid', at: 'not a date', from: 1, to: 2 }, ...backup.history] });
    await page.getByRole('status').filter({ hasText: 'restored' }).waitFor();
    assert.equal((await saved(page)).sample, true);
    assert.equal((await saved(page)).history.length, backup.history.length);
    await dismiss(page);
    await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
    await screenshot(page, `${prefix}-reset-confirmation`);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal((await saved(page)).levels.html, backup.levels.html);
    await page.getByRole('button', { name: 'Reset progress', exact: true }).click();
    await page.getByRole('button', { name: 'Yes, erase my progress' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('skillweave-progress-v2')).sample === false);
    const reset = await saved(page);
    assert.deepEqual(reset.history, []); assert.equal(reset.goalId, ''); assert.equal(reset.levels.html, 0);
    assert.match(await page.locator('.progress-summary').innerText(), /0.*227.*rated/s);
    await dismiss(page);
    await page.getByRole('button', { name: 'History', exact: true }).click();
    await page.getByText('No changes yet.', { exact: true }).waitFor();
    await screenshot(page, `${prefix}-empty-history`);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Choose learning goal' }).click();
    assert.equal(await page.locator('.goal-option').filter({ has: page.locator('.goal-suggested') }).innerText().then(text => text.startsWith('Frontend Engineer')), true);
    await page.getByRole('button', { name: /Not sure\? Explore freely/ }).click();
    await dismiss(page);
    await page.getByRole('button', { name: 'View entire atlas' }).click();
    await page.waitForFunction(() => document.querySelector('.atlas-area').dataset.overview === 'true');
    await screenshot(page, `${prefix}-overview`);
    // At phone world zoom the Engineering label enters the branch overview first.
    if (await page.locator('.world-label').isVisible()) {
      await page.locator('.world-label').click();
    } else {
      await page.locator('.constellation-label').filter({ hasText: 'Frontend' }).click();
    }
    assert.ok(parseInt(await page.locator('.canvas-controls>span').innerText()) >= (mobile ? 50 : 42));
    const response = await page.goto(`${base}/missing-audit-route`);
    assert.equal(response.status(), 404);
    await page.getByRole('heading', { name: 'This page is not on the atlas.' }).waitFor();
    await screenshot(page, `${prefix}-404`);
    await page.getByRole('link', { name: 'Back to your atlas' }).click();
    await page.waitForSelector('.react-flow__node');
    assert.equal((await saved(page)).sample, false);
    await page.close();
    console.log(`PASS ${prefix}: navigation, search, codex, history, six goals, guide access, path steps, legend, settings, backups, reset, overview and static 404.`);
  }
  for (const width of [320, 360, 700, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    await page.goto(base); await page.waitForSelector('.react-flow__node');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot(page, `responsive-${width}`);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS responsive widths 320/360/700/768 and no page errors.');
} finally {
  await browser.close();
}
