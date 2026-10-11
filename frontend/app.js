/**
 * Gemini AI Chatbot - Client Application Logic with Supabase Persistence
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    conversationHistory: [],
    currentConversationId: null,
    selectedModel: 'gemini-1.5-flash',
    temperature: 0.7,
    systemInstruction: '',
    streamEnabled: true,
    customApiKey: localStorage.getItem('gemini_custom_api_key') || '',
    isGenerating: false,
    abortController: null,
    hasServerKey: false,
    isSupabaseConnected: false,
    conversations: []
  };

  // Helper to generate a UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // DOM Elements - Chat Flow
  const messagesFlow = document.getElementById('messages-flow');
  const welcomeHero = document.getElementById('welcome-hero');
  const chatMain = document.getElementById('chat-main');
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');
  const stopGenBtn = document.getElementById('stop-gen-btn');
  const clearChatBtn = document.getElementById('clear-chat-btn');
  const exportChatBtn = document.getElementById('export-chat-btn');
  
  // Sidebar & History Elements
  const chatSidebar = document.getElementById('chat-sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
  const newChatBtn = document.getElementById('new-chat-btn');
  const conversationsList = document.getElementById('conversations-list');
  const historyCount = document.getElementById('history-count');
  const dbStatusDot = document.getElementById('db-status-dot');
  const dbStatusText = document.getElementById('db-status-text');
  const supabaseStatusPill = document.getElementById('supabase-status-pill');

  // Model Badges & Selectors
  const currentModelDisplay = document.getElementById('current-model-display');
  const activeModelChip = document.getElementById('active-model-chip');
  const chipModelText = document.getElementById('chip-model-text');
  const modelBadgeBtn = document.getElementById('model-badge-btn');
  const modelSelect = document.getElementById('model-select');
  
  // Settings & Modal Elements
  const settingsToggleBtn = document.getElementById('settings-toggle-btn');
  const settingsModal = document.getElementById('settings-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility-btn');
  const saveKeyToEnvBtn = document.getElementById('save-key-to-env-btn');
  const clearCustomKeyBtn = document.getElementById('clear-custom-key-btn');
  const keyStatusMsg = document.getElementById('key-status-msg');
  const keyPillBtn = document.getElementById('key-pill-btn');
  const keyPillLabel = document.getElementById('key-pill-label');
  const apiNoticeBanner = document.getElementById('api-notice-banner');
  const bannerSetupKeyBtn = document.getElementById('banner-setup-key-btn');
  const bannerCloseBtn = document.getElementById('banner-close-btn');
  const temperatureSlider = document.getElementById('temperature-slider');
  const tempValueBadge = document.getElementById('temp-value-badge');
  const systemPromptInput = document.getElementById('system-prompt-input');
  const streamToggle = document.getElementById('stream-toggle');
  const suggestionsGrid = document.getElementById('suggestions-grid');
  const charCount = document.getElementById('char-count');
  const toastContainer = document.getElementById('toast-container');

  // Supabase Inputs in Modal
  const supabaseUrlInput = document.getElementById('supabase-url-input');
  const supabaseKeyInput = document.getElementById('supabase-key-input');
  const saveSupabaseBtn = document.getElementById('save-supabase-btn');
  const supabaseStatusMsg = document.getElementById('supabase-status-msg');

  // Configure Marked Markdown Renderer with Syntax Highlighting
  if (window.marked && window.hljs) {
    const renderer = new marked.Renderer();
    
    renderer.code = function(code, language) {
      const validLang = !!(language && hljs.getLanguage(language));
      const highlighted = validLang 
        ? hljs.highlight(code, { language }).value 
        : hljs.highlightAuto(code).value;
      const displayLang = (language || 'code').toUpperCase();
      const escapedCode = encodeURIComponent(code);

      return `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-lang">${displayLang}</span>
            <button class="copy-code-btn" data-code="${escapedCode}" title="Copy code snippet">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="hljs ${validLang ? language : ''}">${highlighted}</code></pre>
        </div>
      `;
    };

    renderer.link = function(href, title, text) {
      const titleAttr = title ? ` title="${title}"` : '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${text}</a>`;
    };

    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    });
  }

  // Toast Notifications
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Auto-resize Textarea
  function autoResizeTextarea() {
    userInput.style.height = 'auto';
    const newHeight = Math.min(userInput.scrollHeight, 180);
    userInput.style.height = newHeight + 'px';

    const count = userInput.value.length;
    if (count > 50) {
      charCount.classList.remove('hidden');
      charCount.textContent = `${count} chars`;
    } else {
      charCount.classList.add('hidden');
    }
  }

  userInput.addEventListener('input', autoResizeTextarea);

  // Send message on Enter (Shift+Enter for newline)
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!state.isGenerating && userInput.value.trim()) {
        chatForm.dispatchEvent(new Event('submit'));
      }
    }
  });

  // Sidebar Controls
  sidebarToggleBtn.addEventListener('click', () => {
    chatSidebar.classList.toggle('collapsed');
  });

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
      chatSidebar.classList.add('collapsed');
    });
  }

  // Check Server Status & Supabase Connection
  async function checkServerStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      state.hasServerKey = data.isKeyConfigured;

      // Supabase status
      if (data.supabase && data.supabase.isConfigured) {
        state.isSupabaseConnected = true;
        dbStatusDot.className = 'db-status-dot online';
        dbStatusText.textContent = 'Connected (Cloud DB)';
        loadConversationsList();
      } else {
        state.isSupabaseConnected = false;
        dbStatusDot.className = 'db-status-dot offline';
        dbStatusText.textContent = 'Not Connected (Local)';
      }

      updateKeyBadgeStatus();
    } catch (err) {
      console.warn('Failed to fetch server status:', err);
    }
  }

  function updateKeyBadgeStatus() {
    const hasAnyKey = state.hasServerKey || !!state.customApiKey;
    if (hasAnyKey) {
      keyPillBtn.className = 'header-pill key-pill active';
      keyPillLabel.textContent = 'API Key Configured';
      apiNoticeBanner.classList.add('hidden');
    } else {
      keyPillBtn.className = 'header-pill key-pill missing';
      keyPillLabel.textContent = 'Setup API Key';
      apiNoticeBanner.classList.remove('hidden');
    }
  }

  // Load Conversations from Supabase
  async function loadConversationsList() {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      state.conversations = data.conversations || [];
      renderConversationsList();
    } catch (err) {
      console.warn('Could not load conversations:', err);
    }
  }

  function renderConversationsList() {
    historyCount.textContent = state.conversations.length;
    if (state.conversations.length === 0) {
      conversationsList.innerHTML = `<div class="empty-history">No conversations saved yet</div>`;
      return;
    }

    conversationsList.innerHTML = '';
    for (const conv of state.conversations) {
      const item = document.createElement('div');
      item.className = `conversation-item ${conv.id === state.currentConversationId ? 'active' : ''}`;
      item.dataset.id = conv.id;

      const titleSpan = document.createElement('span');
      titleSpan.className = 'conv-title-text';
      titleSpan.textContent = conv.title || 'Untitled Chat';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-conv-btn';
      deleteBtn.title = 'Delete conversation';
      deleteBtn.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      `;

      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConversation(conv.id);
      });

      item.appendChild(titleSpan);
      item.appendChild(deleteBtn);

      item.addEventListener('click', () => {
        selectConversation(conv.id);
      });

      conversationsList.appendChild(item);
    }
  }

  // Select and Load a Conversation from Supabase
  async function selectConversation(id) {
    if (state.isGenerating) return;
    try {
      state.currentConversationId = id;
      renderConversationsList();

      const res = await fetch(`/api/conversations/${id}`);
      if (!res.ok) throw new Error('Could not load conversation');
      const convData = await res.json();

      welcomeHero.classList.add('hidden');
      messagesFlow.innerHTML = '';
      state.conversationHistory = [];

      for (const msg of (convData.messages || [])) {
        state.conversationHistory.push({ role: msg.role, content: msg.content });
        if (msg.role === 'user') {
          appendUserMessage(msg.content);
        } else {
          const { bubble, bubbleWrap } = appendModelMessagePlaceholder();
          finalizeModelMessage(bubble, bubbleWrap, msg.content);
        }
      }

      scrollToBottom();
      if (window.innerWidth < 860) {
        chatSidebar.classList.add('collapsed');
      }
    } catch (err) {
      showToast('Error loading conversation: ' + err.message, 'error');
    }
  }

  // Delete Conversation
  async function deleteConversation(id) {
    if (!confirm('Delete this conversation?')) return;
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        state.conversations = state.conversations.filter(c => c.id !== id);
        renderConversationsList();
        if (state.currentConversationId === id) {
          startNewChat();
        }
        showToast('Conversation deleted', 'info');
      }
    } catch (err) {
      showToast('Failed to delete conversation', 'error');
    }
  }

  // Start a New Chat Session
  function startNewChat() {
    if (state.isGenerating) return;
    state.currentConversationId = generateUUID();
    state.conversationHistory = [];
    messagesFlow.innerHTML = '';
    welcomeHero.classList.remove('hidden');
    renderConversationsList();
    userInput.focus();
  }

  newChatBtn.addEventListener('click', startNewChat);

  // Model Selection
  function setModel(modelId) {
    state.selectedModel = modelId;
    modelSelect.value = modelId;
    
    let modelName = modelId;
    if (modelId === 'gemini-1.5-flash') modelName = 'Gemini 1.5 Flash';
    else if (modelId === 'gemini-1.5-pro') modelName = 'Gemini 1.5 Pro';
    else if (modelId === 'gemini-2.0-flash') modelName = 'Gemini 2.0 Flash';

    currentModelDisplay.textContent = modelName;
    chipModelText.textContent = modelId;
    localStorage.setItem('gemini_preferred_model', modelId);
  }

  modelSelect.addEventListener('change', (e) => setModel(e.target.value));
  modelBadgeBtn.addEventListener('click', () => { openSettingsModal(); modelSelect.focus(); });
  activeModelChip.addEventListener('click', () => { openSettingsModal(); modelSelect.focus(); });
  supabaseStatusPill.addEventListener('click', openSettingsModal);

  // Settings Modal Controls
  function openSettingsModal() {
    apiKeyInput.value = state.customApiKey;
    temperatureSlider.value = state.temperature;
    tempValueBadge.textContent = state.temperature;
    systemPromptInput.value = state.systemInstruction;
    streamToggle.checked = state.streamEnabled;
    modelSelect.value = state.selectedModel;
    keyStatusMsg.textContent = state.hasServerKey ? '✓ Server .env Gemini API key active' : '';
    keyStatusMsg.className = 'key-status-msg success';

    supabaseStatusMsg.textContent = state.isSupabaseConnected ? '✓ Supabase PostgreSQL active & storing chats' : '⚠️ Supabase not connected yet';
    supabaseStatusMsg.className = state.isSupabaseConnected ? 'key-status-msg success' : 'key-status-msg';

    settingsModal.classList.remove('hidden');
  }

  function closeSettingsModal() {
    settingsModal.classList.add('hidden');
  }

  settingsToggleBtn.addEventListener('click', openSettingsModal);
  keyPillBtn.addEventListener('click', openSettingsModal);
  bannerSetupKeyBtn.addEventListener('click', openSettingsModal);
  modalCloseBtn.addEventListener('click', closeSettingsModal);
  bannerCloseBtn.addEventListener('click', () => apiNoticeBanner.classList.add('hidden'));

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettingsModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsModal.classList.contains('hidden')) closeSettingsModal();
  });

  toggleKeyVisibilityBtn.addEventListener('click', () => {
    const isPass = apiKeyInput.getAttribute('type') === 'password';
    apiKeyInput.setAttribute('type', isPass ? 'text' : 'password');
    toggleKeyVisibilityBtn.textContent = isPass ? '🔒' : '👁️';
  });

  temperatureSlider.addEventListener('input', (e) => {
    state.temperature = parseFloat(e.target.value);
    tempValueBadge.textContent = state.temperature;
  });

  // Save Gemini Key to Server .env
  saveKeyToEnvBtn.addEventListener('click', async () => {
    const val = apiKeyInput.value.trim();
    if (!val) {
      keyStatusMsg.textContent = 'Please enter an API key first.';
      keyStatusMsg.className = 'key-status-msg error';
      return;
    }

    try {
      saveKeyToEnvBtn.disabled = true;
      saveKeyToEnvBtn.textContent = 'Saving...';

      const res = await fetch('/api/save-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: val })
      });

      const data = await res.json();
      if (res.ok) {
        state.hasServerKey = true;
        state.customApiKey = val;
        localStorage.setItem('gemini_custom_api_key', val);
        keyStatusMsg.textContent = '✓ Saved to server .env & session!';
        keyStatusMsg.className = 'key-status-msg success';
        updateKeyBadgeStatus();
        showToast('Gemini API Key saved!', 'success');
      } else {
        keyStatusMsg.textContent = data.error || 'Failed to save key.';
        keyStatusMsg.className = 'key-status-msg error';
      }
    } catch {
      keyStatusMsg.textContent = 'Network error saving key.';
      keyStatusMsg.className = 'key-status-msg error';
    } finally {
      saveKeyToEnvBtn.disabled = false;
      saveKeyToEnvBtn.textContent = 'Save Gemini Key';
    }
  });

  // Save Supabase Configuration
  saveSupabaseBtn.addEventListener('click', async () => {
    const url = supabaseUrlInput.value.trim();
    const key = supabaseKeyInput.value.trim();

    if (!url || !key) {
      supabaseStatusMsg.textContent = 'Please enter both Supabase URL and Anon Key.';
      supabaseStatusMsg.className = 'key-status-msg error';
      return;
    }

    try {
      saveSupabaseBtn.disabled = true;
      saveSupabaseBtn.textContent = 'Connecting...';

      const res = await fetch('/api/save-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key })
      });

      const data = await res.json();
      if (res.ok) {
        state.isSupabaseConnected = true;
        dbStatusDot.className = 'db-status-dot online';
        dbStatusText.textContent = 'Connected (Cloud DB)';
        supabaseStatusMsg.textContent = '✓ Connected to Supabase!';
        supabaseStatusMsg.className = 'key-status-msg success';
        showToast('Connected to Supabase Database!', 'success');
        loadConversationsList();
      } else {
        supabaseStatusMsg.textContent = data.error || 'Failed to connect.';
        supabaseStatusMsg.className = 'key-status-msg error';
      }
    } catch (err) {
      supabaseStatusMsg.textContent = 'Network error: ' + err.message;
      supabaseStatusMsg.className = 'key-status-msg error';
    } finally {
      saveSupabaseBtn.disabled = false;
      saveSupabaseBtn.textContent = 'Save & Connect Supabase';
    }
  });

  clearCustomKeyBtn.addEventListener('click', () => {
    apiKeyInput.value = '';
    state.customApiKey = '';
    localStorage.removeItem('gemini_custom_api_key');
    keyStatusMsg.textContent = 'Custom key reset.';
    keyStatusMsg.className = 'key-status-msg';
    updateKeyBadgeStatus();
  });

  saveSettingsBtn.addEventListener('click', () => {
    const customKey = apiKeyInput.value.trim();
    if (customKey) {
      state.customApiKey = customKey;
      localStorage.setItem('gemini_custom_api_key', customKey);
    }
    state.selectedModel = modelSelect.value;
    setModel(state.selectedModel);
    state.temperature = parseFloat(temperatureSlider.value);
    state.systemInstruction = systemPromptInput.value.trim();
    state.streamEnabled = streamToggle.checked;
    
    updateKeyBadgeStatus();
    closeSettingsModal();
    showToast('Settings saved', 'info');
  });

  function scrollToBottom(smooth = true) {
    chatMain.scrollTo({
      top: chatMain.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  // Create Message Elements
  function appendUserMessage(text) {
    welcomeHero.classList.add('hidden');

    const row = document.createElement('div');
    row.className = 'message-row user';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar user-avatar';
    avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    const bubbleWrap = document.createElement('div');
    bubbleWrap.className = 'msg-bubble-wrap';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;

    bubbleWrap.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(bubbleWrap);

    messagesFlow.appendChild(row);
    scrollToBottom();
  }

  function appendModelMessagePlaceholder() {
    const row = document.createElement('div');
    row.className = 'message-row model';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar gemini-avatar';
    avatar.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="url(#sparkle-grad)" />
      </svg>
    `;

    const bubbleWrap = document.createElement('div');
    bubbleWrap.className = 'msg-bubble-wrap';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    bubble.appendChild(typingIndicator);

    bubbleWrap.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(bubbleWrap);

    messagesFlow.appendChild(row);
    scrollToBottom();

    return { row, bubble, bubbleWrap };
  }

  function finalizeModelMessage(bubble, bubbleWrap, fullText) {
    bubble.innerHTML = marked.parse(fullText);

    const metaBar = document.createElement('div');
    metaBar.className = 'msg-meta-bar';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timeSpan = document.createElement('span');
    timeSpan.textContent = time;

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      <span>Copy message</span>
    `;

    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(fullText).then(() => {
        copyBtn.innerHTML = `<span>✓ Copied!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy message</span>
          `;
        }, 2000);
      });
    });

    metaBar.appendChild(timeSpan);
    metaBar.appendChild(copyBtn);
    bubbleWrap.appendChild(metaBar);

    scrollToBottom();
  }

  // Handle Copy Code Click
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-code-btn');
    if (!copyBtn) return;

    const rawCode = decodeURIComponent(copyBtn.dataset.code || '');
    navigator.clipboard.writeText(rawCode).then(() => {
      const label = copyBtn.querySelector('span');
      if (label) label.textContent = 'Copied!';
      copyBtn.style.color = '#38ef7d';
      setTimeout(() => {
        if (label) label.textContent = 'Copy';
        copyBtn.style.color = '';
      }, 2000);
    });
  });

  // Stop Generation Handler
  stopGenBtn.addEventListener('click', () => {
    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }
  });

  function setGeneratingState(isGenerating) {
    state.isGenerating = isGenerating;
    sendBtn.disabled = isGenerating;
    if (isGenerating) {
      stopGenBtn.classList.remove('hidden');
    } else {
      stopGenBtn.classList.add('hidden');
    }
  }

  // Main Submit Handler
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (state.isGenerating) return;

    const message = userInput.value.trim();
    if (!message) return;

    // Ensure we have a conversationId for Supabase tracking
    if (!state.currentConversationId) {
      state.currentConversationId = generateUUID();
    }

    // Reset input
    userInput.value = '';
    userInput.style.height = 'auto';
    charCount.classList.add('hidden');

    appendUserMessage(message);
    state.conversationHistory.push({ role: 'user', content: message });

    const { bubble, bubbleWrap } = appendModelMessagePlaceholder();
    setGeneratingState(true);

    state.abortController = new AbortController();
    let accumulatedText = '';

    const headers = { 'Content-Type': 'application/json' };
    if (state.customApiKey) {
      headers['x-gemini-api-key'] = state.customApiKey;
    }

    const payload = {
      message: message,
      history: state.conversationHistory.slice(0, -1),
      model: state.selectedModel,
      systemInstruction: state.systemInstruction,
      temperature: state.temperature,
      conversationId: state.currentConversationId
    };

    try {
      if (state.streamEnabled) {
        // SSE Streaming
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          signal: state.abortController.signal
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server error (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let isFirstChunk = true;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunkStr = decoder.decode(value, { stream: true });
            const lines = chunkStr.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataPart = trimmed.slice(6);
                if (dataPart === '[DONE]') {
                  done = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(dataPart);
                  if (parsed.error) throw new Error(parsed.error);
                  if (parsed.text) {
                    if (isFirstChunk) {
                      bubble.innerHTML = '';
                      isFirstChunk = false;
                    }
                    accumulatedText += parsed.text;
                    bubble.innerHTML = marked.parse(accumulatedText);
                    scrollToBottom(false);
                  }
                } catch (pe) {
                  if (pe.message && !pe.message.includes('JSON')) throw pe;
                }
              }
            }
          }
        }
      } else {
        // Synchronous fallback
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload),
          signal: state.abortController.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Server error (${response.status})`);
        accumulatedText = data.text || '';
      }

      if (!accumulatedText) {
        accumulatedText = '(No response generated)';
      }

      finalizeModelMessage(bubble, bubbleWrap, accumulatedText);
      state.conversationHistory.push({ role: 'model', content: accumulatedText });

      // Refresh sidebar conversation list in background if Supabase is connected
      if (state.isSupabaseConnected) {
        setTimeout(loadConversationsList, 500);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        accumulatedText = accumulatedText ? (accumulatedText + '\n\n*(Generation stopped)*') : '*(Generation stopped by user)*';
        finalizeModelMessage(bubble, bubbleWrap, accumulatedText);
        state.conversationHistory.push({ role: 'model', content: accumulatedText });
      } else {
        console.error('Chat error:', err);
        bubble.innerHTML = `
          <div style="color: #ff6b6b; display: flex; align-items: flex-start; gap: 8px;">
            <span>⚠️</span>
            <div>
              <strong>Error generating response:</strong><br>
              ${err.message || 'Unknown error. Check your API key and connection.'}
            </div>
          </div>
        `;
        showToast(err.message || 'Error occurred', 'error');

        if (err.message && (err.message.includes('API Key') || err.message.includes('API_KEY'))) {
          openSettingsModal();
        }
      }
    } finally {
      setGeneratingState(false);
      state.abortController = null;
      userInput.focus();
    }
  });

  // Suggestion Cards
  if (suggestionsGrid) {
    suggestionsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.suggestion-card');
      if (!card) return;
      const promptText = card.dataset.prompt;
      if (promptText) {
        userInput.value = promptText;
        autoResizeTextarea();
        chatForm.dispatchEvent(new Event('submit'));
      }
    });
  }

  // Clear Chat Flow
  clearChatBtn.addEventListener('click', () => {
    if (state.conversationHistory.length === 0) return;
    if (confirm('Clear the current conversation view?')) {
      startNewChat();
      showToast('View cleared', 'info');
    }
  });

  // Export Chat to Markdown
  exportChatBtn.addEventListener('click', () => {
    if (state.conversationHistory.length === 0) {
      showToast('No messages to export yet', 'info');
      return;
    }

    let markdown = `# Gemini Chatbot Conversation\n`;
    markdown += `*Exported on ${new Date().toLocaleString()}*\n`;
    markdown += `*Model: ${state.selectedModel}*\n\n---\n\n`;

    for (const msg of state.conversationHistory) {
      const roleName = msg.role === 'user' ? '👤 User' : '✨ Gemini';
      markdown += `### ${roleName}\n\n${msg.content}\n\n---\n\n`;
    }

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-chat-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Conversation exported as Markdown', 'success');
  });

  // Initialization
  state.currentConversationId = generateUUID();
  const savedModel = localStorage.getItem('gemini_preferred_model');
  if (savedModel) setModel(savedModel);

  checkServerStatus();
  userInput.focus();
});
