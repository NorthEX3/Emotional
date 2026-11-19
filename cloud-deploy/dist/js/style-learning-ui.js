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
          <p class="form-hint">仅导入你有权提供的对话。先在本地解析；确认样本并点击“开始学习”后才发送至当前 AI 服务。可先在文本中移除姓名、电话等信息。</p>
          <details><summary>查看可复制的格式示例</summary><pre class="learning-text">2026-10-20 20:13 我：今天有点累。
2026-10-20 20:14 小林：那先歇会儿呗，饭吃了没
我: 还没，懒得动。
小林: 点点好吃的，吃完再说哈哈</pre></details>
          <label class="form-label" for="learning-text">粘贴聊天记录（修改后请重新解析）</label>
          <textarea class="liquid-input" id="learning-text" rows="7" placeholder="我：今天有点累。&#10;小林：那先歇会儿呗"></textarea>
          <label class="form-label" for="learning-file">或上传 UTF-8 TXT（最多 2 MB / 10,000 条）</label>
          <input id="learning-file" type="file" accept=".txt,text/plain">
          <button class="liquid-btn-secondary" id="learning-parse">解析并预览</button>
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
          <label class="form-label" for="learning-summary">口吻概述（可修改）</label><textarea class="liquid-input" id="learning-summary" rows="3" maxlength="300"></textarea>
          <div id="learning-traits"></div>
          <label class="form-label" for="learning-adjustments">我的修正（优先采用；重新学习时保留供你确认）</label><textarea class="liquid-input" id="learning-adjustments" rows="3" maxlength="600" placeholder="例如：不要每次都问吃饭了没有"></textarea>
          <details id="learning-evidence-details"><summary>查看／删除本地保存的证据和典型示例</summary><div id="learning-evidence" class="learning-list"></div><div id="learning-examples" class="learning-text"></div></details>
          <label class="form-label" for="learning-trial-input">应用前试聊（不会加入正式聊天）</label><input class="liquid-input" id="learning-trial-input" maxlength="2000" placeholder="例如：今天工作很累">
          <div class="learning-actions"><button class="liquid-btn-secondary" id="learning-trial">试试新口吻</button><button class="liquid-btn-secondary" id="learning-original">生成原口吻对照</button></div>
          <div class="learning-trials"><section><h3>新口吻</h3><p class="learning-text" id="learning-trial-result"></p></section><section><h3>原口吻</h3><p class="learning-text" id="learning-original-result"></p></section></div>
          <button class="liquid-btn-primary btn-full" id="learning-apply">应用到此角色</button>
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
    const feedback = message => { $('#learning-feedback').textContent = message; };
    const show = (id, visible) => { $('#' + id).hidden = !visible; };
    const clearTrials = () => { $('#learning-trial-result').textContent = ''; $('#learning-original-result').textContent = ''; };
    function stopRequest() {
      if (session) { session.request++; session.controller?.abort(); session.controller = null; }
      show('learning-cancel-request', false);
      modal.removeAttribute('aria-busy');
    }
    function close() {
      stopRequest();
      session = null;
      modal.classList.remove('show');
      modal.querySelectorAll('textarea,input').forEach(node => { node.value = ''; });
      ['learning-messages', 'learning-samples', 'learning-evidence', 'learning-examples', 'learning-issues', 'learning-traits', 'learning-speakers'].forEach(id => $('#' + id).replaceChildren());
      clearTrials();
      opener?.focus();
    }
    function open(characterId, mode = 'view') {
      stopRequest();
      opener = document.activeElement;
      const c = app.getCharacter(characterId);
      session = { id: ++sequence, characterId, request: 0, mode, originalVersion: c.styleProfile?.version || 0, previous: mode === 'append' ? L.clone(c.styleProfile) : null, draft: mode === 'view' && c.styleProfile ? L.clone(c.styleProfile) : null, parsed: null, roles: {}, excluded: new Set(), page: 0, batch: null };
      $('#learning-role').textContent = '当前角色：' + c.name + ' · ' + (mode === 'append' ? '补充同一对象的记录，仅与已保存的有限证据合并' : mode === 'replace' ? '更换学习对象：应用前仍使用原档案' : '导入 → 确认样本 → 学习 → 试聊 → 应用');
      $('#learning-text').value = '';
      $('#learning-file').value = '';
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
        if (session === active && active.request === requestId) { done(result); feedback('已完成。请检查结果，点击应用后才生效。'); }
      } catch (error) {
        if (session === active && active.request === requestId) feedback(error.name === 'AbortError' ? '已取消，草稿保留。' : error.message);
      } finally {
        if (session === active && active.request === requestId) { active.controller = null; show('learning-cancel-request', false); modal.removeAttribute('aria-busy'); }
      }
    }
    function readEdits() {
      session.draft.summary = $('#learning-summary').value.trim();
      session.draft.userAdjustments = $('#learning-adjustments').value.trim();
      $('#learning-traits').querySelectorAll('textarea').forEach(node => { session.draft.traits[Number(node.dataset.index)].value = node.value.trim(); });
      L.checkProfile(session.draft);
      return L.clone(session.draft);
    }
    function renderProfile() {
      const p = session.draft, current = app.getCharacter(session.characterId);
      const status = session.mode === 'view' ? (current.styleProfile?.enabled ? '已启用' : '已停用') : '草稿 · 待应用';
      $('#learning-profile-info').textContent = `${p.targetName} · ${status} · ${p.targetMessageCount} 条对方消息 · ${p.sampleMessageCount} 条证据 · ${p.updatedAt.slice(0, 10)} · ${p.model}${p.targetMessageCount < 20 ? ' · 样本较少' : ''}`;
      $('#learning-summary').value = p.summary;
      $('#learning-adjustments').value = p.userAdjustments;
      const traits = $('#learning-traits'); traits.replaceChildren();
      (p.supplements === undefined ? L.LEGACY_DIMENSIONS : L.DIMENSIONS).forEach(dimension => {
        const index = p.traits.findIndex(t => t.dimension === dimension), trait = p.traits[index];
        const label = el('label', undefined, 'form-group'); label.append(el('span', dimension, 'form-label'));
        if (trait) {
          const input = el('textarea', undefined, 'liquid-input'); input.value = trait.value; input.maxLength = 120; input.rows = 2; input.dataset.index = index; input.oninput = () => { stopRequest(); clearTrials(); }; label.append(input);
          const link = el('button', '查看证据：' + trait.evidenceIds.join('、'), 'learning-link'); link.type = 'button';
          link.onclick = () => { $('#learning-evidence-details').open = true; document.getElementById('evidence-' + trait.evidenceIds[0])?.scrollIntoView({ block: 'nearest' }); };
          label.append(link);
        } else label.append(el('p', '暂不确定：没有足够证据', 'form-hint'));
        traits.append(label);
      });
      const evidence = $('#learning-evidence'); evidence.replaceChildren();
      p.evidence.forEach(e => {
        const row = el('div'); row.id = 'evidence-' + e.id;
        row.append(el('p', `${e.id}${e.truncated ? ' · 节选' : ''}\n我：${e.context || '无上下文'}\n对方：${e.text}`, 'learning-text'));
        const remove = el('button', '删除此节选', 'learning-link');
        remove.onclick = () => {
          // Keep edits while removing references to the deleted evidence.
          p.summary = $('#learning-summary').value; p.userAdjustments = $('#learning-adjustments').value;
          $('#learning-traits').querySelectorAll('textarea').forEach(node => { p.traits[Number(node.dataset.index)].value = node.value; });
          p.evidence = p.evidence.filter(s => s.id !== e.id);
          p.examples = p.examples.filter(s => s.id !== e.id);
          const withoutEvidence = entries => entries.map(t => ({ ...t, evidenceIds: t.evidenceIds.filter(id => id !== e.id) }));
          const updated = L.validateResult({
            traits: withoutEvidence(p.traits), supplements: withoutEvidence(p.supplements || []),
          }, p.evidence, { allowEmpty: true, legacy: p.supplements === undefined });
          p.traits = updated.traits; p.summary = updated.summary;
          if (p.supplements !== undefined) p.supplements = updated.supplements;
          clearTrials(); renderProfile(); feedback('已从草稿移除节选及其引用，应用后保存。删除全部资料请使用下方删除按钮。');
        };
        row.append(remove); evidence.append(row);
      });
      $('#learning-examples').textContent = '典型示例\n' + p.examples.map(e => `${e.id}\n我：${e.context || '无'}\n对方：${e.reply}`).join('\n\n');
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
    $('#learning-file').onchange = async event => {
      const file = event.target.files[0], active = session; if (!file) return;
      invalidate(); const requestId = session.request;
      try {
        if (!/\.txt$/i.test(file.name) || file.size > L.MAX_BYTES) throw new Error('请选择不超过 2 MB 的 UTF-8 TXT 文件。');
        const text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
        if (session !== active || session.request !== requestId) return;
        $('#learning-text').value = text; parse();
      } catch (error) { if (session === active) feedback(error instanceof TypeError ? '文件不是有效的 UTF-8 文本，请转换编码后导入。' : error.message); }
    };
    $('#learning-parse').onclick = parse;
    $('#learning-prev').onclick = () => { session.page--; renderMessages(); };
    $('#learning-next').onclick = () => { session.page++; renderMessages(); };
    $('#learning-target-name').oninput = invalidate;
    $('#learning-sample').onclick = preview;
    $('#learning-analyze').onclick = () => {
      if (!session.batch) return;
      const batch = L.clone(session.batch), previous = session.previous, name = $('#learning-target-name').value.trim(), config = { ...app.getConfig() };
      request(signal => L.analyzeSamples(config, batch, signal, feedback, previous), result => {
        session.draft = L.makeProfile(result, batch, name, config.model, previous);
        show('learning-import', false); show('learning-profile', true); show('learning-management', false); clearTrials(); renderProfile();
        modal.querySelector('.learning-modal').scrollTop = 0;
      });
    };
    $('#learning-summary').oninput = () => { stopRequest(); clearTrials(); };
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
