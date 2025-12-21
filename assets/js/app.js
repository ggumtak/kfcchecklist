import { loadState, saveState } from "./storage.js";
import { GUIDE_TAB } from "./data.js";
import { qs, escapeHtml, safeVibrate, createId, debounce, downloadFile, readFileAsText } from "./utils.js";
import { getGuideHTML } from "./guide.js";

let state = loadState();
let toastTimer = null;
const dragState = {
  active: false,
  card: null,
  catId: null,
  pointerId: null,
  startX: 0,
  startY: 0,
  longPressTimer: null,
  suppressClickUntil: 0
};
const DRAG_LONG_PRESS_MS = 280;
const DRAG_MOVE_THRESHOLD = 8;

const scheduleSave = debounce(() => saveState(state), 200);

const mainContent = () => qs("#main-content");

function getPositionOrder() {
  const base = ["kitchen", "back", "counter"];
  const extra = Object.keys(state.positions || {}).filter((key) => !base.includes(key));
  return [...base.filter((key) => state.positions[key]), ...extra];
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
  const tasks = position.categories.flatMap((cat) => cat.tasks || []);
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

function taskCardHTML(task, posId, catId) {
  const doneClass = task.done ? "bg-black/30 border-white/5" : "";
  const textClass = task.done ? "text-white/20 line-through" : "text-white/90";
  const check = task.done
    ? `
    <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path>
    </svg>`
    : "";

  return `
    <div class="square-card task-card p-5 flex items-center justify-between transition-all ${doneClass}"
         data-task-id="${task.id}" data-cat-id="${catId}" data-pos-id="${posId}">
      <button class="flex items-center gap-4 flex-1 text-left"
              data-action="toggle-task" data-task-id="${task.id}">
        <div class="check-box ${task.done ? "checked" : ""}">${check}</div>
        <span class="text-[15px] font-bold tracking-tight ${textClass}" data-task-text>${escapeHtml(
    task.text
  )}</span>
      </button>

      <div class="flex items-center gap-2">
        <button class="text-white/20 hover:text-cyan-200 p-2 transition-colors"
                data-action="edit-task" data-task-id="${task.id}" aria-label="edit">
          EDIT
        </button>
        <button class="text-white/10 hover:text-red-500/60 p-2 transition-colors"
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

function renderCarryPanelHTML() {
  const rows = state.carry.map(carryRowHTML).join("");
  return `
    <section class="space-y-3 fade-in">
      <div class="square-card p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-4 bg-cyan-300"></div>
              <h2 class="text-sm font-black uppercase tracking-tight">냉동 워크인 준비</h2>
            </div>
            <p class="text-[10px] mono text-white/25 uppercase tracking-[0.25em] mt-2">
              TAKE LIST / BEFORE WALK-IN
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              class="px-4 py-2 rounded-[calc(var(--radius)+2px)] bg-cyan-400/10 border border-cyan-300/20 text-cyan-200 text-[10px] mono font-bold uppercase tracking-widest active:scale-[0.98] transition"
              data-action="carry-copy">
              COPY
            </button>
            <button
              class="px-4 py-2 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/35 text-[10px] mono uppercase tracking-widest active:scale-[0.98] transition"
              data-action="carry-add">
              + ADD
            </button>
          </div>
        </div>

        <div class="mt-4 grid gap-2" id="carry-list">
          ${rows}
        </div>

        <div class="mt-4 text-[10px] mono text-white/25">
          TIP: 수량칸은 비워두고, 필요한 개수만 입력 → COPY. (회색 숫자는 기준 힌트)
        </div>
      </div>
    </section>
  `;
}

function carryRowHTML(item) {
  const safeName = escapeHtml(item.name ?? "");
  const hint = item.hint ?? "";
  const value = item.qty === "" || item.qty == null ? "" : String(item.qty);

  return `
    <div class="carry-row">
      <input
        class="field carry-name px-3 py-3 text-[12px] font-bold"
        data-action="carry-name"
        data-carry-id="${item.id}"
        value="${safeName}"
        placeholder="항목명" />
      <input
        class="field carry-qty px-3 py-3 text-[12px] font-black text-cyan-200 mono text-center"
        type="tel" inputmode="numeric" pattern="[0-9]*"
        data-action="carry-qty"
        data-carry-id="${item.id}"
        data-hint="${hint}"
        placeholder="${hint}"
        value="${value}" />
      <button
        class="carry-del px-3 py-3 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/40 hover:text-red-400"
        data-action="carry-del"
        data-carry-id="${item.id}"
        aria-label="carry delete">
        X
      </button>
    </div>
  `;
}

function makeCarryText() {
  const lines = state.carry
    .filter((item) => safeText(item.name).length > 0)
    .filter((item) => item.qty !== "" && item.qty != null)
    .map((item) => `${safeText(item.name)} ${item.qty}개`);
  return lines.join("\n");
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  } catch (_) {}
  return false;
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

function clearDragTimer() {
  if (dragState.longPressTimer) {
    clearTimeout(dragState.longPressTimer);
    dragState.longPressTimer = null;
  }
}

function startDrag(card, catId, pointerId) {
  dragState.active = true;
  dragState.card = card;
  dragState.catId = catId;
  dragState.pointerId = pointerId;
  card.classList.add("dragging");
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

function endDrag(commit = true) {
  clearDragTimer();
  if (!dragState.active) return;
  if (dragState.card) dragState.card.classList.remove("dragging");
  if (commit) {
    reorderCategoryFromDOM(dragState.catId);
    scheduleSave();
  }
  dragState.active = false;
  dragState.card = null;
  dragState.catId = null;
  dragState.pointerId = null;
  dragState.suppressClickUntil = Date.now() + 300;
}

function handlePointerDown(e) {
  const card = e.target.closest(".task-card");
  if (!card || state.activeTab === GUIDE_TAB.id) return;
  if (e.target.closest("[data-action=\"delete-task\"], [data-action=\"edit-task\"]")) return;
  if (e.target.closest("input, textarea, select")) return;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;
  dragState.card = card;
  dragState.catId = card.dataset.catId;
  dragState.pointerId = e.pointerId;
  clearDragTimer();
  dragState.longPressTimer = setTimeout(() => {
    startDrag(card, dragState.catId, e.pointerId);
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

  const list = qs(`#list-${dragState.catId}`);
  if (!list || !dragState.card) return;

  e.preventDefault();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const target = el?.closest(".task-card");
  if (!target || target === dragState.card) return;
  if (target.dataset.catId !== dragState.catId) return;

  const rect = target.getBoundingClientRect();
  const before = e.clientY < rect.top + rect.height / 2;
  if (before) {
    list.insertBefore(dragState.card, target);
  } else {
    list.insertBefore(dragState.card, target.nextSibling);
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

  position.categories.forEach((cat) => {
    const section = document.createElement("section");
    section.className = "space-y-4 fade-in";
    section.dataset.catId = cat.id;

    const collapsed = isCollapsed(cat.id);

    section.innerHTML = `
      <div class="sticky-section-header flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-1.5 h-4 bg-cyan-300"></div>
          <h3 class="text-sm font-black text-white uppercase tracking-tight" data-cat-title>${escapeHtml(
    cat.name
  )}</h3>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] mono text-white/20" id="cat-count-${cat.id}">0/0</span>
          <button
            class="p-2 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/60"
            data-action="edit-category" data-cat-id="${cat.id}" aria-label="edit category">EDIT</button>
          <button
            class="p-2 rounded-[calc(var(--radius)+2px)] bg-white/5 border border-white/10 text-white/60 active:scale-[0.98] transition"
            data-action="toggle-section" data-cat-id="${cat.id}" aria-label="toggle section">
            <svg id="chev-${cat.id}" class="chev ${collapsed ? "" : "open"} w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </div>

      <div id="sec-body-${cat.id}" class="${collapsed ? "hidden" : ""} space-y-3">
        <div class="grid gap-3" id="list-${cat.id}">
          ${cat.tasks.map((task) => taskCardHTML(task, position.id, cat.id)).join("")}
        </div>

        <div id="add-box-${cat.id}" class="pt-2 px-1">
          <button data-action="open-add-task" data-cat-id="${cat.id}"
            class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
            + ADD_TASK_ITEM
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
      <button data-action="open-add-category"
        class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
        + ADD_CATEGORY
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
    return;
  }

  const position = state.positions[state.activeTab];
  if (!position) {
    container.innerHTML = "";
    return;
  }

  if (state.preferences?.showCarry) {
    container.insertAdjacentHTML("beforeend", renderCarryPanelHTML());
  }

  const frag = renderCategories(position);
  container.appendChild(frag);

  position.categories.forEach((cat) => updateSectionCounts(position.id, cat.id));
}

function updateSectionCounts(posId, catId) {
  const position = state.positions[posId];
  if (!position) return;
  const cat = position.categories.find((c) => c.id === catId);
  if (!cat) return;
  const total = cat.tasks.length;
  const done = cat.tasks.reduce((sum, task) => sum + (task.done ? 1 : 0), 0);
  const el = qs(`#cat-count-${catId}`);
  if (el) el.textContent = `${done}/${total}`;
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

  if (task.done) {
    card.classList.add("bg-black/30", "border-white/5");
    checkbox.classList.add("checked");
    checkbox.innerHTML = `
      <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="M5 13l4 4L19 7"></path>
      </svg>`;
    text.classList.add("text-white/20", "line-through");
    text.classList.remove("text-white/90");
  } else {
    card.classList.remove("bg-black/30", "border-white/5");
    checkbox.classList.remove("checked");
    checkbox.innerHTML = "";
    text.classList.remove("text-white/20", "line-through");
    text.classList.add("text-white/90");
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
}

function cancelAddTask(catId) {
  const box = qs(`#add-box-${catId}`);
  if (!box) return;
  box.innerHTML = `
    <button data-action="open-add-task" data-cat-id="${catId}"
      class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
      + ADD_TASK_ITEM
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
    wrap.innerHTML = taskCardHTML(task, position.id, catId);
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
  }
}

function cancelAddCategory() {
  const box = qs("#add-category-box");
  if (!box) return;
  box.innerHTML = `
    <button data-action="open-add-category"
      class="w-full py-4 rounded-[calc(var(--radius)+4px)] border border-white/5 bg-white/[0.02] text-[10px] mono text-white/30 uppercase tracking-widest active:scale-[0.99] transition">
      + ADD_CATEGORY
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

  position.categories.some((cat) => {
    const found = cat.tasks.find((item) => item.id === taskId);
    if (found) {
      task = found;
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
  span.className = `text-[15px] font-bold tracking-tight ${
    task.done ? "text-white/20 line-through" : "text-white/90"
  }`;
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
    wrap.innerHTML = taskCardHTML(task, posId, catId);
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

function punchOutAndReset() {
  if (!confirm("퇴근 처리하고 체크를 초기화할까요?")) return;
  resetAllTasks();
  state.lastPunchDate = getLocalDateKey(new Date());
  scheduleSave();
  renderActiveTab();

  const lock = qs("#lock-screen");
  if (lock) {
    lock.style.display = "flex";
    lock.style.opacity = "1";
    lock.style.pointerEvents = "auto";
  }
  qs("#footer-status")?.classList.add("hidden");
  safeVibrate([25, 40, 25]);
}

function punchIn() {
  const todayKey = getLocalDateKey(new Date());
  if (state.lastPunchDate !== todayKey) {
    resetAllTasks();
    state.lastPunchDate = todayKey;
    scheduleSave();
  }

  const lock = qs("#lock-screen");
  if (lock) {
    lock.style.opacity = "0";
    lock.style.pointerEvents = "none";
    setTimeout(() => {
      lock.style.display = "none";
    }, 500);
  }
  qs("#footer-status")?.classList.remove("hidden");
  renderActiveTab();
  refreshProgressUI();
  safeVibrate([20]);
}

function initMediaShare() {
  const cameraInput = qs("#media-camera");
  const galleryInput = qs("#media-gallery");
  const preview = qs("#media-preview");
  const previewWrap = qs("#media-preview-wrap");
  const shareBtn = qs("#media-share");
  const clearBtn = qs("#media-clear");
  const noteInput = qs("#media-note");

  let currentFile = null;
  let currentUrl = "";

  const reset = () => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = "";
    currentFile = null;
    if (preview) preview.src = "";
    previewWrap?.classList.add("hidden");
    if (shareBtn) shareBtn.disabled = true;
  };

  const handleFile = (file) => {
    if (!file) return;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentFile = file;
    currentUrl = URL.createObjectURL(file);
    if (preview) preview.src = currentUrl;
    previewWrap?.classList.remove("hidden");
    if (shareBtn) shareBtn.disabled = false;
  };

  cameraInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = "";
  });

  galleryInput?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
    e.target.value = "";
  });

  clearBtn?.addEventListener("click", reset);

  shareBtn?.addEventListener("click", async () => {
    if (!currentFile) {
      showToast("사진을 먼저 선택해줘");
      return;
    }
    const text = noteInput?.value?.trim() || "";
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [currentFile] }))) {
      try {
        await navigator.share({ text, files: [currentFile] });
        showToast("공유 창 열림");
      } catch (err) {
        if (err?.name !== "AbortError") showToast("공유 실패");
      }
      return;
    }

    const url = URL.createObjectURL(currentFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentFile.name || "photo.jpg";
    a.click();
    URL.revokeObjectURL(url);
    showToast("공유 미지원: 파일로 저장했어");
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

  const updateDefaultOptions = () => {
    if (!defaultTab) return;
    defaultTab.innerHTML = getTabList()
      .map((tab) => `<option value="${tab.id}">${escapeHtml(tab.name)}</option>`)
      .join("");
    defaultTab.value = state.preferences?.defaultTab || state.activeTab;
  };

  updateDefaultOptions();
  if (showCarry) showCarry.checked = state.preferences?.showCarry !== false;

  openBtn?.addEventListener("click", () => {
    updateDefaultOptions();
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

function initEventHandlers() {
  qs("#toast-undo")?.addEventListener("click", undoDelete);
  qs("#toast-close")?.addEventListener("click", () => {
    lastDeleted = null;
    hideToast();
  });

  qs("#btn-punch-out")?.addEventListener("click", punchOutAndReset);
  qs("#btn-punch-in")?.addEventListener("click", punchIn);
  qs("#btn-factory-reset")?.addEventListener("click", () => {
    if (!confirm("모든 설정을 초기화하고 기본 리스트로 돌아갈까요?")) return;
    state = loadState();
    scheduleSave();
    renderTabs();
    renderActiveTab();
    refreshProgressUI();
  });

  qs("#position-tabs")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab-id]");
    if (!btn) return;
    setActiveTab(btn.dataset.tabId);
  });

  const content = mainContent();
  content?.addEventListener("pointerdown", handlePointerDown);
  content?.addEventListener("pointermove", handlePointerMove);
  content?.addEventListener("pointerup", handlePointerUp);
  content?.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("pointerup", handlePointerUp);

  content?.addEventListener("click", (e) => {
    const target = e.target.closest("[data-action]");
    if (!target) return;
    if (Date.now() < dragState.suppressClickUntil) return;
    const action = target.dataset.action;

    if (action === "toggle-section") {
      toggleSection(target.dataset.catId);
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
      updateTaskDOM(taskId, catId);
      updateSectionCounts(position.id, catId);
      refreshProgressUI();
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

    if (action === "carry-copy") {
      const text = makeCarryText();
      if (!text) {
        showToast("복사할 수량이 없어 (수량 입력해줘)");
        safeVibrate(20);
        return;
      }
      copyToClipboard(text).then((ok) => {
        showToast(ok ? "워크인 목록 복사 완료" : "복사 실패: 수동으로 복사해줘");
        safeVibrate([15, 30, 15]);
      });
    }
  });

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
  initSettings();
  initEventHandlers();
  updateClock();
  setInterval(updateClock, 1000);

  return { showToast };
}
