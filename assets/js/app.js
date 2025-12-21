import { loadState, saveState } from "./storage.js";
import { GUIDE_TAB, CHAT_STORAGE_KEY } from "./data.js";
import { qs, escapeHtml, safeVibrate, createId, debounce, downloadFile, readFileAsText } from "./utils.js";
import { getGuideHTML } from "./guide.js";

let state = loadState();
let toastTimer = null;
let openCameraOverlay = null;
const dragState = {
  active: false,
  type: "task",
  card: null,
  catId: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  longPressTimer: null,
  suppressClickUntil: 0,
  placeholder: null,
  originParent: null,
  originNextSibling: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  prevBodyOverflow: "",
  prevBodyOverscroll: "",
  prevContentTouch: "",
  prevBodyTouch: ""
};
const DRAG_LONG_PRESS_MS = 280;
const DRAG_MOVE_THRESHOLD = 16;

const scheduleSave = debounce(() => saveState(state), 200);

const mainContent = () => qs("#main-content");

function syncPositionOrder() {
  if (!Array.isArray(state.positionOrder)) {
    state.positionOrder = [];
  }
  const next = [];
  const seen = new Set();
  state.positionOrder.forEach((id) => {
    if (state.positions[id] && !seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  });
  Object.keys(state.positions).forEach((id) => {
    if (!seen.has(id)) {
      next.push(id);
      seen.add(id);
    }
  });
  if (next.includes("back")) {
    state.positionOrder = ["back", ...next.filter((id) => id !== "back")];
    return;
  }
  state.positionOrder = next;
}

function getPositionOrder() {
  syncPositionOrder();
  return state.positionOrder;
}

function getTabList() {
  return [...getPositionOrder().map((id) => state.positions[id]), GUIDE_TAB];
}

function ensureActiveTab() {
  const validTabs = getTabList().map((tab) => tab.id);
  if (!validTabs.includes(state.activeTab)) {
    state.activeTab = state.preferences?.defaultTab || "kitchen";
  }
}

function safeText(str) {
  return String(str || "").trim();
}

function isCarryAnchorTask(task) {
  return task?.id === "ks-1";
}

function shouldShowCarryInline(position, category) {
  return position?.id === "back" && category?.id === "back-start" && state.preferences?.showCarry !== false;
}

function loadChatSettings() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const settings = parsed && typeof parsed === "object" ? parsed.settings : null;
    if (!settings || typeof settings !== "object") return null;
    return {
      serverUrl: String(settings.serverUrl || ""),
      promptId: String(settings.promptId || "searchmode"),
      thinkingLevel: String(settings.thinkingLevel || "medium"),
      model: String(settings.model || "gemini-3-flash-preview")
    };
  } catch (_) {
    return null;
  }
}

function buildChatEndpoint(rawUrl) {
  const trimmed = String(rawUrl || "").replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.endsWith("/api/chat")) return trimmed;
  if (trimmed.endsWith("/api")) return `${trimmed}/chat`;
  return `${trimmed}/api/chat`;
}

function makeUniquePositionName(base) {
  const name = safeText(base) || "새 체크리스트";
  const existing = new Set(Object.values(state.positions).map((pos) => pos.name));
  if (!existing.has(name)) return name;
  let index = 2;
  let next = `${name} ${index}`;
  while (existing.has(next)) {
    index += 1;
    next = `${name} ${index}`;
  }
  return next;
}

function buildTasks(taskList) {
  const unique = new Set();
  return (Array.isArray(taskList) ? taskList : [])
    .map((item) => safeText(typeof item === "string" ? item : item?.text || item?.name || ""))
    .filter(Boolean)
    .filter((text) => {
      if (unique.has(text)) return false;
      unique.add(text);
      return true;
    })
    .map((text) => ({ id: createId("task"), text, done: false }));
}

function buildCategory(name, tasks = []) {
  return {
    id: createId("cat"),
    name: safeText(name) || "카테고리",
    tasks: buildTasks(tasks)
  };
}

function cloneCategories(categories = [], resetDone = true) {
  return (Array.isArray(categories) ? categories : []).map((cat) => ({
    id: createId("cat"),
    name: safeText(cat?.name) || "카테고리",
    mode: cat?.mode,
    tasks: (Array.isArray(cat?.tasks) ? cat.tasks : []).map((task) => ({
      id: createId("task"),
      text: safeText(task?.text) || "항목",
      done: resetDone ? false : !!task?.done
    }))
  }));
}

function createPosition(name, categories = []) {
  const safeName = makeUniquePositionName(name);
  const safeCategories = categories.length ? categories : [buildCategory("할 일", [])];
  return { id: createId("pos"), name: safeName, categories: safeCategories };
}

function extractJsonPayload(text) {
  const raw = String(text || "");
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : null;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const fallback = start >= 0 && end > start ? raw.slice(start, end + 1) : null;
  const jsonText = candidate || fallback;
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch (_) {
    return null;
  }
}

function normalizeChecklistData(data) {
  if (!data) return null;
  let categories = null;
  if (Array.isArray(data.categories)) categories = data.categories;
  else if (Array.isArray(data.sections)) categories = data.sections;
  else if (Array.isArray(data.lists)) categories = data.lists;
  else if (Array.isArray(data.tasks)) {
    categories = [{ name: data.title || data.name || "할 일", tasks: data.tasks }];
  } else if (Array.isArray(data)) {
    categories = data;
  }

  if (!categories) return null;

  if (categories.every((item) => typeof item === "string")) {
    return [{ name: data.title || "할 일", tasks: categories }];
  }

  return categories
    .map((cat) => {
      if (typeof cat === "string") {
        return { name: cat, tasks: [] };
      }
      const name = safeText(cat?.name || cat?.title || cat?.category || cat?.section || "카테고리");
      const rawTasks = Array.isArray(cat?.tasks)
        ? cat.tasks
        : Array.isArray(cat?.items)
          ? cat.items
          : Array.isArray(cat?.list)
            ? cat.list
            : Array.isArray(cat?.todos)
              ? cat.todos
              : [];
      const tasks = rawTasks
        .map((task) => safeText(typeof task === "string" ? task : task?.text || task?.name || ""))
        .filter(Boolean);
      return { name, tasks };
    })
    .filter((cat) => cat.name || (cat.tasks && cat.tasks.length));
}

function parseChecklistText(text) {
  const lines = String(text || "").split(/\r?\n/);
  const categories = [];
  let current = null;

  const pushCategory = (name) => {
    const catName = safeText(name) || "할 일";
    current = { name: catName, tasks: [] };
    categories.push(current);
  };

  lines.forEach((line) => {
    const raw = line.trim();
    if (!raw || raw.startsWith("```")) return;
    const heading = raw.match(/^#{1,6}\s+(.*)$/);
    if (heading) {
      pushCategory(heading[1]);
      return;
    }
    const list = raw.match(/^[-*•]\s+(.*)$/) || raw.match(/^\d+\.\s+(.*)$/);
    if (list) {
      if (!current) pushCategory("할 일");
      const taskText = safeText(list[1].replace(/^\[(x| )\]\s*/i, ""));
      if (taskText) current.tasks.push(taskText);
    }
  });

  return categories.length ? categories : null;
}

function buildCategoriesFromList(list, overrideName = "") {
  const fallbackName = safeText(overrideName);
  const listArray = Array.isArray(list) ? list : [];
  return listArray
    .map((cat, index) => {
      const name = fallbackName && listArray.length === 1
        ? fallbackName
        : safeText(cat?.name || (index === 0 ? fallbackName : "") || "카테고리");
      return buildCategory(name || "카테고리", cat?.tasks || []);
    })
    .filter((cat) => cat.name || (cat.tasks && cat.tasks.length));
}

function isRestockCategory(cat) {
  return cat?.mode === "restock";
}

function isRestockFilterOn(catId) {
  return !!(state.ui?.restockFilter && state.ui.restockFilter[catId]);
}

function getTaskTextClass(task, mode) {
  if (mode === "restock") {
    return task.done ? "text-[#d4b28c]" : "text-white/60";
  }
  return task.done ? "text-white/20 line-through" : "text-white/90";
}

function getTaskCardClass(task, mode) {
  if (mode === "restock") {
    return task.done ? "restock-need" : "";
  }
  return task.done ? "bg-black/30 border-white/5" : "";
}

function getTaskCheckMarkup(task, mode) {
  if (!task.done) return "";
  if (mode === "restock") {
    return `<span class="text-[12px] font-black text-[#121212]">!</span>`;
  }
  return `
    <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path>
    </svg>`;
}

function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function updateClock() {
  const now = new Date();
  const clock = qs("#system-clock");
  const date = qs("#system-date");
  const sync = qs("#sync-id");
  if (clock) clock.textContent = now.toTimeString().split(" ")[0];
  if (date) {
    date.textContent = now.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short"
    });
  }
  if (sync) sync.textContent = `SY_ID_${String(now.getTime()).slice(-6)} | KERNEL_V6.0`;
}

