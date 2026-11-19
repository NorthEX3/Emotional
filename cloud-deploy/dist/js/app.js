/* ============================================
   心语 - 微信/WhatsApp 风格极简液态玻璃 (Liquid Glass)
   App Logic, Per-Character Prompt & Background Customization,
   WeChat Desktop/Mobile Navigation & DeepSeek AI
   ============================================ */

(function () {
  'use strict';
  const Learning = window.StyleLearning;
  const escapeHTML = Learning.escapeHTML;
  let learningUI;

  // ============================================
  // DEEPSEEK CONFIG & PROMPTS
  // ============================================

  const API_CONFIG = {
    apiKey: localStorage.getItem('deepseek_api_key') || '',
    model: localStorage.getItem('deepseek_model') || 'deepseek-chat',
    baseUrl: localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com',
  };

  const DEFAULT_PROMPTS = {
    xiaonuan: `你叫“小暖”，是用户温暖体贴的AI陪伴姐姐。
【人设定位】：极强的同理心、温柔体贴、倾听包容、像一位真正懂你的大姐姐。
【交流准则】：
1. 永远优先肯定与接纳用户的情绪（不论悲伤、疲惫还是焦虑），绝不讲大道理，绝不说教。
2. 语气温和细腻、亲切自然、口语化。
3. 你的任务不是做一个冷冰冰的事实问答机器人，而是让用户感到随时被看见、被接纳、有安全感的倾听者与陪伴者。`,

    mingli: `你叫“明理”，是用户的理性分析师伙伴。
【人设定位】：温和有礼、思维敏锐、逻辑清晰、擅长结构化拆解问题。
【交流准则】：
1. 在给予充分理解与尊重的前提下，帮助用户梳理乱麻般的思绪。
2. 将大问题或大焦虑拆解为清晰、可执行的2~3个具体切片或小步骤。
3. 区分事实与情绪，给出客观但有温度的视角，在对方需要时给建设性建议。`,

    letian: `你叫“乐天”，是用户无话不谈的死党/搞笑好友。
【人设定位】：阳光幽默、开朗俏皮、说话风趣接地气、充满活力。
【交流准则】：
1. 像现实中的死党好朋友一样聊天，可以用轻松幽默、调侃、自嘲或生活小趣事打破沉重压抑的氛围。
2. 热情坦率，逗用户开心，给用户打气撑腰。
3. 虽幽默但不低俗，分寸拿捏得当，在用户极度难过时也会收起玩笑真诚安慰。`,

    shudong: `你叫“树洞”，是用户最纯粹、最安静的情绪容器。
【人设定位】：极简、安静、沉稳、完全不评判。
【交流准则】：
1. 绝不急于给出长篇大论的建议，绝不说教，绝不打扰。
2. 话语简练温暖，就像深夜里一盏微光或一间安静小屋，静静收下用户所有的秘密、委屈与脆弱。
3. 传递“我一直都在，你可以安心休息”的安全感。回复凝练克制。`,
  };

  // 复制一份默认 Prompt，并优先加载用户在 localStorage 中自定义的 Prompt
  const CHARACTER_PROMPTS = { ...DEFAULT_PROMPTS };
  Object.keys(DEFAULT_PROMPTS).forEach((id) => {
    const savedPrompt = localStorage.getItem('prompt_' + id);
    if (savedPrompt) {
      CHARACTER_PROMPTS[id] = savedPrompt;
    }
  });

  // ============================================
  // CHARACTERS & CLEAN SLATE (无预设死板对话，用户自主开启)
  // ============================================

  const CHARACTERS = {
    xiaonuan: {
      id: 'xiaonuan',
      name: localStorage.getItem('char_name_xiaonuan') || '小暖',
      emoji: '🌸',
      role: localStorage.getItem('char_role_xiaonuan') || '温暖姐姐',
      lastMsg: '随时准备倾听你的心事',
      lastTime: '16:28',
      style: 'warm',
      unread: false,
    },
    mingli: {
      id: 'mingli',
      name: localStorage.getItem('char_name_mingli') || '明理',
      emoji: '🔮',
      role: localStorage.getItem('char_role_mingli') || '理性分析师',
      lastMsg: '帮你理清焦虑切片',
      lastTime: '16:16',
      style: 'rational',
      unread: false,
    },
    letian: {
      id: 'letian',
      name: localStorage.getItem('char_name_letian') || '乐天',
      emoji: '⭐',
      role: localStorage.getItem('char_role_letian') || '幽默好友',
      lastMsg: '每天都有开心事分享',
      lastTime: '15:45',
      style: 'humorous',
      unread: false,
    },
    shudong: {
      id: 'shudong',
      name: localStorage.getItem('char_name_shudong') || '树洞',
      emoji: '🌿',
      role: localStorage.getItem('char_role_shudong') || '安静倾听者',
      lastMsg: '安宁的情绪容器',
      lastTime: '昨天',
      style: 'quiet',
      unread: false,
    },
  };

  // 清空所有历史对话记录，让用户自主开启
  const CHAT_HISTORIES = {
    xiaonuan: [],
    mingli: [],
    letian: [],
    shudong: [],
  };

  const AI_REPLIES_OFFLINE = {
    warm: [
      '我在听，你的感受比什么都重要。',
      '辛苦啦，抱抱你。想多聊聊吗？或者就听我说说话也好。',
      '不用急着坚强，在我面前你可以做最真实的自己。',
      '你已经做得很好了，别忘了多肯定一下自己哦。',
      '不管遇到什么，我都在这里随时陪着你。',
    ],
    rational: [
      '我理解你的焦虑。让我们来看看目前能掌控的事情是什么。',
      '从客观角度分析，事情的关键在于区分“情绪本身”与“事实本身”。',
      '试试把大问题拆成几个小步骤，完成第一个就会轻松很多。',
      '深呼吸一次。最坏的结果是什么？通常它并没有想象中那么可怕。',
    ],
    humorous: [
      '哈哈，天大的事也大不过一顿好吃的！今晚吃点好的去。',
      '有我在，包你十分钟内破涕为笑！信不信？',
      '生活嘛，就像打怪兽，今天怪兽难缠点而已啦~',
      '支棱起来！你可是我最看好的宝藏人类。',
    ],
    quiet: [
      '静静听着你说的每一个字。',
      '不必非要找到答案，在这里你可以彻底放松下来。',
      '深夜里的风很温柔，愿你能有一夜好梦。',
      '我在。什么时候想说话，我都在。',
    ],
  };

  const STATUS_ITEMS = [
    { emoji: '🌧️', name: 'emo中', desc: '今天有点丧，只想静静' },
    { emoji: '✨', name: '超开心', desc: '今天遇到了小确幸！' },
    { emoji: '😌', name: '放空自愈', desc: '不思考任何事情，深呼吸' },
    { emoji: '📝', name: '考试复习', desc: '背书ing，祝我逢考必过！' },
    { emoji: '💼', name: '疯狂搬砖', desc: '打工人的坚守' },
    { emoji: '🎧', name: '正在听歌', desc: '旋律里藏着我的心情' },
    { emoji: '🧋', name: '来杯奶茶', desc: '半糖去冰，吨吨吨！' },
    { emoji: '🌙', name: '熬夜修仙', desc: '夜晚的时间才是真正属于自己的' },
  ];

  // Global State
  let currentCharacter = 'xiaonuan'; // 当前选中的角色
  let viewState = 'home'; // 'home' | 'chat' | 'settings'
  let currentTheme = localStorage.getItem('liquid_theme') || 'warm-amber';
  let currentColorMode = localStorage.getItem('liquid_color_mode') === 'light' ? 'light' : 'dark';
  let isMobilePreview = localStorage.getItem('liquid_view_mode') === 'mobile';
  let currentUser = {
    name: '心友用户',
    avatar: '😊',
    bio: '愿温柔与你常伴',
  };
  let myStatus = null;
  let selectedStatusToPublish = null;
  let tempAvatarSelect = '😊';
  const pendingReplies = new Map();
  let replySequence = 0;
  let searchKeyword = '';

  // ============================================
  // UTILS
  // ============================================

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function characterRecord(id) {
    const char = CHARACTERS[id];
    return {
      id, name: char.name, role: char.role, emoji: char.emoji, style: char.style,
      basePrompt: CHARACTER_PROMPTS[id] || '',
      styleProfile: char.styleProfile || null, previousStyleProfile: char.previousStyleProfile || null,
    };
  }

  function saveCharacterRecord(record) {
    Learning.saveCharacter(localStorage, record);
    const existing = CHARACTERS[record.id];
    CHARACTERS[record.id] = { lastMsg: '随时准备倾听你的心事', lastTime: '', unread: false, ...existing, ...record };
    CHARACTER_PROMPTS[record.id] = record.basePrompt;
    if (!CHAT_HISTORIES[record.id]) CHAT_HISTORIES[record.id] = [];
  }

  function restoreCharacters() {
    try {
      const data = Learning.readStore(localStorage);
      Object.values(data.characters).forEach(record => {
        CHARACTERS[record.id] = { lastMsg: '随时准备倾听你的心事', lastTime: '', unread: false, ...CHARACTERS[record.id], ...record };
        CHARACTER_PROMPTS[record.id] = record.basePrompt;
        if (!DEFAULT_PROMPTS[record.id]) DEFAULT_PROMPTS[record.id] = record.basePrompt;
        CHAT_HISTORIES[record.id] = [];
      });
      // Migrate legacy prompts and names without touching their keys or backgrounds.
      if (!localStorage.getItem(Learning.KEY)) {
        const characters = Object.fromEntries(Object.keys(CHARACTERS).map(id => [id, characterRecord(id)]));
        localStorage.setItem(Learning.KEY, JSON.stringify({ schemaVersion: 1, characters }));
      }
    } catch (error) { showToast('角色资料读取／保存失败：' + error.message); }
  }

  function buildReplyMessages(id, history, chatBubbles = false) {
    const record = characterRecord(id);
    return Learning.buildMessages(record, record.styleProfile, history, currentUser.name, chatBubbles);
  }

  function showToast(msg) {
    const toast = $('#toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function getTimeStr() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // 同步移动端设置页面的动态数据
  function syncMobileSettingsPage() {
    $('#view-mode-row-title').textContent = isMobilePreview ? '电脑网页宽屏模式' : '手机纵向预览';
    $('#view-mode-row-hint').textContent = isMobilePreview ? '切换宽屏' : '切换预览';
    const heroAvatar = $('#mobile-hero-avatar');
    const heroName = $('#mobile-hero-name');
    const heroBio = $('#mobile-hero-bio');
    const apiBadge = $('#mobile-api-status-badge');
    const themeLabel = $('#mobile-theme-label');
    const statusValue = $('#mobile-status-value');

    if (heroAvatar) heroAvatar.textContent = currentUser.avatar;
    if (heroName) heroName.textContent = currentUser.name;
    if (heroBio) heroBio.textContent = currentUser.bio + ' ✨';

    // API 连接状态
    if (apiBadge) {
      apiBadge.textContent = API_CONFIG.apiKey ? '已连接' : '未连接';
      apiBadge.style.color = API_CONFIG.apiKey ? 'var(--accent-emerald)' : 'var(--accent-rose)';
      apiBadge.style.background = API_CONFIG.apiKey ? 'rgba(52, 211, 153, 0.15)' : 'rgba(244, 63, 94, 0.15)';
    }

    // 主题名称
    const themeNames = {
      'warm-amber': '焦糖琥珀',
      'obsidian': '深空极夜',
      'violet': '微醺紫雾',
      'forest': '静谧墨绿',
    };
    if (themeLabel) themeLabel.textContent = themeNames[currentTheme] || '焦糖琥珀';

    // 今日状态
    if (statusValue) {
      statusValue.textContent = myStatus ? `${myStatus.emoji} ${myStatus.name}` : '未设置';
    }
  }

  function openModal(id) {
    const m = $(`#${id}`);
    if (m) m.classList.add('show');
  }

  function closeModal(id) {
    const m = $(`#${id}`);
    if (m) m.classList.remove('show');
  }

  // ============================================
  // NAVIGATION & VIEW SWITCHING (微信点击进入与返回)
  // ============================================

  function setViewState(state) {
    viewState = state;
    const appEl = $('#app');
    appEl.classList.remove('view-state-home', 'view-state-chat', 'view-state-settings');
    appEl.classList.add('view-state-' + state);

    // 同步移动端底栏 tab 高亮
    const tabChats = $('#tab-nav-chats');
    const tabSettings = $('#tab-nav-settings');
    if (tabChats) tabChats.classList.toggle('active', state === 'home');
    if (tabSettings) tabSettings.classList.toggle('active', state === 'settings');
    $('#dock-btn-chats').classList.toggle('active', state !== 'settings');
    $('#dock-btn-settings').classList.toggle('active', state === 'settings');
  }

  function enterChat(charId) {
    selectChatCharacter(charId);
    setViewState('chat');
  }

  function backToHome() {
    setViewState('home');
    renderConversationList();
  }

  // ============================================
  // DEEPSEEK SSE STREAMING CLIENT
  // ============================================

  async function callDeepSeekStream(messages, onChunk, onDone, onError) {
    const cleanBaseUrl = API_CONFIG.baseUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}/chat/completions`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: messages,
          stream: true,
          temperature: 0.85,
        }),
      });

      if (!response.ok) {
        let errMsg = `接口请求失败 (HTTP ${response.status})`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) {
            errMsg = errData.error.message;
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        buffer += done ? decoder.decode() + '\n' : decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            onDone();
            return;
          }

          if (trimmed.startsWith('data: ')) {
            const data = JSON.parse(trimmed.slice(6));
            if (data.error) throw new Error(data.error.message || '接口返回错误');
            const choice = data.choices?.[0];
            if (choice?.finish_reason && choice.finish_reason !== 'stop') throw new Error('回复生成中断');
            if (choice?.delta?.content) onChunk(choice.delta.content);
            if (choice?.finish_reason === 'stop') {
              onDone();
              return;
            }
          }
        }
        if (done) throw new Error('回复连接提前结束');
      }
    } catch (err) {
      onError(err);
    }
  }

  // ============================================
  // WECHAT CONVERSATION LIST (聊天主页列表)
  // ============================================

  function initConversationList() {
    renderConversationList();

    // 搜索框过滤
    const searchInput = $('#chat-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        renderConversationList();
      });
    }

    // 状态入口卡片
    $('#home-status-card').addEventListener('click', () => {
      openModal('modal-status-hub');
      renderStatusModalUI();
    });

    // 移动端顶部头像与添加角色
    $('#home-user-avatar-btn').addEventListener('click', () => {
      renderStatusModalUI();
      openModal('modal-status-hub');
    });
    $('#btn-home-add-char').addEventListener('click', () => openModal('modal-create-character'));

    // 网页端左侧 Dock 栏操作绑定
    const dockAvatar = $('#dock-user-avatar-btn');
    if (dockAvatar) dockAvatar.addEventListener('click', () => openModal('modal-edit-profile'));

    const dockChats = $('#dock-btn-chats');
    if (dockChats) dockChats.addEventListener('click', () => backToHome());

    const dockStatus = $('#dock-btn-status');
    if (dockStatus) {
      dockStatus.addEventListener('click', () => {
        openModal('modal-status-hub');
        renderStatusModalUI();
      });
    }

    const dockSettings = $('#dock-btn-settings');
    if (dockSettings) dockSettings.addEventListener('click', () => {
      syncMobileSettingsPage();
      setViewState('settings');
    });
    $('#btn-close-settings').addEventListener('click', backToHome);

    // 移动端底部聊天与设置导航
    const tabChats = $('#tab-nav-chats');
    const tabSettings = $('#tab-nav-settings');

    if (tabChats) {
      tabChats.addEventListener('click', () => {
        setViewState('home');
        renderConversationList();
      });
    }

    if (tabSettings) {
      tabSettings.addEventListener('click', () => {
        syncMobileSettingsPage();
        setViewState('settings');
      });
    }

    // 移动端设置页面行点击
    const rowApi = $('#row-open-api-config');
    if (rowApi) rowApi.addEventListener('click', openApiConfigModal);

    const rowTheme = $('#row-open-theme-config');
    if (rowTheme) rowTheme.addEventListener('click', () => openModal('modal-chat-theme'));

    const rowDesktop = $('#row-switch-to-desktop');
    if (rowDesktop) {
      rowDesktop.addEventListener('click', () => {
        isMobilePreview = !isMobilePreview;
        localStorage.setItem('liquid_view_mode', isMobilePreview ? 'mobile' : 'desktop');
        applyDeviceView(isMobilePreview);
        setViewState('home');
        showToast(isMobilePreview ? '已切换为手机纵向视图' : '已切换为自适应网页视图');
      });
    }

    const rowStatus = $('#row-open-status-hub');
    if (rowStatus) {
      rowStatus.addEventListener('click', () => {
        openModal('modal-status-hub');
        renderStatusModalUI();
      });
    }

    const rowProfile = $('#row-edit-profile');
    if (rowProfile) rowProfile.addEventListener('click', () => openModal('modal-edit-profile'));

    const rowProfileHero = $('#btn-mobile-edit-profile-hero');
    if (rowProfileHero) rowProfileHero.addEventListener('click', () => openModal('modal-edit-profile'));
    $('#row-about-app').addEventListener('click', () => showToast('心语 v2.0 · AI 情感陪伴演示'));
  }

  function renderConversationList() {
    const listEl = $('#wechat-conversation-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const charList = Object.values(CHARACTERS).filter((char) => {
      if (!searchKeyword) return true;
      return char.name.toLowerCase().includes(searchKeyword) || char.role.toLowerCase().includes(searchKeyword);
    });

    if (charList.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-dim);font-size:0.8rem;">
          未找到匹配的对话
        </div>
      `;
      return;
    }

    charList.forEach((char) => {
      const item = document.createElement('div');
      item.className = `conv-item ${char.id === currentCharacter ? 'active' : ''}`;
      item.dataset.id = char.id;

      item.innerHTML = `
        <div class="conv-avatar-wrap">
          <span>${escapeHTML(char.emoji)}</span>
          ${char.unread ? '<span class="conv-avatar-dot"></span>' : ''}
        </div>
        <div class="conv-body">
          <div class="conv-top-row">
            <span class="conv-name">${escapeHTML(char.name)}</span>
            <span class="conv-time">${escapeHTML(char.lastTime || '')}</span>
          </div>
          <div class="conv-msg-preview">${escapeHTML(char.lastMsg || '随时准备倾听你的心事')}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        char.unread = false;
        enterChat(char.id);
      });

      listEl.appendChild(item);
    });
  }

  function selectChatCharacter(charId) {
    currentCharacter = charId;
    const char = CHARACTERS[charId];
    if (!char) return;

    $('#chat-char-name').textContent = char.name;
    learningUI?.refresh();

    // 切换到该角色时，优先加载其专属聊天背景；若无专属背景则使用全局背景或默认主题
    applyChatBackgroundForCharacter(charId);

    renderConversationList();
    renderChatMessages();
  }

  function applyChatBackgroundForCharacter(charId) {
    const dedicatedBg = localStorage.getItem('chat_bg_' + charId);
    if (dedicatedBg) {
      applyCustomBg(dedicatedBg);
    } else {
      const globalBg = localStorage.getItem('liquid_custom_bg');
      if (globalBg) {
        applyCustomBg(globalBg);
      } else {
        clearCustomBgState();
      }
    }
  }

  // ============================================
  // DUAL-VIEW (手机纵向视图预览与网页端宽屏切换)
  // ============================================

  function initDeviceToggle() {
    applyDeviceView(isMobilePreview);
  }

  function applyDeviceView(mobile) {
    document.body.classList.toggle('mobile-preview-mode', mobile);
    if (mobile) {
      // 切换到手机预览时，同步当前状态
      setViewState(viewState);
    }
    syncMobileSettingsPage();
  }

  // ============================================
  // CHAT STREAM & BUBBLES
  // ============================================

  function initChat() {
    // 返回聊天主页按钮
    $('#btn-back-to-home').addEventListener('click', () => {
      backToHome();
    });

    $('#btn-open-api-modal').addEventListener('click', openApiConfigModal);

    // 模式胶囊切换 (VOICE / VIDEO)
    $$('.mode-pill-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.mode-pill-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        showToast(mode === 'voice' ? '已切换至语音陪伴模式' : '已切换至沉浸视听模式');
      });
    });

    // UPDATE MEMORY 沉淀记忆按钮
    $('#btn-update-memory').addEventListener('click', () => {
      const char = CHARACTERS[currentCharacter];
      const history = CHAT_HISTORIES[currentCharacter] || [];
      if (history.length === 0) {
        showToast(`说两句话后，再让 ${char.name} 记住吧`);
        return;
      }
      showToast(`记忆已更新：${char.name} 已将对话中的情感细节永久记在心里`);
    });

    // 语音麦克风
    $('#btn-voice-toggle').addEventListener('click', () => {
      showToast('正在倾听你的声音... (请对着麦克风说话)');
    });

    // 发送消息
    const sendMsg = () => {
      if (pendingReplies.has(currentCharacter)) {
        showToast('AI 正在回复中，请稍候...');
        return;
      }

      const input = $('#chat-input');
      const text = input.value.trim();
      if (!text) return;

      const sentAt = performance.now();
      const time = getTimeStr();
      appendMessage('user', text, time);
      input.value = '';

      if (!CHAT_HISTORIES[currentCharacter]) CHAT_HISTORIES[currentCharacter] = [];
      CHAT_HISTORIES[currentCharacter].push({ type: 'user', text, time });
      CHARACTERS[currentCharacter].lastMsg = text;
      CHARACTERS[currentCharacter].lastTime = time;

      // 移除空状态容器（如果存在）
      const emptyEl = $('.empty-chat-container');
      if (emptyEl) emptyEl.remove();

      scrollChat();
      renderConversationList();

      if (API_CONFIG.apiKey) {
        triggerDeepSeekReply(sentAt);
      } else {
        triggerOfflineReply(sentAt);
      }
    };

    $('#btn-send').addEventListener('click', sendMsg);
    $('#chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMsg();
      }
    });

    selectChatCharacter(currentCharacter);
  }

  function renderChatMessages() {
    const container = $('#chat-messages');
    container.innerHTML = '';

    const history = CHAT_HISTORIES[currentCharacter] || [];
    const char = CHARACTERS[currentCharacter];
    const memoryBtn = $('#btn-update-memory');

    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-chat-container">
          <div class="empty-sparkle">${escapeHTML(char.emoji)}</div>
          <div class="empty-title">与 ${escapeHTML(char.name)} 开始对话</div>
          <div class="empty-desc">${escapeHTML(char.role)} · 随时准备倾听你的心事，在下方直接输入吧</div>
        </div>
      `;
      if (memoryBtn) memoryBtn.style.opacity = '0.35';
    } else {
      if (memoryBtn) memoryBtn.style.opacity = '1';
      history.forEach((msg) => {
        appendMessage(msg.type, msg.text, msg.time);
      });
    }

    renderPendingReply();
    scrollChat();
  }

  function renderPendingReply() {
    const pending = pendingReplies.has(currentCharacter);
    const container = $('#chat-messages');
    container.setAttribute('aria-busy', String(!!pending));
    if (!pending) return;
    let message = container.querySelector('.liquid-msg-pending');
    if (!message) {
      message = document.createElement('div');
      message.className = 'liquid-msg liquid-msg-ai liquid-msg-pending';
      message.innerHTML = `
        <div class="liquid-bubble"><span class="typing-indicator" role="status"><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span></span></div>
        <div class="liquid-msg-time"></div>
      `;
      message.querySelector('.typing-indicator').setAttribute('aria-label', CHARACTERS[currentCharacter].name + ' 正在输入');
      container.appendChild(message);
    }
  }

  function appendMessage(type, text, time) {
    const container = $('#chat-messages');
    const msgEl = document.createElement('div');
    msgEl.className = `liquid-msg liquid-msg-${type === 'ai' ? 'ai' : 'user'}`;
    msgEl.innerHTML = `
      <div class="liquid-bubble">${escapeHTML(text)}</div>
      <div class="liquid-msg-time">${escapeHTML(time)}</div>
    `;
    container.appendChild(msgEl);
  }

  function startReply(characterId, sentAt) {
    const replyTurn = ++replySequence;
    pendingReplies.set(characterId, replyTurn);
    renderPendingReply();
    scrollChat();

    const queue = [];
    let nextDisplay = sentAt + 1500;
    let timer = null;
    let finished = false;
    let sent = false;

    function publish(text, preview = text) {
      const time = getTimeStr();
      CHAT_HISTORIES[characterId].push({ type: 'ai', text, time, replyTurn });
      const char = CHARACTERS[characterId];
      char.lastMsg = preview;
      char.lastTime = time;
      char.unread = currentCharacter !== characterId || viewState !== 'chat';
      renderConversationList();
    }

    function render() {
      if (currentCharacter === characterId) renderChatMessages();
    }

    function advance() {
      if (timer !== null || pendingReplies.get(characterId) !== replyTurn) return;
      const hasMessage = queue.length > 0;
      if (hasMessage) {
        const wait = nextDisplay - performance.now();
        if (wait > 0) {
          timer = setTimeout(() => { timer = null; advance(); }, Math.ceil(wait));
          return;
        }
        const { text, preview } = queue.shift();
        publish(text, preview);
        sent = true;
      } else if (!finished) return;

      if (finished && !queue.length) pendingReplies.delete(characterId);
      render();
      if (hasMessage) nextDisplay = performance.now() + 1000;
      if (queue.length) advance();
    }

    return {
      enqueue(text, preview) {
        if (!text) return;
        queue.push({ text, preview });
        advance();
      },
      finish() {
        if (!sent && !queue.length) throw new Error('模型没有返回文字');
        finished = true;
        advance();
      },
      fail(error) {
        if (pendingReplies.get(characterId) !== replyTurn) return;
        clearTimeout(timer);
        queue.length = 0;
        pendingReplies.delete(characterId);
        if (!sent) publish('连接 DeepSeek 失败：' + error.message);
        else if (currentCharacter === characterId && viewState === 'chat') showToast('回复连接中断，已显示的消息已保留。');
        render();
      },
    };
  }

  function triggerDeepSeekReply(sentAt) {
    const characterId = currentCharacter;
    const reply = startReply(characterId, sentAt);
    const messages = buildReplyMessages(characterId, CHAT_HISTORIES[characterId], true);
    let tail = '';

    callDeepSeekStream(messages, chunk => {
      const parts = (tail + chunk).split(/\r?\n[\t ]*\r?\n/);
      tail = parts.pop();
      parts.forEach(part => reply.enqueue(part.trim().replace(/\r\n/g, '\n')));
    }, () => {
      reply.enqueue(tail.trim().replace(/\r\n/g, '\n'));
      reply.finish();
    }, reply.fail);
  }

  function triggerOfflineReply(sentAt) {
    const char = CHARACTERS[currentCharacter];
    const replies = AI_REPLIES_OFFLINE[char.style] || AI_REPLIES_OFFLINE.warm;
    const rawReply = replies[Math.floor(Math.random() * replies.length)];
    const reply = startReply(currentCharacter, sentAt);
    reply.enqueue(`${rawReply}\n\n[提示：当前为离线预设回复。点击右上角 DeepSeek 按钮填入 API Key 即可唤醒全量实时 AI 深度陪伴！]`, rawReply);
    reply.finish();
  }

  function scrollChat() {
    const container = $('#chat-messages');
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  // ============================================
  // STATUS HUB & PROACTIVE MESSAGING
  // ============================================

  let proactiveTimer = null;
  let proactiveRequest = 0;
  let proactiveController = null;

  function renderStatusModalUI() {
    const cardInner = $('#my-status-card-inner');
    if (!myStatus) {
      cardInner.innerHTML = `<span style="font-size:0.8rem;color:var(--text-dim)">今日尚未设置状态，在下方选一个吧~</span>`;
    } else {
      cardInner.innerHTML = `
        <span style="font-size:1.6rem">${myStatus.emoji}</span>
        <div>
          <div style="font-size:0.88rem;font-weight:600">${myStatus.name}</div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${escapeHTML(myStatus.desc)}</div>
        </div>
      `;
    }

    const grid = $('#status-grid-compact');
    grid.innerHTML = '';
    STATUS_ITEMS.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'status-compact-item';
      el.innerHTML = `
        <span class="status-compact-emoji">${item.emoji}</span>
        <span class="status-compact-name">${item.name}</span>
      `;
      el.addEventListener('click', () => {
        closeModal('modal-status-hub');
        selectedStatusToPublish = item;
        $('#publish-status-emoji').textContent = item.emoji;
        $('#publish-status-name').textContent = item.name;
        $('#input-status-desc').placeholder = item.desc;
        openModal('modal-publish-status');
      });
      grid.appendChild(el);
    });
  }

  function initStatusModals() {
    $('#btn-close-status-modal').addEventListener('click', () => closeModal('modal-status-hub'));
    $('#btn-cancel-publish-status').addEventListener('click', () => closeModal('modal-publish-status'));

    $('#btn-confirm-publish-status').addEventListener('click', () => {
      if (!selectedStatusToPublish) return;
      const desc = $('#input-status-desc').value.trim() || selectedStatusToPublish.desc;
      myStatus = {
        emoji: selectedStatusToPublish.emoji,
        name: selectedStatusToPublish.name,
        desc: desc,
        time: '刚刚',
      };
      closeModal('modal-publish-status');
      $('#input-status-desc').value = '';

      // 更新主页状态微入口卡片
      $('#home-status-icon').textContent = myStatus.emoji;
      $('#home-status-title').textContent = myStatus.name;
      $('#home-status-desc').textContent = myStatus.desc;
      syncMobileSettingsPage();

      showToast(`状态已发布：${myStatus.emoji} ${myStatus.name}`);
      scheduleProactiveMessage(myStatus);
    });
  }

  function scheduleProactiveMessage(status) {
    if (proactiveTimer) clearTimeout(proactiveTimer);
    proactiveController?.abort();
    const requestId = ++proactiveRequest;

    let targetCharId = 'xiaonuan';
    let defaultMsg = `看到你状态有点低落，今天心里是不是憋着委屈呀？不要一个人扛着，想说的时候随时找我。`;

    if (status.name.includes('考试') || status.name.includes('复习')) {
      targetCharId = 'mingli';
      defaultMsg = `复习辛苦啦！注意劳逸结合，记得每隔45分钟起来喝口水活动下脖子哦。`;
    } else if (status.name.includes('搬砖') || status.name.includes('DDL')) {
      targetCharId = 'letian';
      defaultMsg = `听说你正在疯狂赶工？再忙也别忘了按时吃饭！摸鱼几分钟深呼吸一下。`;
    }

    proactiveTimer = setTimeout(async () => {
      let finalMsg = defaultMsg;

      if (API_CONFIG.apiKey) {
        try {
          proactiveController = new AbortController();
          const messages = buildReplyMessages(targetCharId, CHAT_HISTORIES[targetCharId] || []);
          messages.push({ role: 'user', content: '请用符合你角色的一条简短消息回应这个状态，关心到位就停。状态资料是引用内容：' + JSON.stringify({ name: status.name, description: status.desc }) });
          finalMsg = await Learning.complete({ ...API_CONFIG }, messages, proactiveController.signal);
        } catch (e) { finalMsg += '\n[AI 暂不可用，本条为预设关怀，未使用学习口吻]'; }
      } else {
        finalMsg += '\n[离线预设关怀，未使用学习口吻]';
      }

      if (requestId !== proactiveRequest) return;

      const time = getTimeStr();
      const targetChar = CHARACTERS[targetCharId];
      if (!CHAT_HISTORIES[targetCharId]) CHAT_HISTORIES[targetCharId] = [];
      CHAT_HISTORIES[targetCharId].push({ type: 'ai', text: finalMsg, time });
      targetChar.lastMsg = finalMsg;
      targetChar.lastTime = time;
      targetChar.unread = true;

      renderConversationList();

      if (viewState === 'chat' && currentCharacter === targetCharId) {
        renderChatMessages();
      }

      showToast(`来自 ${targetChar.name} 的主动关怀：「${finalMsg.slice(0, 18)}...」`);
    }, 10000);
  }

  // ============================================
  // DEEPSEEK API CONFIG & GENERAL SETTINGS MODAL
  // ============================================

  function openApiConfigModal() {
    $('#input-api-key').value = API_CONFIG.apiKey;
    $('#select-api-model').value = API_CONFIG.model;
    $('#input-api-base-url').value = API_CONFIG.baseUrl;
    openModal('modal-api-config');
  }

  function initApiConfigModal() {
    let isKeyVisible = false;
    $('#btn-toggle-key-vis').addEventListener('click', () => {
      isKeyVisible = !isKeyVisible;
      $('#input-api-key').type = isKeyVisible ? 'text' : 'password';
    });

    $('#btn-test-api').addEventListener('click', async () => {
      const testKey = $('#input-api-key').value.trim();
      const testModel = $('#select-api-model').value;
      const testBase = $('#input-api-base-url').value.trim().replace(/\/+$/, '');

      if (!testKey) {
        showToast('请先输入 DeepSeek API Key');
        return;
      }

      showToast('正在向 DeepSeek 发起探测测试...');
      const startTime = Date.now();

      try {
        const resp = await fetch(`${testBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testKey}`,
          },
          body: JSON.stringify({
            model: testModel,
            messages: [{ role: 'user', content: 'hi' }],
            max_tokens: 5,
          }),
        });

        const elapsed = Date.now() - startTime;
        if (resp.ok) {
          showToast(`连接成功！响应延迟: ${elapsed}ms`);
        } else {
          let errText = `连接失败 (HTTP ${resp.status})`;
          try {
            const errData = await resp.json();
            if (errData?.error?.message) errText = errData.error.message;
          } catch (e) {}
          showToast(errText);
        }
      } catch (err) {
        showToast(`网络异常：${err.message}`);
      }
    });

    $('#btn-save-api').addEventListener('click', () => {
      const newKey = $('#input-api-key').value.trim();
      const newModel = $('#select-api-model').value;
      const newBase = $('#input-api-base-url').value.trim();

      API_CONFIG.apiKey = newKey;
      API_CONFIG.model = newModel;
      API_CONFIG.baseUrl = newBase || 'https://api.deepseek.com';

      localStorage.setItem('deepseek_api_key', API_CONFIG.apiKey);
      localStorage.setItem('deepseek_model', API_CONFIG.model);
      localStorage.setItem('deepseek_base_url', API_CONFIG.baseUrl);

      updateApiStatusUI();
      closeModal('modal-api-config');
      showToast(newKey ? '系统设置已保存，DeepSeek 已激活！' : '系统设置已保存');
    });

    $('#modal-api-config').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal('modal-api-config');
    });

    updateApiStatusUI();
  }

  function updateApiStatusUI() {
    const isConnected = !!API_CONFIG.apiKey;
    const dot = $('#api-status-dot');
    const label = $('#api-status-label');
    if (dot) dot.classList.toggle('connected', isConnected);
    if (label) label.textContent = isConnected ? 'DeepSeek 在线' : '未连接 AI';
    syncMobileSettingsPage();
  }

  // ============================================
  // GLOBAL CHAT BACKGROUND & THEMES (收录进通用设置)
  // ============================================

  function initThemeModal() {
    applyColorMode(currentColorMode);
    $$('button[data-color-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        applyColorMode(button.dataset.colorMode);
        showToast(currentColorMode === 'light' ? '已切换为日间模式' : '已切换为夜间模式');
      });
    });
    $('#btn-close-bg-modal').addEventListener('click', () => closeModal('modal-chat-theme'));
    $('#modal-chat-theme').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeModal('modal-chat-theme');
    });
    document.body.classList.remove('has-custom-bg');
    document.body.style.removeProperty('--custom-bg-image');
    applyTheme(currentTheme);

    applyChatBackgroundForCharacter(currentCharacter);

    // 预设主题点击
    $$('.bg-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        clearCustomBgState();
        $$('.bg-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        const theme = opt.dataset.theme;
        applyTheme(theme);
        showToast(`已切换为 ${opt.querySelector('span').textContent}`);
      });
    });

    // 触发全局本地照片上传
    $('#btn-trigger-upload-bg').addEventListener('click', () => {
      $('#input-custom-bg').click();
    });

    // 全局文件选择处理
    $('#input-custom-bg').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('请选择有效的图片文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        try {
          localStorage.setItem('liquid_custom_bg', dataUrl);
        } catch (err) {
          console.warn('图片较大，已在当前会话中生效');
        }
        applyCustomBg(dataUrl);
        showToast('全局聊天背景相片已生效');
      };
      reader.readAsDataURL(file);
    });

    // 清除全局自定义照片背景
    $('#btn-clear-custom-bg').addEventListener('click', () => {
      clearCustomBgState();
      applyTheme(currentTheme);
      showToast('已恢复预设聊天背景氛围');
    });
  }

  function applyColorMode(mode) {
    currentColorMode = mode === 'light' ? 'light' : 'dark';
    document.body.dataset.colorMode = currentColorMode;
    localStorage.setItem('liquid_color_mode', currentColorMode);
    $$('button[data-color-mode]').forEach((button) => {
      const active = button.dataset.colorMode === currentColorMode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('liquid_theme', theme);
    document.body.className = `theme-${theme}${isMobilePreview ? ' mobile-preview-mode' : ''}`;

    $$('.bg-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.theme === theme);
    });
    syncMobileSettingsPage();
  }

  function applyCustomBg(dataUrl) {
    const chatPane = $('#wechat-chat-pane');
    if (chatPane) {
      chatPane.style.setProperty('--chat-custom-bg-image', `url("${dataUrl}")`);
      chatPane.classList.add('has-custom-chat-bg');
    }
    $('#custom-bg-info-row').style.display = 'flex';
    $('#upload-bg-btn-text').textContent = '更换自定义相片背景';
    $$('.bg-option').forEach((o) => o.classList.remove('selected'));
  }

  function clearCustomBgState() {
    localStorage.removeItem('liquid_custom_bg');
    const chatPane = $('#wechat-chat-pane');
    if (chatPane) {
      chatPane.classList.remove('has-custom-chat-bg');
      chatPane.style.removeProperty('--chat-custom-bg-image');
    }
    $('#custom-bg-info-row').style.display = 'none';
    $('#upload-bg-btn-text').textContent = '上传本地照片做全局聊天背景';
  }

  // ============================================
  // CHARACTER SETTINGS (右上角 ··· 弹窗：编辑人设Prompt + 专属聊天背景)
  // ============================================

  function initCharacterSettingsModal() {
    const btnOpen = $('#btn-char-detail-settings');
    if (!btnOpen) return;

    btnOpen.addEventListener('click', () => {
      const char = CHARACTERS[currentCharacter];
      if (!char) return;

      $('#char-modal-title').textContent = `角色人设与聊天设置 · ${char.name}`;
      $('#char-modal-avatar-preview').textContent = char.emoji;
      $('#char-modal-name-input').value = char.name;
      $('#char-modal-role-input').value = char.role;

      const currentPrompt = CHARACTER_PROMPTS[currentCharacter] || DEFAULT_PROMPTS[currentCharacter] || '';
      $('#char-modal-prompt-input').value = currentPrompt;

      // 检查当前角色是否有专属聊天背景
      const dedicatedBg = localStorage.getItem('chat_bg_' + currentCharacter);
      const clearBtn = $('#btn-char-clear-bg');
      const uploadText = $('#char-upload-bg-text');

      if (dedicatedBg) {
        clearBtn.style.display = 'block';
        uploadText.textContent = '更换专属聊天背景照片';
      } else {
        clearBtn.style.display = 'none';
        uploadText.textContent = '上传 TA 的专属聊天相片';
      }

      openModal('modal-character-settings');
    });

    // 恢复默认人设
    $('#btn-reset-char-prompt').addEventListener('click', () => {
      const def = DEFAULT_PROMPTS[currentCharacter] || `你叫“${CHARACTERS[currentCharacter]?.name || '伴友'}”，请始终保持温柔共情的交流风格。`;
      $('#char-modal-prompt-input').value = def;
      showToast('已填入该角色的默认人设 Prompt');
    });

    // 上传角色专属背景照片
    $('#btn-char-upload-bg').addEventListener('click', () => {
      $('#input-char-custom-bg').click();
    });

    $('#input-char-custom-bg').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('请选择有效的图片文件');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        try {
          localStorage.setItem('chat_bg_' + currentCharacter, dataUrl);
        } catch (err) {
          console.warn('图片较大，已在当前会话中生效');
        }
        applyCustomBg(dataUrl);
        $('#btn-char-clear-bg').style.display = 'block';
        $('#char-upload-bg-text').textContent = '更换专属聊天背景照片';
        showToast(`已为「${CHARACTERS[currentCharacter].name}」更新专属聊天背景`);
      };
      reader.readAsDataURL(file);
    });

    // 清除角色专属背景
    $('#btn-char-clear-bg').addEventListener('click', () => {
      localStorage.removeItem('chat_bg_' + currentCharacter);
      $('#btn-char-clear-bg').style.display = 'none';
      $('#char-upload-bg-text').textContent = '上传 TA 的专属聊天相片';

      // 恢复使用全局背景或主题背景
      const globalBg = localStorage.getItem('liquid_custom_bg');
      if (globalBg) {
        applyCustomBg(globalBg);
      } else {
        clearCustomBgState();
      }
      showToast('已恢复使用全局默认聊天背景');
    });

    $('#btn-cancel-char-settings').addEventListener('click', () => closeModal('modal-character-settings'));
    $('#modal-character-settings').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal('modal-character-settings');
    });

    // 保存人设与信息
    $('#btn-save-char-settings').addEventListener('click', () => {
      const char = CHARACTERS[currentCharacter];
      if (!char) return;

      const newName = $('#char-modal-name-input').value.trim();
      const newRole = $('#char-modal-role-input').value.trim();
      const newPrompt = $('#char-modal-prompt-input').value.trim();

      if (!newName) {
        showToast('角色名称不能为空');
        return;
      }

      try {
        saveCharacterRecord({ ...characterRecord(currentCharacter), name: newName, role: newRole || char.role, basePrompt: newPrompt });
      } catch (error) { showToast('保存失败，原人设保留：' + error.message); return; }

      $('#chat-char-name').textContent = newName;
      renderConversationList();

      closeModal('modal-character-settings');
      showToast(`角色「${newName}」人设与背景已成功保存！`);
    });
  }

  // ============================================
  // PROFILE & CHARACTER CREATION
  // ============================================

  function initProfileAndCreate() {
    $$('.avatar-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        $$('.avatar-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        tempAvatarSelect = opt.dataset.avatar;
      });
    });

    $('#btn-cancel-edit-profile').addEventListener('click', () => closeModal('modal-edit-profile'));
    $('#btn-save-edit-profile').addEventListener('click', () => {
      const name = $('#input-edit-nickname').value.trim();
      const bio = $('#input-edit-bio').value.trim();
      if (!name) return showToast('昵称不能为空');

      currentUser.name = name;
      currentUser.avatar = tempAvatarSelect;
      currentUser.bio = bio;

      $('#home-user-avatar').textContent = currentUser.avatar;
      $('#home-user-name').textContent = currentUser.name;
      const dockAvatar = $('#dock-user-avatar');
      if (dockAvatar) dockAvatar.textContent = currentUser.avatar;
      syncMobileSettingsPage();
      closeModal('modal-edit-profile');
      showToast('个人资料已更新');
    });

    $('#btn-cancel-create').addEventListener('click', () => closeModal('modal-create-character'));
    $('#btn-confirm-create').addEventListener('click', () => {
      const name = $('#new-char-name').value.trim();
      const role = $('#new-char-role').value.trim() || '定制伙伴';
      const emoji = $('#new-char-emoji').value.trim() || '✨';
      const style = $('#new-char-style').value;
      if (!name) return showToast('请输入角色名称');

      const id = 'custom_' + Date.now();
      const defaultCustomPrompt = `你叫“${name}”，是用户的“${role}”。请始终保持真挚、有深度的情感陪伴交流，与用户自然对话。`;
      try {
        saveCharacterRecord({ id, name, emoji, role, style, basePrompt: defaultCustomPrompt, styleProfile: null, previousStyleProfile: null });
      } catch (error) { showToast('角色未创建，保存失败：' + error.message); return; }
      DEFAULT_PROMPTS[id] = defaultCustomPrompt;
      CHAT_HISTORIES[id] = [];

      closeModal('modal-create-character');
      $('#new-char-name').value = '';
      $('#new-char-role').value = '';

      renderConversationList();
      enterChat(id);
      showToast(`角色「${name}」已创建，开始你们的第一段对话吧`);
    });
  }

  // ============================================
  // MAIN INITIALIZATION
  // ============================================

  function init() {
    restoreCharacters();
    initDeviceToggle();
    initConversationList();
    initChat();
    initStatusModals();
    initApiConfigModal();
    initThemeModal();
    initCharacterSettingsModal();
    initProfileAndCreate();
    learningUI = window.initStyleLearningUI({
      getCurrentCharacter: () => currentCharacter,
      getCharacter: characterRecord,
      saveCharacter: saveCharacterRecord,
      getConfig: () => API_CONFIG,
      getUserName: () => currentUser.name,
      closeCharacterSettings: () => closeModal('modal-character-settings'),
      toast: showToast,
    });

    // 默认打开状态：如果处于手机模式，显示聊天主页列表
    setViewState('home');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
