import { CHAT_STORAGE_KEY } from "./data.js";
import { qs, escapeHtml, createId, debounce } from "./utils.js";

const PROMPTS = [
  { id: "searchmode", name: "SearchMode_251124" },
  { id: "ailey-debate", name: "Ailey Debate (v1213)" },
  { id: "ailey-bailey-x", name: "Ailey & Bailey X_251023" }
];

const MAX_SESSIONS = 40;
const MAX_MESSAGES = 40;

function createSession() {
  return {
    id: createId("chat"),
    title: "새 대화",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function normalizeState(raw) {
  const safe = raw && typeof raw === "object" ? raw : {};
  const sessions = Array.isArray(safe.sessions) ? safe.sessions.map((s) => ({
    id: s.id || createId("chat"),
    title: String(s.title || "새 대화"),
    messages: Array.isArray(s.messages)
      ? s.messages.slice(-MAX_MESSAGES).map((msg) => ({
        id: msg?.id || createId("msg"),
        role: msg?.role === "model" ? "model" : "user",
        text: typeof msg?.text === "string" ? msg.text : "",
        ts: msg?.ts || s.updatedAt || Date.now()
      }))
      : [],
    createdAt: s.createdAt || Date.now(),
    updatedAt: s.updatedAt || Date.now()
  })) : [];

  const settings = safe.settings && typeof safe.settings === "object" ? safe.settings : {};

  return {
    activeSessionId: safe.activeSessionId || (sessions[0]?.id ?? null),
    sessions,
    settings: {
      serverUrl: settings.serverUrl || "",
      promptId: settings.promptId || "searchmode",
      thinkingLevel: settings.thinkingLevel || "medium",
      model: settings.model || "gemini-3-flash-preview"
    }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return normalizeState(parsed);
  } catch (_) {
    return normalizeState(null);
  }
}

function saveState(state) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[Chat.save] failed", err);
  }
}

function buildEndpoint(rawUrl) {
  const trimmed = rawUrl.replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api/chat")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/chat`;
  return `${trimmed}/api/chat`;
}

function formatRelativeTime(ts) {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(ts).toLocaleDateString("ko-KR");
}

function renderMarkdown(text) {
  const raw = String(text || "");
  if (window.marked && window.DOMPurify) {
    if (!renderMarkdown._configured) {
      window.marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
      });
      renderMarkdown._configured = true;
    }
    const parsed = window.marked.parse(raw);
    return window.DOMPurify.sanitize(parsed, { USE_PROFILES: { html: true } });
  }
  return escapeHtml(raw).replace(/\n/g, "<br />");
}

function applyHighlights(container) {
  if (!window.hljs || !container) return;
  container.querySelectorAll("pre code").forEach((block) => {
    window.hljs.highlightElement(block);
  });
}