function computeProgress(positionId) {
  const position = state.positions[positionId];
  if (!position) return { total: 0, done: 0, pct: 0 };
  const tasks = position.categories
    .filter((cat) => !isRestockCategory(cat))
    .flatMap((cat) => cat.tasks || []);
  const total = tasks.length;
  const done = tasks.reduce((sum, task) => sum + (task.done ? 1 : 0), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

function refreshProgressUI() {
  const footer = qs("#footer-status");
  if (state.activeTab === GUIDE_TAB.id) {
    if (footer) footer.classList.add("hidden");
    return;
  }

  const { total, done, pct } = computeProgress(state.activeTab);
  const fill = qs("#progress-fill");
  const percent = qs("#progress-percent");
  const count = qs("#task-count");
  if (fill) fill.style.width = `${pct}%`;
  if (percent) percent.textContent = `${pct}%`;
  if (count) count.textContent = `${done}/${total} ITEMS`;
}

function showToast(msg) {
  const toast = qs("#toast");
  const msgEl = qs("#toast-msg");
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.style.display = "block";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hideToast(), 5000);
}

function hideToast() {
  const toast = qs("#toast");
  if (!toast) return;
  toast.style.display = "none";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
}

function setActiveTab(tabId) {
  state.activeTab = tabId;
  scheduleSave();
  renderTabs();
  renderActiveTab();
  const container = mainContent();
  if (container) container.scrollTop = 0;
  window.scrollTo(0, 0);
  refreshProgressUI();
  safeVibrate(10);
}

function renderTabs() {
  const tabs = qs("#position-tabs");
  if (!tabs) return;
  const html = getTabList()
    .map((tab) => {
      const isActive = tab.id === state.activeTab;
      return `
      <button class="tab-btn ${isActive ? "active" : ""}" data-tab-id="${tab.id}">
        ${escapeHtml(tab.name)}
      </button>
    `;
    })
    .join("");
  tabs.innerHTML = html;
}

function taskCardHTML(task, posId, catId, mode = "default", options = {}) {
  const doneClass = getTaskCardClass(task, mode);
  const textClass = getTaskTextClass(task, mode);
  const check = getTaskCheckMarkup(task, mode);
  const checkClass = `check-box ${task.done ? "checked" : ""} ${mode === "restock" ? "restock" : ""}`;
  const modeClass = mode === "restock" ? "restock-card" : "";
  const showCarryToggle = !!options.showCarryToggle;
  const carryOpen = !!options.carryOpen;
  const showPhotoActions = !!options.showPhotoActions;
  const carryBtn = showCarryToggle
    ? `
        <button class="icon-btn icon-sm text-white/35 hover:text-cyan-200 carry-toggle ${carryOpen ? "open" : ""}"
                data-action="toggle-carry-panel" aria-label="해동표찰 수량">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>
      `
    : "";
  const photoButtons = showPhotoActions
    ? `
        <button class="icon-btn icon-sm text-white/35 hover:text-cyan-200"
                data-action="open-camera" aria-label="카메라">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h4l2-2h4l2 2h4v12H4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </button>
        <button class="icon-btn icon-sm text-white/35 hover:text-cyan-200"
                data-action="open-gallery" aria-label="갤러리">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 15l3-3 4 4 3-2 2 3" />
            <circle cx="9" cy="9" r="1.5" />
          </svg>
        </button>
      `
    : "";

  return `
    <div class="square-card task-card p-3 flex items-center justify-between transition-all ${doneClass} ${modeClass}"
         data-task-id="${task.id}" data-cat-id="${catId}" data-pos-id="${posId}">
      <button class="flex items-center gap-3 flex-1 text-left"
              data-action="toggle-task" data-task-id="${task.id}">
        <div class="${checkClass}">${check}</div>
        <span class="text-[13px] font-bold tracking-tight ${textClass}" data-task-text>${escapeHtml(
    task.text
  )}</span>
      </button>

      <div class="flex items-center gap-2">
        ${photoButtons}
        ${carryBtn}
        <button class="icon-btn icon-sm text-white/30 hover:text-cyan-200"
                data-action="edit-task" data-task-id="${task.id}" aria-label="edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
        <button class="text-white/10 hover:text-red-500/60 p-1 transition-colors"
                data-action="delete-task" data-task-id="${task.id}" aria-label="delete">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

function renderTaskListHTML(position, category, tasks) {
  const list = [];
  const showCarry = shouldShowCarryInline(position, category);
  const carryOpen = !!state.ui?.carryOpen;

  tasks.forEach((task) => {
    const isCarryAnchor = showCarry && isCarryAnchorTask(task);
    const showPhotoActions = position?.id === "back" && task?.id === "ks-2";
    list.push(taskCardHTML(task, position.id, category.id, category.mode, {
      showCarryToggle: isCarryAnchor,
      carryOpen,
      showPhotoActions
    }));
    if (isCarryAnchor) {
      list.push(renderCarryInlineHTML());
    }
  });

  return list.join("");
}

function renderCarryInlineHTML() {
  const rows = state.carry.map(carryRowHTML).join("");
  const open = !!state.ui?.carryOpen;
  return `
    <div class="carry-inline ${open ? "open" : "closed"}">
      <div class="square-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-4 bg-cyan-300"></div>
              <h3 class="text-sm font-black uppercase tracking-tight">해동표찰 수량</h3>
            </div>
            <p class="text-[10px] mono text-white/25 uppercase tracking-[0.25em] mt-2">
              WALK-IN PREP
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/35 text-[10px] mono uppercase tracking-widest active:scale-[0.98] transition"
              data-action="carry-add" aria-label="워크인 항목 추가">
              +
            </button>
          </div>
        </div>

        <div class="mt-3 grid gap-2" id="carry-list">
          ${rows}
        </div>

        <div class="mt-3 text-[10px] mono text-white/25">
          TIP: 수량칸은 비워두고, 필요한 개수만 입력. (회색 숫자는 기준 힌트)
        </div>
      </div>
    </div>
  `;
}

function carryRowHTML(item) {
  const safeName = escapeHtml(item.name ?? "");
  const hint = item.hint ?? "";
  const value = item.qty === "" || item.qty == null ? "" : String(item.qty);

  return `
    <div class="carry-row">
      <input
        class="field carry-name px-3 py-2 text-[12px] font-bold"
        data-action="carry-name"
        data-carry-id="${item.id}"
        value="${safeName}"
        placeholder="항목명" />
      <input
        class="field carry-qty px-3 py-2 text-[12px] font-black text-cyan-200 mono text-center"
        type="tel" inputmode="numeric" pattern="[0-9]*"
        data-action="carry-qty"
        data-carry-id="${item.id}"
        data-hint="${hint}"
        placeholder="${hint}"
        value="${value}" />
      <button
        class="carry-del px-3 py-2 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/40 hover:text-red-400"
        data-action="carry-del"
        data-carry-id="${item.id}"
        aria-label="carry delete">
        X
      </button>
    </div>
  `;
}

function isCollapsed(catId) {
  return !!(state.ui && state.ui.collapsed && state.ui.collapsed[catId]);
}

function applySectionCollapsedUI(catId) {
  const body = qs(`#sec-body-${catId}`);
  const chev = qs(`#chev-${catId}`);
  if (!body || !chev) return;

  const collapsed = isCollapsed(catId);
  body.classList.toggle("hidden", collapsed);
  chev.classList.toggle("open", !collapsed);
  chev.setAttribute("aria-expanded", String(!collapsed));
}

function toggleSection(catId) {
  state.ui.collapsed[catId] = !isCollapsed(catId);
  scheduleSave();
  applySectionCollapsedUI(catId);
  safeVibrate(10);
}

function toggleRestockFilter(catId) {
  if (!state.ui.restockFilter) state.ui.restockFilter = {};
  state.ui.restockFilter[catId] = !isRestockFilterOn(catId);
  scheduleSave();
  renderActiveTab();
  refreshProgressUI();
  safeVibrate(10);
}

function toggleCarryPanel(force) {
  if (!state.ui) state.ui = {};
  if (typeof force === "boolean") {
    state.ui.carryOpen = force;
  } else {
    state.ui.carryOpen = !state.ui.carryOpen;
  }
  scheduleSave();
  renderActiveTab();
  refreshProgressUI();
  safeVibrate(10);
}

function resetRestockCategory(catId) {
  const position = state.positions[state.activeTab];
  const category = position?.categories.find((cat) => cat.id === catId);
  if (!category) return;
  category.tasks.forEach((task) => {
    task.done = false;
  });
  scheduleSave();
  renderActiveTab();
  refreshProgressUI();
  showToast("보충 목록 초기화");
  safeVibrate([15, 30, 15]);
}

function getRestockCategory() {
  const position = state.positions[state.activeTab];
  if (!position) return null;
  return position.categories.find((cat) => isRestockCategory(cat)) || null;
}

function applyRestockVisibility() {
  const toggle = qs("#restock-toggle");
  const panel = qs("#restock-panel");
  const onBack = state.activeTab === "back";
  if (toggle) toggle.classList.toggle("hidden", !onBack);
  if (!panel) return;
  if (!onBack) {
    panel.classList.remove("open");
    if (state.ui) state.ui.restockOpen = false;
    return;
  }
  panel.classList.toggle("open", !!state.ui?.restockOpen);
}

function toggleRestockPanel(force) {
  if (!state.ui) state.ui = {};
  if (typeof force === "boolean") {
    state.ui.restockOpen = force;
  } else {
    state.ui.restockOpen = !state.ui.restockOpen;
  }
  scheduleSave();
  applyRestockVisibility();
  if (state.ui.restockOpen) renderRestockPanel();
}

function renderRestockPanel() {
  const panel = qs("#restock-panel");
  const list = qs("#restock-list");
  const countEl = qs("#restock-count");
  const filterBtn = qs("#restock-filter");
  const resetBtn = qs("#restock-reset");
  if (!panel || !list) return;

  if (state.activeTab !== "back") {
    panel.classList.remove("open");
    list.innerHTML = "";
    if (filterBtn) filterBtn.dataset.catId = "";
    if (resetBtn) resetBtn.dataset.catId = "";
    return;
  }

  const category = getRestockCategory();
  if (!category) {
    list.innerHTML = "";
    if (filterBtn) filterBtn.dataset.catId = "";
    if (resetBtn) resetBtn.dataset.catId = "";
    return;
  }

  const filterOn = isRestockFilterOn(category.id);
  const visibleTasks = filterOn ? category.tasks.filter((task) => task.done) : category.tasks;
  list.innerHTML = renderTaskListHTML(state.positions[state.activeTab], category, visibleTasks);
  if (countEl) {
    const done = category.tasks.reduce((sum, task) => sum + (task.done ? 1 : 0), 0);
    countEl.textContent = `${done}/${category.tasks.length}`;
  }
  if (filterBtn) {
    filterBtn.classList.toggle("active", filterOn);
    filterBtn.dataset.catId = category.id;
  }
  if (resetBtn) {
    resetBtn.dataset.catId = category.id;
  }
}

function applyFocusMode() {
  const focusOn = !!state.ui?.focusMode;
  document.body.classList.toggle("focus-mode", focusOn);
  const exitBtn = qs("#focus-exit");
  if (exitBtn) exitBtn.classList.toggle("open", focusOn);
  if (focusOn) {
    qs("#chat-panel")?.classList.remove("open");
  }
}

function toggleFocusMode() {
  if (!state.ui) state.ui = {};
  state.ui.focusMode = !state.ui.focusMode;
  scheduleSave();
  applyFocusMode();
}

function addPosition(position, makeActive = true) {
  state.positions[position.id] = position;
  if (!Array.isArray(state.positionOrder)) state.positionOrder = [];
  state.positionOrder.push(position.id);
  syncPositionOrder();
  if (makeActive) state.activeTab = position.id;
  scheduleSave();
  renderTabs();
  renderActiveTab();
  refreshProgressUI();
}

function renamePosition(id, nextName) {
  const position = state.positions[id];
  if (!position) return;
  const name = safeText(nextName);
  if (!name) return;
  position.name = name;
  scheduleSave();
  renderTabs();
  refreshProgressUI();
}

function duplicatePosition(id) {
  const position = state.positions[id];
  if (!position) return null;
  const clone = {
    id: createId("pos"),
    name: makeUniquePositionName(`${position.name} 복제`),
    categories: cloneCategories(position.categories, true)
  };
  addPosition(clone, true);
  return clone;
}

function deletePosition(id) {
  const total = Object.keys(state.positions).length;
  if (total <= 1) {
    showToast("탭은 최소 1개 필요해요");
    return;
  }
  const position = state.positions[id];
  if (!position) return;
  if (!confirm(`'${position.name}' 탭을 삭제할까요?`)) return;
  delete state.positions[id];
  if (Array.isArray(state.positionOrder)) {
    state.positionOrder = state.positionOrder.filter((key) => key !== id);
  }
  syncPositionOrder();
  if (state.activeTab === id) {
    state.activeTab = state.positionOrder[0] || Object.keys(state.positions)[0];
  }
  if (state.preferences?.defaultTab === id) {
    state.preferences.defaultTab = state.activeTab;
  }
  scheduleSave();
  renderTabs();
  renderActiveTab();
  refreshProgressUI();
}

function parseChecklistResponse(text) {
  const json = extractJsonPayload(text);
  const categories = normalizeChecklistData(json) || parseChecklistText(text);
  const title = safeText(json?.title || json?.name || "");
  return { title, categories };
}

async function requestAiChecklist({ request, target, contextName }) {
  const settings = loadChatSettings() || {};
  const endpoint = buildChatEndpoint(settings.serverUrl || "");
  if (!endpoint) {
    showToast("챗봇 설정에서 SERVER URL을 먼저 입력해줘");
    return null;
  }

  const promptId = settings.promptId || "searchmode";
  const thinkingLevel = settings.thinkingLevel || "medium";
  const model = settings.model || "gemini-3-flash-preview";
  const position = state.positions[state.activeTab];
  const existingCats = position?.categories?.map((cat) => cat.name).filter(Boolean).join(", ");
  const contextLine = target === "current" && existingCats
    ? `현재 탭 카테고리: ${existingCats}`
    : "";

  const instruction = [
    "요청을 실무용 체크리스트로 변환해줘.",
    "응답은 JSON만 출력.",
    '형식: {"title":"체크리스트 이름","categories":[{"name":"카테고리","tasks":["항목1","항목2"]}]}',
    "불필요한 설명, 코드블럭, 마크다운 금지.",
    "문장은 짧고 구체적으로, 중복은 제거."
  ].join("\n");
  const userMessage = [instruction, contextLine, `요청: ${request}`].filter(Boolean).join("\n\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promptId,
      thinkingLevel,
      model,
      messages: [{ role: "user", text: userMessage }]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "요청 실패");
  }

  const parsed = parseChecklistResponse(data?.text || "");
  if (!parsed.categories || !parsed.categories.length) {
    throw new Error("체크리스트 파싱 실패");
  }
  const title = parsed.title || safeText(contextName);
  return { title, categories: parsed.categories };
}

