import { CHAT_STORAGE_KEY } from "./data.js";
import { qs, escapeHtml, createId, debounce } from "./utils.js";
import { createClient } from "google-genai";

const PROMPTS = [
  { id: "searchmode", name: "SearchMode_251124", path: "prompts/searchmode_251124.txt" },
  { id: "ailey-debate", name: "Ailey Debate (v1213)", path: "prompts/ailey-debate-v1213.txt" },
  { id: "ailey-bailey-x", name: "Ailey & Bailey X_251023", path: "prompts/ailey-bailey-x-251023.txt" }
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
    messages: Array.isArray(s.messages) ? s.messages.slice(-MAX_MESSAGES) : [],
    createdAt: s.createdAt || Date.now(),
    updatedAt: s.updatedAt || Date.now()
  })) : [];

  const settings = safe.settings && typeof safe.settings === "object" ? safe.settings : {};

  return {
    activeSessionId: safe.activeSessionId || (sessions[0]?.id ?? null),
    sessions,
    settings: {
      apiKey: settings.apiKey || "",
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

const promptCache = new Map();

async function getPromptText(id) {
  if (promptCache.has(id)) return promptCache.get(id);
  const prompt = PROMPTS.find((item) => item.id === id);
  if (!prompt) return "";
  try {
    const res = await fetch(prompt.path, { cache: "no-store" });
    const text = await res.text();
    promptCache.set(id, text);
    return text;
  } catch (_) {
    return "";
  }
}

function extractText(response) {
  if (!response) return "";
  if (response.text) return response.text;
  const parts = response.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts.map((part) => part.text || "").join("").trim();
  }
  return "";
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

  const apiKeyEl = qs("#chat-api-key");
  const promptEl = qs("#chat-prompt");
  const thinkingEl = qs("#chat-thinking");
  const modelEl = qs("#chat-model");
  const clearBtn = qs("#chat-clear");

  let state = loadState();
  const scheduleSave = debounce(() => saveState(state), 200);

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
        return `
          <div class="chat-history-item ${active}" data-session-id="${session.id}">
            <span class="text-[11px] text-white/70">${escapeHtml(session.title || "새 대화")}</span>
            <button class="text-[10px] text-red-400" data-session-del="${session.id}">DEL</button>
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
        return `<div class="chat-msg ${klass}">${escapeHtml(msg.text)}</div>`;
      })
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderSettings = () => {
    if (apiKeyEl) apiKeyEl.value = state.settings.apiKey || "";
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
    if (!state.settings.apiKey) {
      toast("API 키를 먼저 입력해줘");
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
      const promptText = await getPromptText(state.settings.promptId);
      const client = createClient({ apiKey: state.settings.apiKey });
      const config = {
        thinkingConfig: { thinkingLevel: state.settings.thinkingLevel || "medium" }
      };
      if (promptText) config.systemInstruction = promptText;

      const contents = session.messages
        .filter((msg) => msg.text !== thinkingMsg)
        .map((msg) => ({ role: msg.role, parts: [{ text: msg.text }] }));

      const response = await client.models.generateContent({
        model: state.settings.model || "gemini-3-flash-preview",
        contents,
        config
      });

      const resultText = extractText(response) || "응답이 비어있어";
      session.messages = session.messages.filter((msg) => msg.text !== thinkingMsg);
      addMessage("model", resultText);
    } catch (err) {
      const session = getActiveSession();
      if (session) {
        session.messages = session.messages.filter((msg) => msg.text !== thinkingMsg);
      }
      addMessage("model", "응답 실패. 네트워크/키 설정 확인해줘");
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

  apiKeyEl?.addEventListener("change", () => {
    state.settings.apiKey = apiKeyEl.value.trim();
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

  return { sendMessage };
}
