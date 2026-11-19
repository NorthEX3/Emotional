(function () {
  'use strict';
  const L = window.StyleLearning;
  window.initStyleLearningUI = function (app) {
    const $ = selector => document.querySelector(selector);
    const el = (tag, text, className) => {
      const node = document.createElement(tag);
      if (text !== undefined) node.textContent = text;
      if (className) node.className = className;
      return node;
    };
    const modal = el('div', undefined, 'modal-overlay');
    modal.id = 'modal-style-learning';
    modal.innerHTML = `
      <section class="liquid-modal learning-modal" role="dialog" aria-modal="true" aria-labelledby="learning-title">
        <div class="learning-heading"><h2 class="modal-title" id="learning-title">学习 TA 的说话方式</h2><button type="button" class="icon-btn-minimal" id="learning-close" aria-label="关闭学习流程">×</button></div>
        <p class="modal-subtitle" id="learning-role"></p>
        <p class="learning-notice" id="learning-feedback" role="status" aria-live="polite"></p>
        <div id="learning-import">
          <ol class="learning-steps" aria-label="学习流程"><li>选择资料</li><li>核对文字与身份</li><li>学习与试聊</li></ol>
          <h3 class="learning-section-title">选择要学习的资料</h3>
          <p class="form-hint">截图、PDF 或聊天导出文件。单文件最多 20 MB。</p>
          <label class="liquid-btn-secondary learning-file-picker" for="learning-file">选择图片或文件</label>
          <input id="learning-file" class="learning-native-file" type="file" accept=".txt,.csv,.json,.xml,.html,.htm,.db,.sqlite,.pdf,.png,.jpg,.jpeg,.webp" aria-label="选择学习资料">
          <div id="learning-file-card" hidden>
            <img id="learning-file-preview" alt="选中的聊天图片预览" hidden>
            <div class="learning-file-info"><strong id="learning-file-name"></strong><p id="learning-file-state" role="status" aria-live="polite"></p></div>
          </div>
          <div id="learning-recognition" hidden>
            <button class="liquid-btn-primary btn-full" id="learning-recognize">发送图片并识别文字</button>
            <p class="form-hint">点击后才发送到识别服务；识别完成后请核对文字。</p>
            <details id="learning-vision-config"><summary>识别服务设置</summary>
              <button class="liquid-btn-secondary" id="learning-use-chat-api">使用聊天的 API 地址和密钥</button>
              <p class="form-hint">需要支持图片的模型。DeepSeek 可填 deepseek-flash；设置保存在当前浏览器，下次自动填入。</p>
              <label class="form-label" for="learning-vision-url">API 基础地址</label><input class="liquid-input" id="learning-vision-url" placeholder="https://api.deepseek.com">
              <label class="form-label" for="learning-vision-model">图片识别模型</label><input class="liquid-input" id="learning-vision-model" placeholder="例如 deepseek-flash">
              <label class="form-label" for="learning-vision-key">API Key</label><input class="liquid-input" id="learning-vision-key" type="password" autocomplete="off">
              <div class="learning-actions"><button class="liquid-btn-secondary" id="learning-save-vision">保存识别设置</button><button class="liquid-btn-secondary" id="learning-clear-vision">清除识别设置</button></div>
              <p class="form-hint">扫描 PDF 最多 20 页，每页一次请求，按服务商规则计费。</p>
            </details>
          </div>
          <details><summary>其他格式与帖子作者设置</summary>
            <p class="form-hint">支持 TXT、CSV、JSON、HTML、短信 XML、iMessage chat.db。PDF 默认本地提取文字；扫描件需识别。</p>
            <label class="form-label" for="learning-author">无作者字段的帖子作者（可选）</label>
            <input class="liquid-input" id="learning-author" maxlength="40" placeholder="没有作者时填写，转换后仍需核对">
          </details>
          <h3 class="learning-section-title">核对文字，也可以直接粘贴</h3>
          <label class="form-label" for="learning-text">聊天原文／识别结果</label>
          <textarea class="liquid-input" id="learning-text" rows="4" placeholder="我：今天有点累。&#10;小林：那先歇会儿呗"></textarea>
          <details><summary>查看文字格式示例</summary><pre class="learning-text">我：今天有点累。
小林：那先歇会儿呗</pre></details>
          <button class="liquid-btn-secondary btn-full" id="learning-parse">核对完成，选择学习对象</button>
          <p class="form-hint">只导入你有权提供的资料；核对并点击“开始学习”后才向聊天 AI 发送所选文字。</p>
          <div id="learning-parsed" hidden>
            <p id="learning-counts" class="form-hint"></p>
            <div id="learning-issues" class="learning-text"></div>
            <label class="form-label" for="learning-target-name">学习对象名称（多个昵称可归为同一人）</label>
            <input class="liquid-input" id="learning-target-name" maxlength="80">
            <div id="learning-speakers"></div>
            <p class="form-hint">勾选参与分析的消息；“我”只提供上下文，其他发言者不参与。需要脱敏时修改上方原文后重新解析。</p>
            <div id="learning-messages" class="learning-list"></div>
            <div class="learning-actions"><button class="liquid-btn-secondary" id="learning-prev">上一页</button><span id="learning-page"></span><button class="liquid-btn-secondary" id="learning-next">下一页</button></div>
            <button class="liquid-btn-secondary" id="learning-sample">确认选择，预览实际提交样本</button>
            <div id="learning-submission" hidden>
              <p id="learning-sample-counts" class="learning-notice"></p>
              <details open><summary>实际发送的样本与必要上下文</summary><div class="learning-list" id="learning-samples"></div></details>
              <p class="form-hint" id="learning-service"></p>
              <button class="liquid-btn-primary" id="learning-analyze">开始学习</button>
            </div>
          </div>
        </div>
        <div id="learning-profile" hidden>
          <p id="learning-profile-info" class="form-hint"></p>
          <label class="form-label" for="learning-adjustments">希望 TA 怎么回应你？（可选）</label><textarea class="liquid-input" id="learning-adjustments" rows="3" maxlength="600" placeholder="例如：少一点反问；我只是倾诉时，先听我说"></textarea>
          <label class="form-label" for="learning-trial-input">先聊一句，感受一下</label><input class="liquid-input" id="learning-trial-input" maxlength="2000" placeholder="例如：今天工作很累">
          <div class="learning-actions"><button class="liquid-btn-secondary" id="learning-trial">看看 TA 怎么回</button><button class="liquid-btn-secondary" id="learning-original">看看原来的回复</button></div>
          <div class="learning-trials"><section><h3>TA 的回复</h3><p class="learning-text" id="learning-trial-result"></p></section><section><h3>原来的回复</h3><p class="learning-text" id="learning-original-result"></p></section></div>
          <button class="liquid-btn-primary btn-full" id="learning-apply">就这样，开始聊天</button>
          <div id="learning-management" class="learning-actions">
            <button class="liquid-btn-secondary" id="learning-toggle"></button>
            <button class="liquid-btn-secondary" id="learning-append">补充记录</button>
            <button class="liquid-btn-secondary" id="learning-replace">更换对象</button>
            <button class="liquid-btn-secondary" id="learning-rollback">恢复上一个版本</button>
            <button class="liquid-btn-secondary" id="learning-delete">删除学习资料</button>
          </div>
        </div>
        <button class="liquid-btn-secondary" id="learning-cancel-request" hidden>取消本次请求</button>
        <p class="form-hint">档案仅保存在当前浏览器与访问地址。关闭流程会释放未应用的草稿和原始记录；正式聊天历史不在此保存。</p>
      </section>`;
    $('#app').appendChild(modal);
    let session = null, sequence = 0, opener = null;
    let previewUrl = null;
    function clearFilePreview() {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = null;
      $('#learning-file-preview').removeAttribute('src');
      $('#learning-file-card').hidden = true;
      $('#learning-file-preview').hidden = true;
      $('#learning-recognition').hidden = true;
    }
    function fileState(text) { $('#learning-file-state').textContent = text; }
    const feedback = message => { $('#learning-feedback').textContent = message; };
    const show = (id, visible) => { $('#' + id).hidden = !visible; };
    const clearTrials = () => { $('#learning-trial-result').textContent = ''; $('#learning-original-result').textContent = ''; };
    function stopRequest() {
      if (session?.importing) { fileState('已取消。尚未完成文字识别，可重试。'); session.importing = false; }
      $('#learning-recognize').disabled = false;
      if (session) { session.request++; session.controller?.abort(); session.controller = null; }
      show('learning-cancel-request', false);
      modal.removeAttribute('aria-busy');
    }
    function close() {
      stopRequest();
      session = null;
      clearFilePreview();
      modal.classList.remove('show');
      modal.querySelectorAll('textarea,input').forEach(node => { node.value = ''; });
      ['learning-messages', 'learning-samples', 'learning-issues', 'learning-speakers'].forEach(id => $('#' + id).replaceChildren());
      clearTrials();
      opener?.focus();
    }
    function open(characterId, mode = 'view') {
      stopRequest();
      opener = document.activeElement;
      const c = app.getCharacter(characterId);
      session = { id: ++sequence, characterId, request: 0, mode, originalVersion: c.styleProfile?.version || 0, previous: mode === 'append' ? L.clone(c.styleProfile) : null, draft: mode === 'view' && c.styleProfile ? L.clone(c.styleProfile) : null, parsed: null, roles: {}, excluded: new Set(), page: 0, batch: null };
      $('#learning-role').textContent = '当前角色：' + c.name + (mode === 'append' ? ' · 补充同一对象的记录' : mode === 'replace' ? ' · 更换学习对象' : '');
      $('#learning-text').value = '';
      $('#learning-file').value = '';
      clearFilePreview();
      $('#learning-vision-config').open = false;
      $('#learning-author').value = '';
      let vision = {};
      try { vision = JSON.parse(localStorage.getItem('xinyu_vision_config') || '{}') || {}; } catch (error) { /* Keep older address/model settings available. */ }
      $('#learning-vision-url').value = vision.baseUrl || localStorage.getItem('xinyu_vision_url') || '';
      $('#learning-vision-model').value = vision.model || localStorage.getItem('xinyu_vision_model') || '';
      $('#learning-vision-key').value = vision.apiKey || '';
      $('#learning-target-name').value = session.previous?.targetName || '';
      $('#learning-target-name').readOnly = mode === 'append';
      show('learning-import', !session.draft);
      show('learning-parsed', false);
      show('learning-submission', false);
      show('learning-profile', !!session.draft);
      show('learning-management', mode === 'view' && !!session.draft);
      feedback('');
      clearTrials();
      if (session.draft) renderProfile();
      modal.classList.add('show');
      modal.querySelector('.learning-modal').scrollTop = 0;
      $('#learning-close').focus();
    }
    function invalidate() {
      stopRequest();
      if (session) session.batch = null;
      show('learning-submission', false);
    }
    function renderMessages() {
      const host = $('#learning-messages'); host.replaceChildren();
      const list = session.parsed.messages;
      const start = session.page * 50;
      list.slice(start, start + 50).forEach(message => {
        const label = el('label', undefined, 'learning-message');
        const checkbox = el('input'); checkbox.type = 'checkbox'; checkbox.checked = !session.excluded.has(message.id);
        checkbox.setAttribute('aria-label', '使用第 ' + message.line + ' 行消息');
        checkbox.onchange = () => { invalidate(); if (checkbox.checked) session.excluded.delete(message.id); else session.excluded.add(message.id); };
        label.append(checkbox, el('span', '第 ' + message.line + ' 行 · ' + message.speaker + (message.time ? ' · ' + message.time : '') + '\n' + message.text, 'learning-text'));
        host.append(label);
      });
      $('#learning-page').textContent = (session.page + 1) + ' / ' + Math.max(1, Math.ceil(list.length / 50));
      $('#learning-prev').disabled = session.page === 0;
      $('#learning-next').disabled = start + 50 >= list.length;
    }
    function parse() {
      if (!session) return;
      invalidate();
      try {
        session.parsed = L.parse($('#learning-text').value);
        session.excluded = new Set(); session.page = 0; session.roles = {};
        const parsed = session.parsed;
        $('#learning-counts').textContent = `共 ${parsed.total} 条消息 · 有效 ${parsed.messages.length} 条 · 跳过 ${parsed.skipped.length} 条 · 无法识别 ${parsed.issues.length} 行`;
        $('#learning-issues').textContent = [...parsed.issues, ...parsed.skipped].map(m => `第 ${m.line} 行：${m.reason}\n${m.text}`).join('\n');
        const speakers = $('#learning-speakers'); speakers.replaceChildren();
        parsed.speakers.forEach(name => {
          const label = el('label', undefined, 'learning-speaker'); label.append(el('span', name));
          const select = el('select', undefined, 'liquid-select'); select.setAttribute('aria-label', name + ' 的身份');
          [['ignore', '不参与'], ['me', '我'], ['target', '学习对象']].forEach(([value, text]) => { const option = el('option', text); option.value = value; select.append(option); });
          session.roles[name] = name === '我' ? 'me' : 'ignore'; select.value = session.roles[name];
          select.onchange = () => { invalidate(); session.roles[name] = select.value; if (select.value === 'target' && !$('#learning-target-name').value) $('#learning-target-name').value = name; };
          label.append(select); speakers.append(label);
        });
        show('learning-parsed', true); renderMessages();
        feedback(parsed.issues.length ? '请先修正下方无法识别的内容，然后重新解析。' : '请选择发言者身份，并检查消息。');
      } catch (error) { show('learning-parsed', false); feedback(error.message); }
    }
    function preview() {
      try {
        const name = $('#learning-target-name').value.trim();
        if (!name) throw new Error('请填写学习对象名称。');
        session.batch = L.selectSamples(session.parsed, session.roles, session.excluded, session.previous);
        const b = session.batch;
        $('#learning-sample-counts').textContent = `有效对方消息 ${b.targetCount} 条，采用 ${b.evidence.length} 条，分 ${b.batches.length} 批分析。${b.previousCount ? '含已保存证据 ' + b.previousCount + ' 条。' : ''}${b.few ? '样本较少，结论可能不稳定。' : ''}`;
        const host = $('#learning-samples'); host.replaceChildren();
        b.duplicates.forEach(d => host.append(el('p', `第 ${d.line} 行：${d.reason}`, 'form-hint')));
        b.evidence.forEach(e => host.append(el('p', `${e.id}${e.truncated ? ' · 已截断' : ''}\n我（上下文）：${e.context || '无'}\n学习对象：${e.text}`, 'learning-text')));
        const config = app.getConfig();
        $('#learning-service').textContent = '点击开始学习将发送上方样本至 ' + config.baseUrl + '，模型：' + config.model + '。原始文件不会完整保存。';
        show('learning-submission', true); feedback('请审阅实际提交内容，确认后再开始学习。');
      } catch (error) { feedback(error.message); }
    }
    async function request(work, done) {
      stopRequest();
      const active = session, requestId = ++session.request;
      const controller = new AbortController(); active.controller = controller;
      show('learning-cancel-request', true); modal.setAttribute('aria-busy', 'true'); feedback('正在请求 AI，可取消或关闭流程…');
      try {
        const result = await work(controller.signal);
        if (session === active && active.request === requestId) { done(result); feedback('准备好了。可以先试着聊一句，满意后再开始聊天。'); }
      } catch (error) {
        if (session === active && active.request === requestId) feedback(error.name === 'AbortError' ? '已取消，草稿保留。' : error.message);
      } finally {
        if (session === active && active.request === requestId) { active.controller = null; show('learning-cancel-request', false); modal.removeAttribute('aria-busy'); }
      }
    }
    function readEdits() {
      session.draft.userAdjustments = $('#learning-adjustments').value.trim();
      L.checkProfile(session.draft);
      return L.clone(session.draft);
    }
    function renderProfile() {
      const p = session.draft, current = app.getCharacter(session.characterId);
      $('#learning-profile-info').textContent = session.mode === 'view' && !session.fresh ? (current.styleProfile?.enabled ? '已在聊天中使用。可以继续试聊或调整。' : '当前已暂停使用，可以重新开启。') : '已经准备好参考 TA 的表达方式。先试聊，也可以直接开始。';
      $('#learning-adjustments').value = p.userAdjustments;
      $('#learning-toggle').textContent = current.styleProfile?.enabled ? '停用学习口吻' : '启用学习口吻';
      $('#learning-rollback').disabled = !current.previousStyleProfile;
    }
    function commit(profile, previous) {
      const c = app.getCharacter(session.characterId);
      if ((c.styleProfile?.version || 0) !== session.originalVersion) throw new Error('此角色档案已更新，请关闭后重新打开。');
      app.saveCharacter({ ...c, styleProfile: profile, previousStyleProfile: previous });
      refresh();
    }
    function manage(action) {
      try {
        const c = app.getCharacter(session.characterId);
        if (action === 'delete') {
          if (!confirm('删除此角色本地保存的口吻档案、证据、示例及回退版本？正式聊天中的既有消息不删除；此操作不会删除 AI 服务方可能保留的数据。')) return;
          commit(null, null); close(); app.toast('学习资料已从本应用删除'); return;
        }
        const p = L.clone(action === 'rollback' ? c.previousStyleProfile : c.styleProfile);
        if (!p) return;
        p.version = (c.styleProfile?.version || 0) + 1;
        if (action === 'toggle') p.enabled = !p.enabled;
        commit(p, action === 'rollback' ? c.styleProfile : c.previousStyleProfile);
        open(c.id); feedback(action === 'rollback' ? '已恢复上一个版本，从下一次请求生效。' : '已更新开关，从下一次请求生效。');
      } catch (error) { feedback('保存失败，原档案保留。' + error.message); }
    }
    function trial(original) {
      try {
        const text = $('#learning-trial-input').value.trim(); if (!text) throw new Error('请先输入试聊内容。');
        const p = readEdits(); p.enabled = true;
        const c = app.getCharacter(session.characterId);
        const messages = L.buildMessages(c, original ? null : p, [{ type: 'user', text }], app.getUserName(), true);
        request(signal => L.complete({ ...app.getConfig() }, messages, signal), result => { $(original ? '#learning-original-result' : '#learning-trial-result').textContent = result; });
      } catch (error) { feedback(error.message); }
    }
    function refresh() {
      const c = app.getCharacter(app.getCurrentCharacter()), p = c.styleProfile;
      $('#style-learning-summary').textContent = p ? `${p.targetName} · ${p.enabled ? '已启用' : '已停用'} · ${p.targetMessageCount} 条消息 · ${p.updatedAt.slice(0, 10)}` : '导入聊天记录，让这个角色参考对方的表达习惯。';
      $('#btn-style-learning').textContent = p ? '查看与调整' : '导入聊天记录';
      $('#style-learning-badge').hidden = !p?.enabled;
      $('#style-learning-badge').textContent = `学习口吻 · ${L.RULESET_VERSION}`;
      if (p?.enabled) $('#style-learning-summary').textContent += ` · 回复准则 ${L.RULESET_VERSION}`;
    }
    $('#btn-style-learning').onclick = () => { app.closeCharacterSettings(); open(app.getCurrentCharacter()); };
    $('#style-learning-badge').onclick = () => open(app.getCurrentCharacter());
    $('#learning-close').onclick = close;
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
      if (event.key === 'Tab') {
        const nodes = [...modal.querySelectorAll('button,input,select,textarea,summary')].filter(n => !n.disabled && n.getClientRects().length);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    $('#learning-cancel-request').onclick = () => { stopRequest(); feedback('已取消本次请求，草稿保留。'); };
    $('#learning-text').oninput = () => { invalidate(); show('learning-parsed', false); };
    async function convertSelected(useVision = false) {
      const file = $('#learning-file').files[0], active = session; if (!file || !active) return;
      invalidate(); show('learning-parsed', false); const requestId = session.request;
      const controller = new AbortController(); session.controller = controller;
      session.importing = true;
      try {
        if (useVision && !/\.(pdf|png|jpg|jpeg|webp)$/i.test(file.name)) throw new Error('识别服务只用于图片或 PDF。');
        const vision = useVision ? {baseUrl:$('#learning-vision-url').value.trim(),model:$('#learning-vision-model').value.trim(),apiKey:$('#learning-vision-key').value.trim()} : null;
        if (vision && (!vision.baseUrl || !vision.model || !vision.apiKey)) { $('#learning-vision-config').open = true; throw new Error('请先填写识别服务设置，或点击“使用聊天的 API 地址和密钥”。'); }
        if (vision) localStorage.setItem('xinyu_vision_config', JSON.stringify(vision));
        show('learning-cancel-request', true); feedback(useVision ? '正在发送选中文件至识别服务…' : '正在本地转换文件…');
        $('#learning-recognize').disabled = true;
        fileState(useVision ? '请求处理中：正在发送并等待识别结果…' : '正在本地读取文件…');
        const text = await window.RecordImport.convert(file, {author:$('#learning-author').value,vision,signal:controller.signal,progress:message => { if (session === active && session.request === requestId) fileState(message); }});
        if (session !== active || session.request !== requestId) return;
        if (L.bytes(text) > L.MAX_BYTES) throw new Error('转换后文字超过 2 MB，请拆分文件。');
        session.controller = null; session.importing = false; $('#learning-recognize').disabled = false; show('learning-cancel-request', false);
        fileState(useVision ? '识别完成。文字已显示在下方，请核对后选择学习对象。' : '本地读取完成，未向识别服务发送。请核对下方文字。');
        if (useVision) $('#learning-vision-config').open = false;
        $('#learning-text').value = text; parse();
        if (useVision) feedback('识别完成。下一步：核对下方文字与发言者。');
      } catch (error) { if (session === active && session.request === requestId) { const message = error.name === 'AbortError' ? '已取消导入。' : error instanceof TypeError ? '文件编码或网络请求失败，请检查 UTF-8 编码、识别服务地址及跨域支持。' : error.message; feedback(message); fileState('未完成：' + message); } }
      finally { if (session === active && session.request === requestId) { session.controller = null; session.importing = false; $('#learning-recognize').disabled = false; show('learning-cancel-request', false); } }
    }
    $('#learning-file').onchange = () => {
      invalidate(); clearFilePreview(); show('learning-parsed', false);
      const file = $('#learning-file').files[0]; if (!file) return;
      $('#learning-text').value = '';
      $('#learning-file-card').hidden = false;
      $('#learning-file-name').textContent = file.name + ' · ' + (file.size / 1024).toFixed(0) + ' KB';
      const image = /\.(png|jpe?g|webp)$/i.test(file.name), pdf = /\.pdf$/i.test(file.name);
      $('#learning-recognition').hidden = !(image || pdf);
      $('#learning-recognize').textContent = pdf ? '发送 PDF 页面并识别文字' : '发送图片并识别文字';
      if (image) {
        previewUrl = URL.createObjectURL(file); $('#learning-file-preview').src = previewUrl; $('#learning-file-preview').hidden = false;
        fileState('已选择图片，尚未发送。下一步：设置识别服务，然后点击“发送图片并识别文字”。');
        feedback('图片已在本地选中，尚未发送到识别服务。');
      } else convertSelected(false);
    };
    $('#learning-use-chat-api').onclick = () => {
      const config = app.getConfig();
      $('#learning-vision-url').value = config.baseUrl || 'https://api.deepseek.com';
      $('#learning-vision-key').value = config.apiKey || '';
      $('#learning-vision-model').value = /^https:\/\/api\.deepseek\.com(?:\/|$)/.test(config.baseUrl || '') ? 'deepseek-flash' : '';
      feedback(config.apiKey ? '已填入聊天 API 地址和密钥，请确认图片识别模型，再点击发送识别。' : '聊天设置尚未填写密钥，请在这里填写识别密钥。');
    };
    $('#learning-save-vision').onclick = () => {
      const config = {baseUrl:$('#learning-vision-url').value.trim(), model:$('#learning-vision-model').value.trim(), apiKey:$('#learning-vision-key').value.trim()};
      if (!config.baseUrl || !config.model || !config.apiKey) { feedback('请填写 API 地址、图片识别模型和密钥后保存。'); return; }
      try { localStorage.setItem('xinyu_vision_config', JSON.stringify(config)); feedback('识别设置已保存，下次打开自动填入。'); }
      catch (error) { feedback('保存失败，请检查浏览器是否允许本地存储。'); }
    };
    $('#learning-clear-vision').onclick = () => {
      try {
        ['xinyu_vision_config','xinyu_vision_url','xinyu_vision_model'].forEach(key => localStorage.removeItem(key));
        ['learning-vision-url','learning-vision-model','learning-vision-key'].forEach(id => { $('#' + id).value = ''; });
        feedback('已清除保存的识别设置。');
      } catch (error) { feedback('清除失败，请检查浏览器本地存储。'); }
    };
    $('#learning-recognize').onclick = () => convertSelected(true);
    $('#learning-parse').onclick = parse;
    $('#learning-prev').onclick = () => { session.page--; renderMessages(); };
    $('#learning-next').onclick = () => { session.page++; renderMessages(); };
    $('#learning-target-name').oninput = invalidate;
    $('#learning-sample').onclick = preview;
    $('#learning-analyze').onclick = () => {
      if (!session.batch) return;
      const batch = L.clone(session.batch), previous = session.previous, name = $('#learning-target-name').value.trim(), config = { ...app.getConfig() };
      request(signal => L.analyzeSamples(config, batch, signal, feedback, previous), result => {
        session.draft = L.makeProfile(result, batch, name, config.model, previous); session.fresh = true;
        show('learning-import', false); show('learning-profile', true); show('learning-management', false); clearTrials(); renderProfile();
        modal.querySelector('.learning-modal').scrollTop = 0;
      });
    };
    $('#learning-adjustments').oninput = () => { stopRequest(); clearTrials(); };
    $('#learning-trial-input').oninput = () => { stopRequest(); clearTrials(); };
    $('#learning-trial').onclick = () => trial(false);
    $('#learning-original').onclick = () => trial(true);
    $('#learning-apply').onclick = () => {
      try {
        const p = readEdits(), c = app.getCharacter(session.characterId);
        p.version = (c.styleProfile?.version || 0) + 1; p.enabled = true; p.updatedAt = new Date().toISOString();
        commit(p, c.styleProfile || null); close(); app.toast('已应用学习口吻，从下一条回复开始生效');
      } catch (error) { feedback('未应用，原档案保留。' + error.message); }
    };
    $('#learning-toggle').onclick = () => manage('toggle');
    $('#learning-delete').onclick = () => manage('delete');
    $('#learning-rollback').onclick = () => manage('rollback');
    $('#learning-append').onclick = () => open(session.characterId, 'append');
    $('#learning-replace').onclick = () => open(session.characterId, 'replace');
    refresh();
    return { refresh, close };
  };
})();