function clearDragTimer() {
  if (dragState.longPressTimer) {
    clearTimeout(dragState.longPressTimer);
    dragState.longPressTimer = null;
  }
}

function startDrag(card, catId, pointerId, type = "task", clientX = dragState.startX, clientY = dragState.startY) {
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.className = "drag-placeholder";
  placeholder.style.height = `${rect.height}px`;
  placeholder.style.width = `${rect.width}px`;
  dragState.originParent = card.parentElement;
  dragState.originNextSibling = card.nextElementSibling;
  dragState.placeholder = placeholder;

  if (dragState.originParent) {
    dragState.originParent.insertBefore(placeholder, card);
  }
  document.body.appendChild(card);
  dragState.active = true;
  dragState.type = type;
  dragState.card = card;
  dragState.catId = catId;
  dragState.pointerId = pointerId;
  card.classList.add("dragging");
  card.classList.add("drag-ghost");
  card.style.position = "fixed";
  card.style.top = `${rect.top}px`;
  card.style.left = `${rect.left}px`;
  card.style.width = `${rect.width}px`;
  card.style.zIndex = "1000";
  card.style.pointerEvents = "none";
  dragState.dragOffsetX = clientX - rect.left;
  dragState.dragOffsetY = clientY - rect.top;
  document.body.classList.add("dragging-body");
  dragState.prevBodyOverflow = document.body.style.overflow;
  dragState.prevBodyOverscroll = document.body.style.overscrollBehaviorY;
  dragState.prevBodyTouch = document.body.style.touchAction;
  document.body.style.overflow = "hidden";
  document.body.style.overscrollBehaviorY = "contain";
  document.body.style.touchAction = "none";
  const container = mainContent();
  if (container) {
    dragState.prevContentTouch = container.style.touchAction;
    container.style.touchAction = "none";
  }
  if (card.setPointerCapture) {
    try {
      card.setPointerCapture(pointerId);
    } catch (_) {}
  }
  safeVibrate(10);
}

