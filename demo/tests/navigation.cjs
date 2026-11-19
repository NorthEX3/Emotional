// Run with Playwright available on NODE_PATH; uses the installed Edge browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Avoid depending on external fonts or contacting the AI service.
    await page.route('https://**/*', route => route.abort());
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    page.setDefaultTimeout(5000);
    const resize = async (width, height) => {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(400);
    };
    const visible = async id => page.locator('#' + id).waitFor({ state: 'visible' });
    const inside = async id => {
      await visible(id);
      const rect = await page.locator('#' + id).boundingBox();
      const viewport = page.viewportSize();
      assert(rect.y >= 0 && rect.y + rect.height <= viewport.height + 1, id + ' clipped: ' + JSON.stringify({rect, viewport}));
    };
    const noModal = async () => assert.equal(await page.locator('.modal-overlay.show').count(), 0);

    await resize(1440, 900);
    await inside('wechat-left-dock');
    assert.equal(await page.locator('.home-top-left').isVisible(), false);
    assert.equal(await page.locator('.dock-bottom-group button').count(), 1);
    assert.equal(await page.locator('#dock-btn-theme, #btn-switch-mobile, #tab-nav-status').count(), 0);
    await page.click('#dock-btn-settings');
    await page.click('#row-open-theme-config');
    await visible('modal-chat-theme');
    await page.click('#btn-close-bg-modal');
    await noModal();
    await visible('mobile-settings-pane');
    await page.click('#row-open-theme-config');
    await page.click('.bg-option[data-theme="forest"]');
    await page.click('#btn-close-bg-modal');
    assert.equal(await page.locator('#mobile-theme-label').textContent(), '静谧墨绿');
    await page.click('#row-open-api-config');
    let testedUrl = '';
    await page.route('https://api.deepseek.com/chat/completions', route => { testedUrl = route.request().url(); return route.fulfill({ status: 200, json: {} }); });
    await page.fill('#input-api-key', 'test-only');
    await page.fill('#input-api-base-url', '');
    await page.click('#btn-test-api');
    await page.waitForFunction(() => document.getElementById('toast').textContent.includes('连接成功'));
    assert.equal(testedUrl, 'https://api.deepseek.com/chat/completions');
    await page.fill('#input-api-key', '');
    await page.click('#btn-save-api');
    await noModal();
    await page.click('#btn-close-settings');
    console.log('PASS desktop navigation, settings, themes and modal closing');

    for (const width of [320, 390, 768]) {
      await resize(width, 844);
      await inside('wechat-mobile-bottom-bar');
      assert.equal(await page.locator('#wechat-mobile-bottom-bar button').count(), 2);
      await visible('home-user-avatar-btn');
      await page.click('#home-user-avatar-btn');
      await visible('modal-status-hub');
      assert.equal(await page.locator('#modal-edit-profile').isVisible(), false);
      await page.click('#btn-close-status-modal');
      await page.click('#tab-nav-settings');
      await inside('wechat-mobile-bottom-bar');
      await visible('mobile-settings-pane');
      await page.click('#tab-nav-chats');
      await visible('wechat-home-pane');
    }
    await resize(390, 844);
    await page.click('#tab-nav-settings');
    await page.click('#row-edit-profile');
    await page.fill('#input-edit-nickname', '导航测试用户');
    await page.click('.avatar-option[data-avatar="🦊"]');
    await page.click('#btn-save-edit-profile');
    assert.equal(await page.locator('#mobile-hero-name').textContent(), '导航测试用户');
    assert.equal(await page.locator('#tab-nav-settings svg').innerHTML(), await page.locator('#dock-btn-settings svg').innerHTML());
    await page.click('#tab-nav-chats');
    await page.click('#home-user-avatar-btn');
    await page.click('.status-compact-item >> nth=1');
    await page.click('#btn-confirm-publish-status');
    await page.click('#tab-nav-settings');
    assert.match(await page.locator('#mobile-status-value').textContent(), /超开心/);
    await page.click('#tab-nav-chats');
    await page.fill('#chat-search-input', '小暖');
    assert.equal(await page.locator('.conv-item').count(), 1);
    await page.fill('#chat-search-input', '');
    await page.click('#btn-home-add-char');
    await page.fill('#new-char-name', '测试伙伴');
    await page.click('#btn-confirm-create');
    await visible('wechat-chat-pane');
    assert.equal(await page.locator('#chat-char-name').textContent(), '测试伙伴');
    await page.fill('#chat-input', '今天想聊聊');
    await page.click('#btn-send');
    assert.match(await page.locator('#chat-messages').textContent(), /今天想聊聊/);
    await page.click('#btn-char-detail-settings');
    await visible('modal-character-settings');
    await page.click('#btn-cancel-char-settings');
    await page.click('#btn-back-to-home');
    await inside('wechat-mobile-bottom-bar');
    console.log('PASS mobile navigation at 320/390/768px, profile, status, search, creation and chat');

    await resize(1440, 900);
    await page.click('#dock-btn-settings');
    await page.click('#row-switch-to-desktop');
    // Wait for the preview frame transition before checking its bounds.
    await page.waitForTimeout(400);
    await inside('wechat-mobile-bottom-bar');
    await visible('home-user-avatar-btn');
    assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('app'), '::after').content), 'none');
    await page.click('#home-user-avatar-btn');
    await visible('modal-status-hub');
    await page.click('#btn-close-status-modal');
    await page.reload();
    await inside('wechat-mobile-bottom-bar');
    await page.click('#tab-nav-settings');
    await page.click('#row-switch-to-desktop');
    await page.waitForTimeout(400);
    await inside('wechat-left-dock');
    await page.click('#dock-btn-settings');
    await resize(390, 844);
    await inside('wechat-mobile-bottom-bar');
    await page.click('#tab-nav-chats');
    await visible('wechat-home-pane');
    assert.deepEqual(errors, []);
    console.log('PASS preview persistence, return to desktop, resizing with settings open; no script errors');

    await resize(1440, 900);
    await page.click('#dock-btn-settings');
    await page.click('#row-open-theme-config');
    const modeButton = mode => page.locator('button[data-color-mode="' + mode + '"]');
    const background = () => page.locator('#wechat-chat-pane').evaluate(element => ({
      image: getComputedStyle(element).backgroundImage,
      custom: element.style.getPropertyValue('--chat-custom-bg-image'),
      global: localStorage.getItem('liquid_custom_bg'),
      dedicated: localStorage.getItem('chat_bg_xiaonuan'),
    }));
    await modeButton('light').click();
    assert.equal(await modeButton('light').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('body').getAttribute('data-color-mode'), 'light');
    assert.equal(await page.locator('#wechat-home-pane').evaluate(element => getComputedStyle(element).backgroundColor), 'rgba(255, 255, 255, 0.96)');
    // Changing an ambient preset must retain the chosen application appearance.
    await page.click('.bg-option[data-theme="violet"]');
    assert.equal(await page.locator('body').getAttribute('data-color-mode'), 'light');
    if (process.env.VISUAL_OUTPUT_DIR) {
      const fs = require('node:fs');
      fs.mkdirSync(process.env.VISUAL_OUTPUT_DIR, { recursive: true });
      await page.screenshot({ path: path.join(process.env.VISUAL_OUTPUT_DIR, 'day-desktop.png') });
    }
    await page.locator('#input-custom-bg').setInputFiles({
      name: 'background.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jOuoAAAAASUVORK5CYII=', 'base64'),
    });
    await page.waitForFunction(() => document.getElementById('wechat-chat-pane').classList.contains('has-custom-chat-bg'));
    const globalBackground = await background();
    await modeButton('dark').click();
    assert.deepEqual(await background(), globalBackground);
    await modeButton('light').click();
    assert.deepEqual(await background(), globalBackground);
    await page.reload();
    assert.equal(await page.locator('body').getAttribute('data-color-mode'), 'light');
    assert.deepEqual(await background(), globalBackground);
    // Role-specific images have priority and also survive an appearance change and reload.
    await page.evaluate(() => localStorage.setItem('chat_bg_xiaonuan', 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><path fill="teal" d="M0 0h2v2H0z"/></svg>')));
    await page.reload();
    const dedicatedBackground = await background();
    assert.notEqual(dedicatedBackground.image, globalBackground.image);
    await page.click('#dock-btn-settings');
    await page.click('#row-open-theme-config');
    await modeButton('dark').click();
    assert.deepEqual(await background(), dedicatedBackground);
    await modeButton('light').click();
    assert.deepEqual(await background(), dedicatedBackground);
    await page.click('#btn-close-bg-modal');
    await page.click('#row-switch-to-desktop');
    await page.waitForTimeout(400);
    await inside('wechat-mobile-bottom-bar');
    assert.equal(await page.locator('body').getAttribute('data-color-mode'), 'light');
    await page.click('#tab-nav-settings');
    await page.click('#row-open-theme-config');
    if (process.env.VISUAL_OUTPUT_DIR) {
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(process.env.VISUAL_OUTPUT_DIR, 'day-mobile.png') });
    }
    await modeButton('dark').click();
    assert.deepEqual(await background(), dedicatedBackground);
    assert.deepEqual(errors, []);
    console.log('PASS day/night appearance, preset independence, global and role-specific image preservation, reload and mobile preview');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