function extractHtmlBlocks(text) {
  const blocks = [];
  const raw = String(text || "");
  const fence = /```html\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fence.exec(raw)) !== null) {
    const html = match[1].trim();
    if (html) blocks.push(html);
  }
  if (!blocks.length) {
    const trimmed = raw.trim();
    if (trimmed.startsWith("<!DOCTYPE html") || trimmed.startsWith("<html")) {
      blocks.push(trimmed);
    }
  }
  return blocks;
}

export function initChat({ showToast } = {}) {
  const toast = (msg) => (showToast ? showToast(msg) : console.log(msg));

  const toggleBtn = qs("#chat-toggle");
  const panel = qs("#chat-panel");
  const closeBtn = qs("#chat-close");

  const tabButtons = Array.from(document.querySelectorAll("[data-chat-tab]"));
  const views = Array.from(document.querySelectorAll("[data-chat-view]"));

  const messagesEl = qs("#chat-messages");
  const inputEl = qs("#chat-input");
  const sendBtn = qs("#chat-send");

  const sessionsEl = qs("#chat-session-list");
  const newBtn = qs("#chat-new");

  const serverUrlEl = qs("#chat-server-url");
  const promptEl = qs("#chat-prompt");
  const thinkingEl = qs("#chat-thinking");
  const modelEl = qs("#chat-model");
  const saveBtn = qs("#chat-save");
  const clearBtn = qs("#chat-clear");

  const canvasOverlay = qs("#canvas-overlay");
  const canvasFrame = qs("#canvas-frame");
  const canvasOpenBtn = qs("#canvas-open");
  const canvasCloseBtn = qs("#canvas-close");

  let state = loadState();
  const scheduleSave = debounce(() => saveState(state), 200);
  let currentHtml = "";

  const applySettingsFromInputs = () => {
    if (serverUrlEl) state.settings.serverUrl = serverUrlEl.value.trim();
    if (promptEl) state.settings.promptId = promptEl.value || "searchmode";
    if (thinkingEl) state.settings.thinkingLevel = thinkingEl.value || "medium";
    if (modelEl) state.settings.model = modelEl.value.trim() || "gemini-3-flash-preview";
  };

  const openCanvas = (html) => {
    if (!canvasOverlay || !canvasFrame) return;
    currentHtml = html || "";
    canvasFrame.srcdoc = currentHtml;
    canvasOverlay.classList.add("open");
  };

  const closeCanvas = () => {
    if (!canvasOverlay || !canvasFrame) return;
    canvasFrame.srcdoc = "";
    canvasOverlay.classList.remove("open");
  };

  const openCanvasTab = () => {
    if (!currentHtml) return;
    const blob = new Blob([currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const ensureSession = () => {
    if (!state.sessions.length) {
      const session = createSession();
      state.sessions.push(session);
      state.activeSessionId = session.id;
    }
    if (!state.activeSessionId || !state.sessions.some((s) => s.id === state.activeSessionId)) {
      state.activeSessionId = state.sessions[0]?.id;
    }
  };

  const getActiveSession = () => state.sessions.find((s) => s.id === state.activeSessionId);

  const trimSessions = () => {
    if (state.sessions.length <= MAX_SESSIONS) return;
    state.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    state.sessions = state.sessions.slice(0, MAX_SESSIONS);
  };

  const renderSessions = () => {
    if (!sessionsEl) return;
    const sorted = [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    sessionsEl.innerHTML = sorted
      .map((session) => {
        const active = session.id === state.activeSessionId ? "active" : "";
        const timeLabel = formatRelativeTime(session.updatedAt || session.createdAt || Date.now());
        return `
          <div class="chat-history-item ${active}" data-session-id="${session.id}">
            <div class="min-w-0">
              <div class="chat-history-title">${escapeHtml(session.title || "새 대화")}</div>
              <div class="chat-history-meta">${timeLabel}</div>
            </div>
            <div class="chat-history-actions">
              <button class="chat-history-btn rename" data-session-rename="${session.id}">NAME</button>
              <button class="chat-history-btn del" data-session-del="${session.id}">DEL</button>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const renderMessages = () => {
    if (!messagesEl) return;
    const session = getActiveSession();
    if (!session) return;
    messagesEl.innerHTML = session.messages
      .map((msg) => {
        const klass = msg.role === "user" ? "user" : "model";
        const html = renderMarkdown(msg.text);
        const hasHtml = extractHtmlBlocks(msg.text).length > 0;
        const htmlBtn = hasHtml
          ? `<button class="chat-html-btn" data-action="open-html" data-msg-id="${msg.id}">HTML 보기</button>`
          : "";
        return `
          <div class="chat-msg ${klass}" data-msg-id="${msg.id}">
            <div class="chat-msg-body">${html}</div>
            ${htmlBtn}
          </div>
        `;
      })
      .join("");
    applyHighlights(messagesEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderSettings = () => {
    if (serverUrlEl) serverUrlEl.value = state.settings.serverUrl || "";
    if (promptEl) {
      promptEl.innerHTML = PROMPTS.map((prompt) => `<option value="${prompt.id}">${prompt.name}</option>`).join("");
      promptEl.value = state.settings.promptId || "searchmode";
    }
    if (thinkingEl) thinkingEl.value = state.settings.thinkingLevel || "medium";
    if (modelEl) modelEl.value = state.settings.model || "gemini-3-flash-preview";
  };

  const setTab = (tabId) => {
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.chatTab === tabId));
    views.forEach((view) => view.classList.toggle("active", view.dataset.chatView === tabId));
  };

  const createMessage = (role, text) => ({
    id: createId("msg"),
    role,
    text,
    ts: Date.now()
  });

  const addMessage = (role, text) => {
    const session = getActiveSession();
    if (!session) return;
    session.messages.push(createMessage(role, text));
    if (session.messages.length > MAX_MESSAGES) {
      session.messages = session.messages.slice(-MAX_MESSAGES);
    }
    if (session.title === "새 대화" && role === "user") {
      session.title = text.slice(0, 18);
    }
    session.updatedAt = Date.now();
    scheduleSave();
    renderMessages();
    renderSessions();
  };

  const sendMessage = async () => {
    const text = inputEl?.value?.trim();
    if (!text) return;
    applySettingsFromInputs();
    const endpoint = buildEndpoint(state.settings.serverUrl || "");
    if (!endpoint) {
      toast("서버 URL을 먼저 입력해줘");
      return;
    }
    inputEl.value = "";
    addMessage("user", text);

    if (sendBtn) sendBtn.disabled = true;
    const thinkingMsg = "...";
    addMessage("model", thinkingMsg);

    try {
      const session = getActiveSession();
      if (!session) return;
      const payload = {
        promptId: state.settings.promptId || "searchmode",
        thinkingLevel: state.settings.thinkingLevel || "medium",
        model: state.settings.model || "gemini-3-flash-preview",
        messages: session.messages
          .filter((msg) => msg.text !== thinkingMsg)
          .map((msg) => ({ role: msg.role, text: msg.text }))
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "요청 실패");
      }
      const resultText = data?.text || "응답이 비어있어";
      session.messages = session.messages.filter((msg) => msg.text !== thinkingMsg);
      addMessage("model", resultText);
    } catch (err) {
      const session = getActiveSession();
      if (session) {
        session.messages = session.messages.filter((msg) => msg.text !== thinkingMsg);
      }
      addMessage("model", "응답 실패. 네트워크/서버 설정 확인해줘");
      console.warn(err);
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
  };

  toggleBtn?.addEventListener("click", () => panel?.classList.toggle("open"));
  closeBtn?.addEventListener("click", () => panel?.classList.remove("open"));

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setTab(btn.dataset.chatTab));
  });

  sendBtn?.addEventListener("click", sendMessage);
  inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  newBtn?.addEventListener("click", () => {
    const session = createSession();
    state.sessions.unshift(session);
    trimSessions();
    state.activeSessionId = session.id;
    scheduleSave();
    renderSessions();
    renderMessages();
    setTab("chat");
  });

  sessionsEl?.addEventListener("click", (e) => {
    const renameBtn = e.target.closest("[data-session-rename]");
    if (renameBtn) {
      const id = renameBtn.dataset.sessionRename;
      const session = state.sessions.find((s) => s.id === id);
      if (!session) return;
      const nextTitle = window.prompt("새 제목", session.title || "새 대화");
      if (nextTitle && nextTitle.trim()) {
        session.title = nextTitle.trim();
        session.updatedAt = Date.now();
        scheduleSave();
        renderSessions();
      }
      return;
    }
    const delBtn = e.target.closest("[data-session-del]");
    if (delBtn) {
      const id = delBtn.dataset.sessionDel;
      state.sessions = state.sessions.filter((s) => s.id !== id);
      if (!state.sessions.length) {
        const session = createSession();
        state.sessions.push(session);
      }
      if (!state.sessions.some((s) => s.id === state.activeSessionId)) {
        state.activeSessionId = state.sessions[0]?.id;
      }
      scheduleSave();
      renderSessions();
      renderMessages();
      return;
    }
    const item = e.target.closest("[data-session-id]");
    if (!item) return;
    state.activeSessionId = item.dataset.sessionId;
    scheduleSave();
    renderSessions();
    renderMessages();
    setTab("chat");
  });

  messagesEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action=\"open-html\"]");
    if (!btn) return;
    const msgId = btn.dataset.msgId;
    const session = getActiveSession();
    const msg = session?.messages.find((m) => m.id === msgId);
    if (!msg) return;
    const blocks = extractHtmlBlocks(msg.text);
    if (blocks.length) openCanvas(blocks[0]);
  });

  canvasOpenBtn?.addEventListener("click", openCanvasTab);
  canvasCloseBtn?.addEventListener("click", closeCanvas);
  canvasOverlay?.addEventListener("click", (e) => {
    if (e.target === canvasOverlay) closeCanvas();
  });

  serverUrlEl?.addEventListener("change", () => {
    state.settings.serverUrl = serverUrlEl.value.trim();
    scheduleSave();
  });
  promptEl?.addEventListener("change", () => {
    state.settings.promptId = promptEl.value;
    scheduleSave();
  });
  thinkingEl?.addEventListener("change", () => {
    state.settings.thinkingLevel = thinkingEl.value;
    scheduleSave();
  });
  modelEl?.addEventListener("change", () => {
    state.settings.model = modelEl.value.trim() || "gemini-3-flash-preview";
    scheduleSave();
  });
  saveBtn?.addEventListener("click", () => {
    applySettingsFromInputs();
    scheduleSave();
    toast("설정 저장됨");
  });

  clearBtn?.addEventListener("click", () => {
    const session = getActiveSession();
    if (!session) return;
    session.messages = [];
    session.title = "새 대화";
    session.updatedAt = Date.now();
    scheduleSave();
    renderMessages();
    renderSessions();
  });

  ensureSession();
  trimSessions();
  renderSessions();
  renderMessages();
  renderSettings();
  setTab("chat");

  setInterval(() => {
    if (panel?.classList.contains("open")) renderSessions();
  }, 60000);

  return { sendMessage };
}