function reorderCategoryFromDOM(catId) {
  const position = state.positions[state.activeTab];
  const category = position?.categories.find((cat) => cat.id === catId);
  const list = qs(`#list-${catId}`);
  if (!position || !category || !list) return;
  const order = Array.from(list.querySelectorAll("[data-task-id]")).map((el) => String(el.dataset.taskId));
  category.tasks.sort((a, b) => order.indexOf(String(a.id)) - order.indexOf(String(b.id)));
}

function reorderCategoriesFromDOM() {
  const position = state.positions[state.activeTab];
  const container = mainContent();
  if (!position || !container) return;
  const order = Array.from(container.querySelectorAll(".category-section")).map((el) => String(el.dataset.catId));
  position.categories.sort((a, b) => order.indexOf(String(a.id)) - order.indexOf(String(b.id)));
}

function endDrag(commit = true) {
  clearDragTimer();
  if (!dragState.active) return;
  const card = dragState.card;
  const placeholder = dragState.placeholder;
  if (card) {
    card.classList.remove("dragging", "drag-ghost");
    card.style.position = "";
    card.style.top = "";
    card.style.left = "";
    card.style.width = "";
    card.style.zIndex = "";
    card.style.pointerEvents = "";
  }
  if (placeholder && placeholder.parentElement && card) {
    if (commit) {
      placeholder.parentElement.insertBefore(card, placeholder);
    } else if (dragState.originParent) {
      dragState.originParent.insertBefore(card, dragState.originNextSibling);
    }
    placeholder.remove();
  } else if (!commit && dragState.originParent && card) {
    dragState.originParent.insertBefore(card, dragState.originNextSibling);
  }
  if (dragState.card && dragState.card.releasePointerCapture) {
    try {
      dragState.card.releasePointerCapture(dragState.pointerId);
    } catch (_) {}
  }
  document.body.classList.remove("dragging-body");
  document.body.style.overflow = dragState.prevBodyOverflow;
  document.body.style.overscrollBehaviorY = dragState.prevBodyOverscroll;
  document.body.style.touchAction = dragState.prevBodyTouch;
  const container = mainContent();
  if (container) container.style.touchAction = dragState.prevContentTouch;
  if (commit) {
    if (dragState.type === "category") {
      reorderCategoriesFromDOM();
    } else {
      reorderCategoryFromDOM(dragState.catId);
    }
    scheduleSave();
  }
  dragState.active = false;
  dragState.type = "task";
  dragState.card = null;
  dragState.catId = null;
  dragState.pointerId = null;
  dragState.placeholder = null;
  dragState.originParent = null;
  dragState.originNextSibling = null;
  dragState.dragOffsetX = 0;
  dragState.dragOffsetY = 0;
  dragState.prevBodyOverflow = "";
  dragState.prevBodyOverscroll = "";
  dragState.prevContentTouch = "";
  dragState.prevBodyTouch = "";
  dragState.suppressClickUntil = Date.now() + 300;
}

function handlePointerDown(e) {
  if (state.activeTab === GUIDE_TAB.id) return;
  if (e.target.closest("input, textarea, select")) return;

  const header = e.target.closest(".sticky-section-header");
  if (header) {
    if (e.target.closest("[data-action]")) return;
    const section = header.closest("section[data-cat-id]");
    if (!section || !section.closest("#main-content")) return;
    dragState.startX = e.clientX;
    dragState.startY = e.clientY;
    dragState.card = section;
    dragState.catId = section.dataset.catId;
    dragState.pointerId = e.pointerId;
    clearDragTimer();
    dragState.longPressTimer = setTimeout(() => {
      startDrag(section, dragState.catId, e.pointerId, "category", dragState.startX, dragState.startY);
    }, DRAG_LONG_PRESS_MS);
    return;
  }

  const card = e.target.closest(".task-card");
  if (!card || !card.closest("#main-content")) return;
  if (e.target.closest("[data-action=\"delete-task\"], [data-action=\"edit-task\"], [data-action=\"toggle-carry-panel\"], [data-action=\"open-camera\"], [data-action=\"open-gallery\"]")) return;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;
  dragState.card = card;
  dragState.catId = card.dataset.catId;
  dragState.pointerId = e.pointerId;
  clearDragTimer();
  dragState.longPressTimer = setTimeout(() => {
    startDrag(card, dragState.catId, e.pointerId, "task", dragState.startX, dragState.startY);
  }, DRAG_LONG_PRESS_MS);
}

function handlePointerMove(e) {
  if (dragState.longPressTimer && !dragState.active) {
    const movedX = Math.abs(e.clientX - dragState.startX);
    const movedY = Math.abs(e.clientY - dragState.startY);
    if (movedX > DRAG_MOVE_THRESHOLD || movedY > DRAG_MOVE_THRESHOLD) {
      clearDragTimer();
    }
  }

  if (!dragState.active || dragState.pointerId !== e.pointerId) return;

  e.preventDefault();
  if (dragState.card) {
    dragState.card.style.top = `${e.clientY - dragState.dragOffsetY}px`;
    dragState.card.style.left = `${e.clientX - dragState.dragOffsetX}px`;
  }

  if (dragState.type === "category") {
    const container = mainContent();
    if (!container || !dragState.placeholder) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el?.closest(".category-section");
    if (!target || target === dragState.placeholder) return;
    const rect = target.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    if (before) {
      container.insertBefore(dragState.placeholder, target);
    } else {
      container.insertBefore(dragState.placeholder, target.nextSibling);
    }
    return;
  }

  const list = qs(`#list-${dragState.catId}`);
  if (!list || !dragState.placeholder) return;

  const el = document.elementFromPoint(e.clientX, e.clientY);
  const target = el?.closest(".task-card");
  if (!target || target === dragState.placeholder) return;
  if (target.dataset.catId !== dragState.catId) return;

  const rect = target.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  if (before) {
    list.insertBefore(dragState.placeholder, target);
  } else {
    list.insertBefore(dragState.placeholder, target.nextSibling);
  }
}

function handlePointerUp(e) {
  if (dragState.longPressTimer && !dragState.active) {
    clearDragTimer();
    return;
  }
  if (!dragState.active || dragState.pointerId !== e.pointerId) return;
  endDrag(true);
}

