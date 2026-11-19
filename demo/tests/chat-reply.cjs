const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function testReply(root) {
  const learning = require(path.join(root, 'js/style-learning.js'));
  const requests = [], rendered = [];
  let now = 0, nextTimer = 0;
  const timers = new Map();
  const ctx = {
    window: { StyleLearning: learning },
    localStorage: { getItem: () => null },
    document: { readyState: 'loading', addEventListener() {} },
    performance: { now: () => now },
    setTimeout(callback, wait) {
      const id = ++nextTimer;
      timers.set(id, { callback, at: now + wait });
      return id;
    },
    clearTimeout: id => timers.delete(id),
    TextDecoder,
    async fetch(url, options) {
      const request = { messages: JSON.parse(options.body).messages };
      const encoder = new TextEncoder();
      const stream = new ReadableStream({ start(controller) {
        request.delta = text => controller.enqueue(encoder.encode(
          'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n',
        ));
        request.finish = () => {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        };
        request.drop = () => controller.close();
      } });
      requests.push(request);
      return { ok: true, body: stream };
    },
  };
  const source = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
  vm.runInNewContext(source.replace("  if (document.readyState === 'loading') {", `
    scrollChat = renderConversationList = showToast = () => {};
    renderPendingReply = () => record('pending', currentCharacter);
    renderChatMessages = () => record('chat', currentCharacter);
    window.test = {
      send: triggerDeepSeekReply, offline: triggerOfflineReply,
      pending: id => pendingReplies.has(id), switchTo: id => { currentCharacter = id; },
      history: id => CHAT_HISTORIES[id],
      preview: id => CHARACTERS[id].lastMsg,
    };
    if (document.readyState === 'loading') {
  `), { ...ctx, record: (kind, id) => rendered.push({ kind, id, now }) });
  const api = ctx.window.test;
  const flush = () => new Promise(resolve => setImmediate(resolve));
  function advance(to) {
    while (timers.size) {
      const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (timer.at > to) break;
      now = timer.at;
      timers.delete(id);
      timer.callback();
    }
    now = to;
  }
  const bubbles = () => Array.from(api.history('xiaonuan')).filter(m => m.replyTurn).map(m => m.text);
  api.switchTo('xiaonuan');
  api.send(0);
  assert.equal(requests.length, 1);
  assert(api.pending('xiaonuan'));
  requests[0].delta('我听见了。\r\n这一点很重要。\r');
  requests[0].delta('\n \r\n');
  requests[0].delta('我们慢慢说。\n\n\n');
  requests[0].finish();
  await flush();
  advance(1499);
  assert.deepEqual(bubbles(), []);
  advance(1500);
  assert.deepEqual(bubbles(), ['我听见了。\n这一点很重要。']);
  assert(api.pending('xiaonuan'));
  api.switchTo('mingli');
  advance(2499);
  assert.equal(bubbles().length, 1);
  advance(2500);
  assert.deepEqual(bubbles(), ['我听见了。\n这一点很重要。', '我们慢慢说。']);
  assert.equal(api.preview('xiaonuan'), '我们慢慢说。');
  assert(!api.pending('xiaonuan'));
  assert(!rendered.some(entry => entry.now === 2500));

  api.switchTo('xiaonuan');
  api.send(now);
  const last = requests[1].messages.at(-1);
  assert.deepEqual(last, { role: 'assistant', content: '我听见了。\n这一点很重要。\n\n我们慢慢说。' });
  assert.match(requests[1].messages[0].content, /情绪强烈.*更充分的回应/);
  advance(4200);
  requests[1].delta('我有些失望……\n\n我想解释\n\n这里还没有说完');
  await flush();
  assert.equal(bubbles().at(-1), '我有些失望……');
  requests[1].drop();
  await flush();
  advance(5300);
  assert(!api.pending('xiaonuan'));
  assert.equal(bubbles().at(-1), '我有些失望……');

  api.offline(now);
  advance(6799);
  assert.equal(bubbles().length, 3);
  advance(6800);
  assert.equal(bubbles().length, 4);
  assert.match(bubbles().at(-1), /离线预设回复/);
  assert(!api.pending('xiaonuan'));
}

(async () => {
  for (const root of ['..', '../../cloud-deploy/dist']) await testReply(path.resolve(__dirname, root));
  console.log('PASS reply timing, split SSE, grouped history, role switching, disconnect and offline reply');
})().catch(error => { console.error(error); process.exitCode = 1; });