function renderCategories(position) {
  const frag = document.createDocumentFragment();
  const categories = position.categories.filter((cat) => !isRestockCategory(cat));

  categories.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "space-y-3 fade-in category-section";
    section.dataset.catId = cat.id;

    const collapsed = isCollapsed(cat.id);
    const isRestock = isRestockCategory(cat);
    const restockFilterOn = isRestock && isRestockFilterOn(cat.id);
    const visibleTasks = restockFilterOn ? cat.tasks.filter((task) => task.done) : cat.tasks;
    const restockControls = isRestock
      ? `
          <button
            class="restock-btn ${restockFilterOn ? "active" : ""}"
            data-action="toggle-restock-filter" data-cat-id="${cat.id}" aria-label="restock filter">
            NEED ONLY
          </button>
          <button
            class="restock-btn reset icon-only"
            data-action="reset-restock" data-cat-id="${cat.id}" aria-label="restock reset">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12a9 9 0 101.8-5.4" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 4v5h5" />
            </svg>
          </button>
        `
      : "";
    const restockHint = isRestock
      ? `<p class="restock-hint">필요할 때 체크 → 채우면 해제. NEED ONLY는 부족 항목만 보기.</p>`
      : "";

    section.innerHTML = `
      <div class="sticky-section-header flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h3 class="text-sm font-black text-white uppercase tracking-tight" data-cat-title>${escapeHtml(
    cat.name
  )}</h3>
          ${isRestock ? `<span class="restock-tag">수시</span>` : ""}
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] mono text-white/20" id="cat-count-${cat.id}">0/0</span>
          ${restockControls}
          <button
            class="icon-btn icon-sm text-white/35 hover:text-cyan-200"
            data-action="edit-category" data-cat-id="${cat.id}" aria-label="edit category">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 20h9" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
          <button
            class="icon-btn icon-sm text-white/25 hover:text-red-400"
            data-action="delete-category" data-cat-id="${cat.id}" aria-label="delete category">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 6V4h8v2" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l1 14h10l1-14" />
            </svg>
          </button>
          <button
            class="p-2 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/60 active:scale-[0.98] transition"
            data-action="toggle-section" data-cat-id="${cat.id}" aria-label="toggle section">
            <svg id="chev-${cat.id}" class="chev ${collapsed ? "" : "open"} w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </div>

      <div id="sec-body-${cat.id}" class="${collapsed ? "hidden" : ""} space-y-2">
        ${restockHint}
        <div class="grid gap-2" id="list-${cat.id}">
          ${renderTaskListHTML(position, cat, visibleTasks)}
        </div>

        <div id="add-box-${cat.id}" class="pt-2 px-1">
          <button data-action="open-add-task" data-cat-id="${cat.id}" aria-label="항목 추가"
            class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
            +
          </button>
        </div>
      </div>
    `;

    frag.appendChild(section);
  });

  const addCategory = document.createElement("section");
  addCategory.className = "space-y-3 fade-in";
  addCategory.innerHTML = `
    <div id="add-category-box" class="pt-2 px-1">
      <button data-action="open-add-category" aria-label="카테고리 추가"
        class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
        +
      </button>
    </div>
  `;
  frag.appendChild(addCategory);

  return frag;
}

function renderActiveTab() {
  const container = mainContent();
  if (!container) return;

  if (dragState.active) endDrag(false);
  container.innerHTML = "";

  if (state.activeTab === GUIDE_TAB.id) {
    container.innerHTML = getGuideHTML();
    applyRestockVisibility();
    return;
  }

  const position = state.positions[state.activeTab];
  if (!position) {
    container.innerHTML = "";
    return;
  }

  const frag = renderCategories(position);
  container.appendChild(frag);

  position.categories.forEach((cat) => updateSectionCounts(position.id, cat.id));
  renderRestockPanel();
  applyRestockVisibility();
}

function updateSectionCounts(posId, catId) {
  const position = state.positions[posId];
  if (!position) return;
  const cat = position.categories.find((c) => c.id === catId);
  if (!cat) return;
  const total = cat.tasks.length;
  const done = cat.tasks.reduce((sum, task) => sum + (task.done ? 1 : 0), 0);
  const count = isRestockCategory(cat) ? `${done}/${total}` : `${done}/${total}`;
  const el = qs(`#cat-count-${catId}`);
  if (el) el.textContent = count;
}

function updateTaskDOM(taskId, catId) {
  const card = qs(`[data-task-id="${taskId}"]`);
  if (!card) return;
  const position = state.positions[state.activeTab];
  const category = position?.categories.find((c) => c.id === catId);
  const task = category?.tasks.find((t) => t.id === taskId);
  if (!task) return;

  const checkbox = card.querySelector(".check-box");
  const text = card.querySelector("[data-task-text]");
  const mode = category?.mode || "default";
  const isRestock = mode === "restock";

  checkbox.classList.toggle("restock", isRestock);
  if (task.done) {
    if (isRestock) {
      card.classList.add("restock-need");
      checkbox.classList.add("checked");
      checkbox.innerHTML = `<span class="text-[12px] font-black text-[#121212]">!</span>`;
      text.classList.add("text-[#d4b28c]");
      text.classList.remove("text-white/60", "text-white/90", "line-through");
    } else {
      card.classList.add("bg-black/30", "border-white/5");
      checkbox.classList.add("checked");
      checkbox.innerHTML = `
        <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path>
        </svg>`;
      text.classList.add("text-white/20", "line-through");
      text.classList.remove("text-white/90");
    }
  } else {
    card.classList.remove("restock-need", "bg-black/30", "border-white/5");
    checkbox.classList.remove("checked");
    checkbox.innerHTML = "";
    if (isRestock) {
      text.classList.remove("text-[#d4b28c]", "text-white/20", "line-through");
      text.classList.add("text-white/60");
    } else {
      text.classList.remove("text-white/20", "line-through");
      text.classList.add("text-white/90");
    }
  }
}

function openAddTaskInput(catId) {
  const box = qs(`#add-box-${catId}`);
  if (!box) return;

  box.innerHTML = `
    <div class="flex gap-2 p-1 fade-in">
      <input type="text" id="input-${catId}" placeholder="내용 입력..."
        class="flex-1 field px-4 py-4 text-sm"
        autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="text" />
      <button data-action="confirm-add-task" data-cat-id="${catId}"
        class="bg-cyan-400/15 border border-cyan-300/25 text-cyan-100 px-6 rounded-[calc(var(--radius)+4px)]
               font-black text-xs uppercase tracking-widest active:scale-[0.98] transition">OK</button>
      <button data-action="cancel-add-task" data-cat-id="${catId}"
        class="bg-[#1a1d23] border border-white/10 text-white/40 px-4 rounded-[calc(var(--radius)+4px)] active:scale-[0.98] transition">X</button>
    </div>
  `;

  const input = qs(`#input-${catId}`);
  if (!input) return;
  input.focus();
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmAddTask(catId);
    if (e.key === "Escape") cancelAddTask(catId);
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (safeText(input.value)) return;
      const boxEl = qs(`#add-box-${catId}`);
      if (boxEl && boxEl.contains(document.activeElement)) return;
      cancelAddTask(catId);
    }, 0);
  });
}

function cancelAddTask(catId) {
  const box = qs(`#add-box-${catId}`);
  if (!box) return;
  box.innerHTML = `
    <button data-action="open-add-task" data-cat-id="${catId}" aria-label="항목 추가"
      class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
      +
    </button>
  `;
}

function confirmAddTask(catId) {
  const input = qs(`#input-${catId}`);
  if (!input) return;
  const val = safeText(input.value);
  if (!val) {
    safeVibrate(20);
    input.focus();
    return;
  }

  const position = state.positions[state.activeTab];
  const category = position?.categories.find((c) => c.id === catId);
  if (!category) return;

  const task = { id: createId("task"), text: val, done: false };
  category.tasks.push(task);
  scheduleSave();

  cancelAddTask(catId);
  const list = qs(`#list-${catId}`);
  if (list) {
    const wrap = document.createElement("div");
    wrap.innerHTML = taskCardHTML(task, position.id, catId, category.mode);
    list.appendChild(wrap.firstElementChild);
  }
  updateSectionCounts(position.id, catId);
  refreshProgressUI();
  safeVibrate([15]);
}

function openAddCategory() {
  const box = qs("#add-category-box");
  if (!box) return;

  box.innerHTML = `
    <div class="flex gap-2 p-1 fade-in">
      <input type="text" id="input-category" placeholder="카테고리 이름"
        class="flex-1 field px-4 py-4 text-sm"
        autocapitalize="off" autocomplete="off" spellcheck="false" inputmode="text" />
      <button data-action="confirm-add-category"
        class="bg-cyan-400/15 border border-cyan-300/25 text-cyan-100 px-6 rounded-[calc(var(--radius)+4px)]
               font-black text-xs uppercase tracking-widest active:scale-[0.98] transition">OK</button>
      <button data-action="cancel-add-category"
        class="bg-[#1a1d23] border border-white/10 text-white/40 px-4 rounded-[calc(var(--radius)+4px)] active:scale-[0.98] transition">X</button>
    </div>
  `;

  const input = qs("#input-category");
  if (input) {
    input.focus();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") confirmAddCategory();
      if (e.key === "Escape") cancelAddCategory();
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        if (safeText(input.value)) return;
        const boxEl = qs("#add-category-box");
        if (boxEl && boxEl.contains(document.activeElement)) return;
        cancelAddCategory();
      }, 0);
    });
  }
}

function cancelAddCategory() {
  const box = qs("#add-category-box");
  if (!box) return;
  box.innerHTML = `
    <button data-action="open-add-category" aria-label="카테고리 추가"
      class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
      +
    </button>
  `;
}

function confirmAddCategory() {
  const input = qs("#input-category");
  if (!input) return;
  const name = safeText(input.value);
  if (!name) {
    safeVibrate(20);
    input.focus();
    return;
  }

  const position = state.positions[state.activeTab];
  if (!position) return;

  position.categories.push({ id: createId("cat"), name, tasks: [] });
  scheduleSave();
  renderActiveTab();
  refreshProgressUI();
  safeVibrate([15]);
}

function enterEditTask(taskId) {
  const card = qs(`[data-task-id="${taskId}"]`);
  if (!card || card.dataset.editing === "true") return;
  const textEl = card.querySelector("[data-task-text]");
  if (!textEl) return;

  const original = textEl.textContent || "";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "field px-3 py-2 text-[12px] flex-1";
  input.value = original;
  input.dataset.editInput = "task";
  input.addEventListener("click", (e) => e.stopPropagation());

  textEl.replaceWith(input);
  card.dataset.editing = "true";
  card.dataset.original = original;
  input.focus();
  input.select();

  const finish = (commit) => {
    const newText = safeText(input.value);
    const finalText = commit && newText ? newText : original;
    updateTaskText(taskId, finalText);
    card.dataset.editing = "false";
    card.dataset.original = "";
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

function updateTaskText(taskId, newText) {
  const position = state.positions[state.activeTab];
  if (!position) return;
  let task = null;
  let mode = "default";

  position.categories.some((cat) => {
    const found = cat.tasks.find((item) => item.id === taskId);
    if (found) {
      task = found;
      mode = cat.mode || "default";
      return true;
    }
    return false;
  });

  if (!task) return;
  task.text = newText;
  scheduleSave();

  const card = qs(`[data-task-id="${taskId}"]`);
  if (!card) return;
  const input = card.querySelector("input[data-edit-input='task']");
  const span = document.createElement("span");
  span.className = `text-[15px] font-bold tracking-tight ${getTaskTextClass(task, mode)}`;
  span.setAttribute("data-task-text", "");
  span.textContent = newText;
  if (input) {
    input.replaceWith(span);
  }
}

function enterEditCategory(catId) {
  const section = qs(`[data-cat-id="${catId}"]`);
  if (!section) return;
  const title = section.querySelector("[data-cat-title]");
  if (!title) return;
  const original = title.textContent || "";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "field px-2 py-1 text-[12px] font-bold";
  input.value = original;

  title.replaceWith(input);
  input.focus();
  input.select();

  const finish = (commit) => {
    const newName = safeText(input.value);
    const finalName = commit && newName ? newName : original;
    updateCategoryName(catId, finalName, input);
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

function updateCategoryName(catId, newName, inputEl) {
  const position = state.positions[state.activeTab];
  if (!position) return;
  const cat = position.categories.find((c) => c.id === catId);
  if (!cat) return;
  cat.name = newName;
  scheduleSave();

  const title = document.createElement("h3");
  title.className = "text-sm font-black text-white uppercase tracking-tight";
  title.setAttribute("data-cat-title", "");
  title.textContent = newName;
  if (inputEl) {
    inputEl.replaceWith(title);
  }
}

function deleteCategory(catId) {
  const position = state.positions[state.activeTab];
  if (!position) return;
  if (position.categories.length <= 1) {
    showToast("카테고리는 최소 1개 필요해요");
    return;
  }
  const target = position.categories.find((cat) => cat.id === catId);
  if (!target) return;
  if (!confirm(`카테고리 '${target.name}' 삭제할까요?`)) return;
  position.categories = position.categories.filter((cat) => cat.id !== catId);
  delete state.ui.collapsed[catId];
  scheduleSave();
  renderActiveTab();
  refreshProgressUI();
}

let lastDeleted = null;

function deleteTask(taskId) {
  const position = state.positions[state.activeTab];
  if (!position) return;

  position.categories.some((cat) => {
    const index = cat.tasks.findIndex((task) => task.id === taskId);
    if (index >= 0) {
      const [task] = cat.tasks.splice(index, 1);
      lastDeleted = { task, catId: cat.id, posId: position.id, index };
      scheduleSave();
      const card = qs(`[data-task-id="${taskId}"]`);
      if (card) card.remove();
      updateSectionCounts(position.id, cat.id);
      refreshProgressUI();
      showToast(`삭제됨: ${task.text}`);
      safeVibrate([25, 40, 25]);
      return true;
    }
    return false;
  });
}

function undoDelete() {
  if (!lastDeleted) return;
  const { task, catId, posId, index } = lastDeleted;
  const position = state.positions[posId];
  const category = position?.categories.find((c) => c.id === catId);
  if (!category) return;
  category.tasks.splice(index, 0, task);
  scheduleSave();

  const list = qs(`#list-${catId}`);
  if (list) {
    const wrap = document.createElement("div");
    wrap.innerHTML = taskCardHTML(task, posId, catId, category.mode);
    const el = wrap.firstElementChild;
    const ref = list.children[index];
    if (ref) {
      list.insertBefore(el, ref);
    } else {
      list.appendChild(el);
    }
  }
  updateSectionCounts(posId, catId);
  refreshProgressUI();
  safeVibrate([20, 30, 20]);
  lastDeleted = null;
  hideToast();
}

function resetAllTasks() {
  Object.values(state.positions).forEach((position) => {
    position.categories.forEach((cat) => {
      cat.tasks.forEach((task) => {
        task.done = false;
      });
    });
  });
}

function showLockScreen() {
  const lock = qs("#lock-screen");
  if (!lock) return;
  lock.style.display = "flex";
  lock.style.opacity = "1";
  lock.style.pointerEvents = "auto";
  qs("#footer-status")?.classList.add("hidden");
}

function hideLockScreen() {
  const lock = qs("#lock-screen");
  if (!lock) return;
  lock.style.opacity = "0";
  lock.style.pointerEvents = "none";
  setTimeout(() => {
    lock.style.display = "none";
  }, 300);
  qs("#footer-status")?.classList.remove("hidden");
}

function applyLockState() {
  const todayKey = getLocalDateKey(new Date());
  if (state.lastPunchDate !== todayKey) {
    state.sessionActive = false;
    scheduleSave();
  }
  if (state.sessionActive) {
    hideLockScreen();
  } else {
    showLockScreen();
  }
}

function punchOutAndReset() {
  if (!confirm("퇴근 처리하고 체크를 초기화할까요?")) return;
  resetAllTasks();
  state.sessionActive = false;
  state.lastPunchDate = getLocalDateKey(new Date());
  scheduleSave();
  renderActiveTab();
  showLockScreen();
  safeVibrate([25, 40, 25]);
}

function punchIn(targetTab) {
  const todayKey = getLocalDateKey(new Date());
  if (state.lastPunchDate !== todayKey) {
    resetAllTasks();
    state.lastPunchDate = todayKey;
    scheduleSave();
  }

  if (targetTab && state.positions[targetTab]) {
    state.activeTab = targetTab;
    scheduleSave();
  }

  state.sessionActive = true;
  scheduleSave();
  hideLockScreen();
  renderTabs();
  renderActiveTab();
  refreshProgressUI();
  safeVibrate([20]);
}

function initMediaShare() {
  const cameraInput = qs("#inline-camera");
  const galleryInput = qs("#inline-gallery");
  const overlay = qs("#camera-overlay");
  const video = qs("#camera-stream");
  const closeBtn = qs("#camera-close");
  const shotBtn = qs("#camera-shot");
  const shareBtn = qs("#camera-share");
  const countEl = qs("#camera-count");
  if (!cameraInput && !galleryInput && !overlay) return;

  let stream = null;
  let shots = [];
  let historyPushed = false;

  const updateCameraStatus = () => {
    if (countEl) countEl.textContent = shots.length ? `${shots.length}` : "";
    if (shareBtn) shareBtn.disabled = shots.length === 0;
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (video) video.srcObject = null;
  };

  const closeOverlay = () => {
    if (!overlay) return;
    overlay.classList.remove("open");
    stopStream();
    shots = [];
    updateCameraStatus();
    if (historyPushed) {
      historyPushed = false;
      if (history.state?.cameraOverlay) history.back();
    }
  };

  const openOverlay = async () => {
    if (!overlay || !video || !navigator.mediaDevices?.getUserMedia) {
      cameraInput?.click();
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
      overlay.classList.add("open");
      shots = [];
      updateCameraStatus();
      if (!historyPushed) {
        history.pushState({ cameraOverlay: true }, "");
        historyPushed = true;
      }
    } catch (err) {
      console.warn("[camera] getUserMedia failed", err);
      cameraInput?.click();
    }
  };

  openCameraOverlay = openOverlay;

  const shareFiles = async (files) => {
    const fileList = Array.from(files || []).filter(Boolean);
    if (!fileList.length) return;

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: fileList }))) {
      try {
        await navigator.share({ files: fileList });
        showToast("공유 창 열림");
      } catch (err) {
        if (err?.name !== "AbortError") showToast("공유 실패");
      }
      return;
    }

    fileList.forEach((file) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "photo.jpg";
      a.click();
      URL.revokeObjectURL(url);
    });
    showToast("공유 미지원: 파일로 저장했어");
  };

  const handleChange = (input) => {
    if (!input?.files || input.files.length === 0) return;
    shareFiles(input.files);
    input.value = "";
  };

  cameraInput?.addEventListener("change", () => handleChange(cameraInput));
  galleryInput?.addEventListener("change", () => handleChange(galleryInput));

  shotBtn?.addEventListener("click", async () => {
    if (!video || !stream) return;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) return;
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
    shots.push(file);
    updateCameraStatus();
    showToast(`촬영됨 (${shots.length})`);
  });

  shareBtn?.addEventListener("click", async () => {
    if (!shots.length) return;
    await shareFiles(shots);
    shots = [];
    updateCameraStatus();
  });

  closeBtn?.addEventListener("click", closeOverlay);
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  window.addEventListener("popstate", () => {
    if (overlay?.classList.contains("open")) {
      closeOverlay();
    }
  });
}

function initSettings() {
  const overlay = qs("#settings-overlay");
  const openBtn = qs("#btn-settings");
  const closeBtn = qs("#settings-close");
  const defaultTab = qs("#setting-default-tab");
  const showCarry = qs("#setting-show-carry");
  const exportBtn = qs("#setting-export");
  const importBtn = qs("#setting-import");
  const importFile = qs("#setting-import-file");
  const resetBtn = qs("#setting-reset");
  const installBtn = qs("#setting-install");
  const tabName = qs("#setting-tab-name");
  const tabTemplate = qs("#setting-tab-template");
  const tabAdd = qs("#setting-tab-add");
  const tabList = qs("#setting-tab-list");
  const aiTarget = qs("#setting-ai-target");
  const aiNameLabel = qs("#setting-ai-name-label");
  const aiName = qs("#setting-ai-name");
  const aiRequest = qs("#setting-ai-request");
  const aiBtn = qs("#setting-ai-generate");
  const aiStatus = qs("#setting-ai-status");

  const updateDefaultOptions = () => {
    if (!defaultTab) return;
    defaultTab.innerHTML = getTabList()
      .map((tab) => `<option value="${tab.id}">${escapeHtml(tab.name)}</option>`)
      .join("");
    defaultTab.value = state.preferences?.defaultTab || state.activeTab;
  };

  const updateTabTemplateOptions = () => {
    if (!tabTemplate) return;
    const options = [
      { id: "blank", label: "빈 탭" },
      { id: "clone-active", label: "현재 탭 복제" }
    ];
    tabTemplate.innerHTML = options.map((opt) => `<option value="${opt.id}">${opt.label}</option>`).join("");
  };

  const renderTabManager = () => {
    if (!tabList) return;
    tabList.innerHTML = getPositionOrder()
      .map((id) => {
        const pos = state.positions[id];
        if (!pos) return "";
        const active = state.activeTab === id ? "active" : "";
        return `
          <div class="tab-manager-item ${active}" data-tab-id="${id}">
            <div class="tab-manager-name">${escapeHtml(pos.name)}</div>
            <div class="tab-manager-actions">
              <button class="tab-manager-btn rename" data-tab-action="rename" data-tab-id="${id}">NAME</button>
              <button class="tab-manager-btn dup" data-tab-action="dup" data-tab-id="${id}">DUP</button>
              <button class="tab-manager-btn del" data-tab-action="del" data-tab-id="${id}">DEL</button>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const updateAiLabels = () => {
    if (!aiTarget || !aiNameLabel || !aiName) return;
    const isNew = aiTarget.value === "new";
    aiNameLabel.textContent = isNew ? "새 탭 이름" : "새 카테고리 이름";
    aiName.placeholder = isNew ? "예: 여행 준비" : "예: 해야 할 일";
  };

  const setAiStatus = (msg, tone = "") => {
    if (!aiStatus) return;
    aiStatus.textContent = msg || "";
    aiStatus.dataset.tone = tone;
  };

  updateDefaultOptions();
  updateTabTemplateOptions();
  renderTabManager();
  updateAiLabels();
  setAiStatus("");
  if (showCarry) showCarry.checked = state.preferences?.showCarry !== false;

  openBtn?.addEventListener("click", () => {
    updateDefaultOptions();
    renderTabManager();
    updateAiLabels();
    if (overlay) overlay.classList.add("open");
  });
  closeBtn?.addEventListener("click", () => overlay?.classList.remove("open"));
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  defaultTab?.addEventListener("change", () => {
    state.preferences.defaultTab = defaultTab.value;
    scheduleSave();
  });

  showCarry?.addEventListener("change", () => {
    state.preferences.showCarry = showCarry.checked;
    scheduleSave();
    renderActiveTab();
  });

  tabAdd?.addEventListener("click", () => {
    const name = safeText(tabName?.value);
    const template = tabTemplate?.value || "blank";
    let categories = [];
    if (template === "clone-active" && state.activeTab !== GUIDE_TAB.id) {
      const active = state.positions[state.activeTab];
      if (active) categories = cloneCategories(active.categories, true);
    } else if (template === "clone-active") {
      showToast("가이드 탭은 복제할 수 없어요");
    }
    const position = createPosition(name || "새 체크리스트", categories);
    addPosition(position, true);
    if (tabName) tabName.value = "";
    updateDefaultOptions();
    renderTabManager();
  });

  tabList?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab-action]");
    if (!btn) {
      const item = e.target.closest("[data-tab-id]");
      const id = item?.dataset.tabId;
      if (id && id !== state.activeTab) {
        setActiveTab(id);
        updateDefaultOptions();
        renderTabManager();
      }
      return;
    }
    const id = btn.dataset.tabId;
    const action = btn.dataset.tabAction;
    if (!id || !action) return;

    if (action === "rename") {
      const next = window.prompt("새 탭 이름", state.positions[id]?.name || "");
      if (next && next.trim()) {
        renamePosition(id, next);
        updateDefaultOptions();
        renderTabManager();
      }
      return;
    }

    if (action === "dup") {
      duplicatePosition(id);
      updateDefaultOptions();
      renderTabManager();
      return;
    }

    if (action === "del") {
      deletePosition(id);
      updateDefaultOptions();
      renderTabManager();
    }
  });

  aiTarget?.addEventListener("change", updateAiLabels);

  aiBtn?.addEventListener("click", async () => {
    const request = safeText(aiRequest?.value);
    if (!request) {
      showToast("요청 내용을 입력해줘");
      return;
    }
    const target = aiTarget?.value || "new";
    const name = safeText(aiName?.value);
    if (target === "current" && state.activeTab === GUIDE_TAB.id) {
      showToast("가이드 탭에는 추가할 수 없어요");
      return;
    }

    if (aiBtn) aiBtn.disabled = true;
    setAiStatus("AI 생성 중...", "loading");
    try {
      const result = await requestAiChecklist({ request, target, contextName: name });
      if (!result) throw new Error("AI 응답 없음");
      const categories = buildCategoriesFromList(result.categories, target === "current" ? name : "");
      if (!categories.length) throw new Error("카테고리 없음");

      if (target === "new") {
        const position = createPosition(result.title || name || "새 체크리스트", categories);
        addPosition(position, true);
      } else {
        const position = state.positions[state.activeTab];
        if (!position) throw new Error("현재 탭 없음");
        position.categories.push(...categories);
        scheduleSave();
        renderActiveTab();
        refreshProgressUI();
      }

      if (aiRequest) aiRequest.value = "";
      if (aiName) aiName.value = "";
      updateDefaultOptions();
      renderTabManager();
      setAiStatus("완료됨", "success");
      showToast("AI 체크리스트 추가 완료");
    } catch (err) {
      console.warn(err);
      setAiStatus("실패: 응답 형식 확인 필요", "error");
      showToast("AI 생성 실패");
    } finally {
      if (aiBtn) aiBtn.disabled = false;
    }
  });

  exportBtn?.addEventListener("click", () => {
    downloadFile("kfc-checklist-backup.json", JSON.stringify(state, null, 2), "application/json");
  });

  importBtn?.addEventListener("click", () => importFile?.click());
  importFile?.addEventListener("change", async () => {
    if (!importFile.files || importFile.files.length === 0) return;
    try {
      const text = await readFileAsText(importFile.files[0]);
      const data = JSON.parse(text);
      state = data;
      scheduleSave();
      ensureActiveTab();
      renderTabs();
      renderActiveTab();
      refreshProgressUI();
      applyFocusMode();
      updateDefaultOptions();
      renderTabManager();
      showToast("불러오기 완료");
    } catch (e) {
      showToast("불러오기 실패");
      console.warn(e);
    }
  });

  resetBtn?.addEventListener("click", () => {
    if (!confirm("모든 설정을 초기화하고 기본 리스트로 돌아갈까요?")) return;
    state = loadState();
    scheduleSave();
    renderTabs();
    renderActiveTab();
    refreshProgressUI();
    applyFocusMode();
    updateDefaultOptions();
    renderTabManager();
    applyLockState();
  });

  installBtn?.addEventListener("click", async () => {
    if (window.__deferredPrompt) {
      window.__deferredPrompt.prompt();
      const choice = await window.__deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        showToast("설치 요청 완료");
      }
      window.__deferredPrompt = null;
    } else {
      showToast("설치 버튼이 아직 준비되지 않았어요");
    }
  });

  initMediaShare();
}

function handleActionClick(target) {
  if (!target) return;
  if (Date.now() < dragState.suppressClickUntil) return;
  const action = target.dataset.action;

  if (action === "toggle-section") {
    toggleSection(target.dataset.catId);
    return;
  }

  if (action === "toggle-restock-filter") {
    toggleRestockFilter(target.dataset.catId);
    return;
  }

  if (action === "reset-restock") {
    resetRestockCategory(target.dataset.catId);
    return;
  }

  if (action === "toggle-carry-panel") {
    toggleCarryPanel();
    return;
  }

  if (action === "open-camera") {
    if (typeof openCameraOverlay === "function") {
      openCameraOverlay();
    } else {
      qs("#inline-camera")?.click();
    }
    return;
  }

  if (action === "open-gallery") {
    qs("#inline-gallery")?.click();
    return;
  }

  if (action === "open-add-task") {
    openAddTaskInput(target.dataset.catId);
    safeVibrate(10);
    return;
  }

  if (action === "cancel-add-task") {
    cancelAddTask(target.dataset.catId);
    safeVibrate(10);
    return;
  }

  if (action === "confirm-add-task") {
    confirmAddTask(target.dataset.catId);
    return;
  }

  if (action === "open-add-category") {
    openAddCategory();
    safeVibrate(10);
    return;
  }

  if (action === "cancel-add-category") {
    cancelAddCategory();
    safeVibrate(10);
    return;
  }

  if (action === "confirm-add-category") {
    confirmAddCategory();
    return;
  }

  if (action === "edit-task") {
    enterEditTask(target.dataset.taskId);
    return;
  }

  if (action === "edit-category") {
    enterEditCategory(target.dataset.catId);
    return;
  }

  if (action === "delete-category") {
    deleteCategory(target.dataset.catId);
    return;
  }

  if (action === "toggle-task") {
    const taskId = target.dataset.taskId;
    const card = qs(`[data-task-id="${taskId}"]`);
    const catId = card?.dataset.catId;
    const position = state.positions[state.activeTab];
    const category = position?.categories.find((c) => c.id === catId);
    const task = category?.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.done = !task.done;
    scheduleSave();
    const restock = isRestockCategory(category);
    let rerender = false;
    if (restock && isRestockFilterOn(catId)) {
      rerender = true;
    }
    if (category && shouldShowCarryInline(position, category) && isCarryAnchorTask(task)) {
      if (!state.ui.carryOpen) {
        state.ui.carryOpen = true;
        rerender = true;
      }
    }
    if (rerender) {
      renderActiveTab();
      refreshProgressUI();
    } else {
      updateTaskDOM(taskId, catId);
      updateSectionCounts(position.id, catId);
      refreshProgressUI();
      if (restock) {
        renderRestockPanel();
      }
    }
    safeVibrate(12);
    return;
  }

  if (action === "delete-task") {
    deleteTask(target.dataset.taskId);
    return;
  }

  if (action === "carry-add") {
    state.carry.push({ id: createId("carry"), name: "항목", qty: "", hint: "" });
    scheduleSave();
    renderActiveTab();
    safeVibrate(10);
    return;
  }

  if (action === "carry-del") {
    const id = target.dataset.carryId;
    state.carry = state.carry.filter((item) => item.id !== id);
    scheduleSave();
    renderActiveTab();
    safeVibrate([25, 40, 25]);
    return;
  }
}

function initEventHandlers() {
  qs("#toast-undo")?.addEventListener("click", undoDelete);
  qs("#toast-close")?.addEventListener("click", () => {
    lastDeleted = null;
    hideToast();
  });

  qs("#btn-punch-out")?.addEventListener("click", punchOutAndReset);
  qs("#btn-punch-back")?.addEventListener("click", () => punchIn("back"));
  qs("#btn-punch-counter")?.addEventListener("click", () => punchIn("counter"));
  qs("#btn-factory-reset")?.addEventListener("click", () => {
    if (!confirm("모든 설정을 초기화하고 기본 리스트로 돌아갈까요?")) return;
    state = loadState();
    scheduleSave();
    renderTabs();
    renderActiveTab();
    refreshProgressUI();
    applyFocusMode();
    applyLockState();
  });

  qs("#btn-focus")?.addEventListener("click", toggleFocusMode);
  qs("#focus-exit")?.addEventListener("click", toggleFocusMode);

  qs("#position-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab-id]");
    if (!btn) return;
    setActiveTab(btn.dataset.tabId);
  });

  const content = mainContent();
  content?.addEventListener("pointerdown", handlePointerDown, { passive: false });
  content?.addEventListener("pointermove", handlePointerMove, { passive: false });
  content?.addEventListener("pointerup", handlePointerUp);
  content?.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("pointerup", handlePointerUp);
  const preventDragScroll = (e) => {
    if (!dragState.active) return;
    e.preventDefault();
  };
  content?.addEventListener("touchmove", preventDragScroll, { passive: false });

  content?.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    handleActionClick(target);
  });

  const restockPanel = qs("#restock-panel");
  restockPanel?.addEventListener("pointerdown", handlePointerDown, { passive: false });
  restockPanel?.addEventListener("pointermove", handlePointerMove, { passive: false });
  restockPanel?.addEventListener("pointerup", handlePointerUp);
  restockPanel?.addEventListener("pointercancel", handlePointerUp);
  restockPanel?.addEventListener("touchmove", preventDragScroll, { passive: false });
  restockPanel?.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    handleActionClick(target);
  });

  qs("#restock-toggle")?.addEventListener("click", () => toggleRestockPanel());
  qs("#restock-close")?.addEventListener("click", () => toggleRestockPanel(false));

  content?.addEventListener("input", (e) => {
    const el = e.target;
    if (!el || !el.dataset || !el.dataset.action) return;

    const action = el.dataset.action;
    if (action !== "carry-name" && action !== "carry-qty") return;

    const id = el.dataset.carryId;
    const idx = state.carry.findIndex((item) => item.id === id);
    if (idx < 0) return;

    if (action === "carry-name") {
      state.carry[idx].name = el.value;
      scheduleSave();
      return;
    }

    if (action === "carry-qty") {
      const hint = el.dataset.hint || "";
      const cleaned = el.value.replace(/\D+/g, "");
      if (cleaned === "") {
        el.value = "";
        el.placeholder = hint;
        state.carry[idx].qty = "";
        scheduleSave();
        return;
      }
      el.value = cleaned;
      el.placeholder = "";
      const n = Math.max(0, parseInt(cleaned, 10));
      state.carry[idx].qty = Number.isFinite(n) ? String(n) : "";
      scheduleSave();
    }
  });
}

export function initApp() {
  ensureActiveTab();
  renderTabs();
  renderActiveTab();
  refreshProgressUI();
  applyFocusMode();
  applyLockState();
  initSettings();
  initEventHandlers();
  updateClock();
  setInterval(updateClock, 1000);

  return { showToast };
}
