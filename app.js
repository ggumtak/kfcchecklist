const KEY = "kfc-checklist-static-v2";
const SW = "./sw.js";

const T = {
  roles: {
    back: ["\uBC31", "BACK"],
    counter: ["\uCE74\uC6B4\uD130", "COUNTER"],
  },
  quickEdit: "\uD15C\uD50C\uB9BF \uD3B8\uC9D1",
  quickEditDone: "\uD3B8\uC9D1 \uC885\uB8CC",
  quickSession: "\uC0C8 \uC138\uC158",
  quickSettings: "\uC124\uC815",
  manage: "\uAD00\uB9AC",
  close: "\uB2EB\uAE30",
  tip: "\uD15C\uD50C\uB9BF \uC218\uC815 \uB0B4\uC6A9\uC740 \uB2E4\uC74C \uC138\uC158 \uC2DC\uC791\uBD80\uD130 \uBC18\uC601\uB429\uB2C8\uB2E4.",
  summary: "\uCCB4\uD06C\uB9AC\uC2A4\uD2B8",
  done: "\uC644\uB8CC",
  none: "\uC544\uC9C1 \uAE30\uB85D \uC5C6\uC74C",
  active: "ACTIVE",
  template: "TEMPLATE",
  install: "INSTALL",
  online: "\uB3D9\uAE30\uD654 \uAC00\uB2A5",
  offline: "\uC624\uD504\uB77C\uC778 \uC0AC\uC6A9 \uAC00\uB2A5",
  installReady: "\uC124\uCE58 \uAC00\uB2A5",
  installDone: "\uC571 \uC124\uCE58 \uC644\uB8CC",
  installCancel: "\uC124\uCE58\uAC00 \uCDE8\uC18C\uB428",
  installHelp: "\uBE0C\uB77C\uC6B0\uC800 \uBA54\uB274\uC758 \uD648 \uD654\uBA74 \uCD94\uAC00\uB97C \uC0AC\uC6A9\uD558\uC138\uC694",
  sessionDone: "\uC0C8 \uC138\uC158 \uC0DD\uC131 \uC644\uB8CC",
  editMode: "\uD15C\uD50C\uB9BF \uD3B8\uC9D1 \uBAA8\uB4DC",
  checkMode: "\uCCB4\uD06C \uBAA8\uB4DC",
  exportDone: "\uBC31\uC5C5 \uC800\uC7A5 \uC644\uB8CC",
  importDone: "\uBC31\uC5C5 \uBD88\uB7EC\uC624\uAE30 \uC644\uB8CC",
  importFail: "\uBC31\uC5C5 \uBD88\uB7EC\uC624\uAE30 \uC2E4\uD328",
  addCategory: "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00",
  addItem: "\uC138\uBD80 \uD56D\uBAA9 \uCD94\uAC00",
  delCategory: "\uCE74\uD14C\uACE0\uB9AC \uC0AD\uC81C",
  delItem: "\uC138\uBD80 \uD56D\uBAA9 \uC0AD\uC81C",
  newCategory: "\uC0C8 \uCE74\uD14C\uACE0\uB9AC",
  newItem: "\uC0C8 \uCCB4\uD06C \uD56D\uBAA9",
  type: {
    check: "\uCCB4\uD06C",
    number: "\uC22B\uC790",
    text: "\uBA54\uBAA8",
    timer: "\uD0C0\uC774\uBA38",
  },
  phase: {
    arrival: ["\uAC00\uC790\uB9C8\uC790 \uD560 \uC77C", "\uCD9C\uADFC \uC9C1\uD6C4 \uBC14\uB85C \uD655\uC778\uD558\uB294 \uD56D\uBAA9"],
    mid: ["\uC911\uAC04\uC5D0 \uD560 \uC77C", "\uADFC\uBB34 \uC911\uAC04 \uC720\uC9C0 \uAD00\uB9AC\uC640 \uBCF4\uCD95"],
    preclose: ["\uB9C8\uAC10 \uC9C1\uC804\uC5D0 \uD560 \uC77C", "\uB9C8\uAC10 \uC9C1\uC804 \uB204\uB77D \uBC29\uC9C0\uC6A9 \uC810\uAC80"],
    postclose: ["\uB9C8\uAC10\uD558\uACE0 \uD560 \uC77C", "\uCCAD\uC18C\uC640 \uB2E4\uC74C \uADFC\uBB34 \uC900\uBE44"],
  },
};

const U = {
  date: document.querySelector("#system-date"),
  clock: document.querySelector("#system-clock"),
  mode: document.querySelector("#mode-status"),
  progress: document.querySelector("#global-progress-fill"),
  summary: document.querySelector("#summary-card"),
  roles: document.querySelector("#role-switch"),
  meta: document.querySelector("#meta-row"),
  stack: document.querySelector("#phase-stack"),
  edit: document.querySelector("#toggle-edit"),
  session: document.querySelector("#start-session"),
  settings: document.querySelector("#open-settings"),
  fab: document.querySelector("#floating-button"),
  overlay: document.querySelector("#sheet-overlay"),
  sheet: document.querySelector("#settings-sheet"),
  close: document.querySelector("#close-settings"),
  heading: document.querySelector(".sheet-head h3"),
  note: document.querySelector("#sheet-note-copy"),
  startBtn: document.querySelector("#sheet-start-session"),
  editBtn: document.querySelector("#sheet-toggle-edit"),
  installBtn: document.querySelector("#sheet-install"),
  exportBtn: document.querySelector("#sheet-export"),
  importBtn: document.querySelector("#sheet-import"),
  file: document.querySelector("#import-file"),
};

const V = {
  role: "back",
  edit: false,
  sheet: false,
  prompt: null,
  collapsed: { back: {}, counter: {} },
  status: navigator.onLine ? T.online : T.offline,
};

const id = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Math.random().toString(16).slice(2)}-${Date.now()}`);
const now = () => new Date().toISOString();
const day = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const item = (title, type) => ({ id: id(), title, type });
const cat = (title, items) => ({ id: id(), title, items });
const phase = (key, categories) => ({ key, title: T.phase[key][0], description: T.phase[key][1], categories });

function templates() {
  return {
    back: {
      role: "back",
      updatedAt: now(),
      phases: [
        phase("arrival", [
          cat("\uC704\uC0DD / \uC548\uC804", [item("\uC190 \uC50C\uAE30 \uBC0F \uC7A5\uAC11 \uCC29\uC6A9", "check"), item("\uC791\uC5C5\uB300\uC640 \uB3C4\uAD6C \uC18C\uB3C5", "check"), item("\uB0C9\uC7A5 / \uB0C9\uB3D9 \uC628\uB3C4 \uAE30\uB85D", "number")]),
          cat("\uD504\uB819 / \uC608\uC5F4", [item("\uD280\uAE40\uAE30 \uC608\uC5F4 \uC0C1\uD0DC \uD655\uC778", "check"), item("\uC18C\uC2A4 \uBC0F \uC0AC\uC774\uB4DC \uAE30\uBCF8 \uC900\uBE44", "check"), item("\uC624\uB298 \uC608\uC0C1 \uD310\uB9E4\uB7C9 \uBA54\uBAA8", "text")]),
        ]),
        phase("mid", [
          cat("\uBCF4\uCD95", [item("\uC8FC\uC694 \uC7AC\uB8CC \uBCF4\uCD95", "check"), item("\uC18C\uC2A4\uC640 \uD3EC\uC7A5\uC7AC \uBCF4\uCD95", "check")]),
          cat("\uCCAD\uACB0", [item("\uBC14\uB2E5 \uC624\uC5FC \uBC0F \uBBF8\uB044\uB7FC \uD655\uC778", "check"), item("\uC4F0\uB808\uAE30 \uAD50\uCCB4", "check")]),
        ]),
        phase("preclose", [
          cat("\uB77C\uC2A4\uD2B8 \uCCB4\uD06C", [item("\uB0A8\uC740 \uC7AC\uB8CC \uD30C\uC545 \uBA54\uBAA8", "text"), item("\uD3D0\uAE30 / \uBCF4\uAD00 \uAE30\uC900 \uD655\uC778", "check")]),
        ]),
        phase("postclose", [
          cat("\uCCAD\uC18C", [item("\uC791\uC5C5\uB300 / \uC7A5\uBE44 \uC678\uBD80 \uC138\uCC99", "check"), item("\uBC14\uB2E5 \uCCAD\uC18C", "check"), item("\uB9C8\uAC10 \uCCAD\uC18C \uC2DC\uAC04 \uAE30\uB85D", "timer")]),
          cat("\uC815\uB9AC", [item("\uB2E4\uC74C\uB0A0 \uC900\uBE44 \uBA54\uBAA8", "text")]),
        ]),
      ],
    },
    counter: {
      role: "counter",
      updatedAt: now(),
      phases: [
        phase("arrival", [cat("\uC624\uD508 \uCCB4\uD06C", [item("POS \uC0C1\uD0DC \uD655\uC778", "check"), item("\uAC70\uC2A4\uB984\uB3C8 \uC900\uBE44 \uD655\uC778", "check"), item("\uD3EC\uC7A5\uC7AC \uC218\uB7C9 \uD655\uC778", "number")])]),
        phase("mid", [cat("\uD640 \uAD00\uB9AC", [item("\uD14C\uC774\uBE14 \uC815\uB3C8 \uBC0F \uCCAD\uACB0 \uD655\uC778", "check"), item("\uC4F0\uB808\uAE30\uD1B5 \uC0C1\uD0DC \uD655\uC778", "check")])]),
        phase("preclose", [cat("\uC815\uC0B0 \uC900\uBE44", [item("\uC7AC\uACE0 \uC774\uC0C1 \uC5EC\uBD80 \uBA54\uBAA8", "text"), item("\uC815\uC0B0 \uC900\uBE44 \uC0C1\uD0DC \uD655\uC778", "check")])]),
        phase("postclose", [cat("\uB9C8\uAC10", [item("\uC815\uC0B0 \uC644\uB8CC", "check"), item("\uC7A0\uAE08 / \uC804\uC6D0 \uD655\uC778", "check"), item("\uB9C8\uAC10 \uC18C\uC694 \uC2DC\uAC04 \uAE30\uB85D", "timer")])]),
      ],
    },
  };
}

function snapItem(t) {
  return { id: id(), templateItemId: t.id, title: t.title, type: t.type, checked: false, numberValue: "", textValue: "", timerValue: { elapsedSeconds: 0, startedAt: null }, updatedAt: null };
}

function snapRole(t) {
  return { role: t.role, phases: t.phases.map((p) => ({ key: p.key, title: p.title, description: p.description, categories: p.categories.map((c) => ({ id: id(), templateCategoryId: c.id, title: c.title, items: c.items.map(snapItem) })) })) };
}

function makeSession(all) {
  return { id: id(), businessDate: day(), startedAt: now(), endedAt: null, roleSessions: { back: snapRole(all.back), counter: snapRole(all.counter) } };
}

function init() {
  const all = templates();
  const session = makeSession(all);
  return { templates: all, sessions: [session], activeSessionId: session.id };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : init();
  } catch {
    return init();
  }
}

let S = load();

const save = () => localStorage.setItem(KEY, JSON.stringify(S));
const active = () => S.sessions.find((s) => s.id === S.activeSessionId) ?? S.sessions[0];
const roleSession = () => active().roleSessions[V.role];
const roleTemplate = () => S.templates[V.role];
const touchTemplate = () => {
  roleTemplate().updatedAt = now();
};
const seconds = (entry) => entry.timerValue.startedAt ? entry.timerValue.elapsedSeconds + Math.max(0, Math.floor((Date.now() - new Date(entry.timerValue.startedAt).getTime()) / 1000)) : entry.timerValue.elapsedSeconds;
const complete = (entry) => entry.type === "check" ? entry.checked : entry.type === "number" ? entry.numberValue.trim() !== "" : entry.type === "text" ? entry.textValue.trim() !== "" : seconds(entry) > 0;
const fmtDate = (value) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(new Date(`${value}T00:00:00`));
const fmtTime = (value) => value ? new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(value)) : T.none;
const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

function calc(sessionLike) {
  const items = sessionLike.phases.flatMap((p) => p.categories.flatMap((c) => c.items));
  return items.reduce((a, x) => ({ completed: a.completed + (complete(x) ? 1 : 0), total: a.total + 1 }), { completed: 0, total: 0 });
}

function syncStaticCopy() {
  U.edit.textContent = V.edit ? T.quickEditDone : T.quickEdit;
  U.session.textContent = T.quickSession;
  U.settings.textContent = T.quickSettings;
  U.fab.textContent = T.manage;
  U.close.textContent = T.close;
  U.heading.textContent = "\uC124\uC815 \uBC0F \uAD00\uB9AC";
  U.note.textContent = T.tip;
}

function tickClock() {
  const current = new Date();
  U.date.textContent = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(current);
  U.clock.textContent = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(current);
}

function renderSummary(roleProgress, globalProgress) {
  U.mode.textContent = V.edit ? T.template : V.prompt ? T.install : T.active;
  U.progress.style.width = `${pct(globalProgress.completed, globalProgress.total)}%`;
  U.summary.innerHTML = `
    <div>
      <span class="eyebrow">Current View</span>
      <h2>${T.roles[V.role][0]} ${T.summary}</h2>
      <p>${fmtDate(active().businessDate)}</p>
    </div>
    <div class="summary-score">
      <strong>${pct(roleProgress.completed, roleProgress.total)}%</strong>
      <span>${roleProgress.completed}/${roleProgress.total}</span>
    </div>
  `;
}

function renderRoles() {
  U.roles.innerHTML = Object.entries(T.roles).map(([key, meta]) => `
    <button type="button" class="role-pill ${V.role === key ? "active" : ""}" data-action="switch-role" data-role="${key}">
      <span>${meta[0]}</span>
      <small>${meta[1]}</small>
    </button>
  `).join("");
}

function renderMeta(globalProgress) {
  U.meta.innerHTML = `
    <div class="meta-box">
      <span class="eyebrow">Global</span>
      <strong>${globalProgress.completed}/${globalProgress.total}</strong>
    </div>
    <div class="meta-box">
      <span class="eyebrow">Status</span>
      <strong>${V.status}</strong>
    </div>
  `;
}

function renderViewItem(phaseKey, categoryId, entry) {
  const stamp = fmtTime(entry.updatedAt);
  const done = complete(entry) ? "done" : "";
  if (entry.type === "check") {
    return `<label class="task-row ${done}"><input type="checkbox" data-action="toggle-check" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}" ${entry.checked ? "checked" : ""}><div class="task-copy"><strong>${entry.title}</strong><span>${stamp}</span></div></label>`;
  }
  if (entry.type === "number") {
    return `<div class="task-row field-row ${done}"><div class="task-copy"><strong>${entry.title}</strong><span>${stamp}</span></div><input type="number" inputmode="decimal" data-action="input-number" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}" value="${esc(entry.numberValue)}" placeholder="\uC22B\uC790\uB97C \uC785\uB825\uD558\uC138\uC694"></div>`;
  }
  if (entry.type === "text") {
    return `<div class="task-row field-row ${done}"><div class="task-copy"><strong>${entry.title}</strong><span>${stamp}</span></div><textarea data-action="input-text" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}" placeholder="\uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694">${esc(entry.textValue)}</textarea></div>`;
  }
  const total = seconds(entry);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `<div class="task-row timer-row ${done}"><div class="task-copy"><strong>${entry.title}</strong><span>${stamp}</span></div><div class="timer-block"><strong class="timer-value">${mm}:${ss}</strong><div class="action-row"><button type="button" class="button-primary" data-action="${entry.timerValue.startedAt ? "stop-timer" : "start-timer"}" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}">${entry.timerValue.startedAt ? "\uC815\uC9C0" : "\uC2DC\uC791"}</button><button type="button" class="button-secondary" data-action="reset-timer" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}">\uCD08\uAE30\uD654</button></div></div></div>`;
}

function renderEditItem(phaseKey, categoryId, entry, index, total) {
  const options = Object.entries(T.type).map(([value, label]) => `<option value="${value}" ${entry.type === value ? "selected" : ""}>${label}</option>`).join("");
  return `<div class="editor-item"><div class="editor-item-header"><input data-action="rename-item" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}" value="${esc(entry.title)}"><p class="editor-note">${T.tip}</p></div><div class="editor-actions"><select data-action="change-item-type" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}">${options}</select><button type="button" class="button-secondary" data-action="move-item-up" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}" ${index === 0 ? "disabled" : ""}>\uC704\uB85C</button><button type="button" class="button-secondary" data-action="move-item-down" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}" ${index === total - 1 ? "disabled" : ""}>\uC544\uB798\uB85C</button><button type="button" class="button-danger" data-action="delete-item" data-phase="${phaseKey}" data-category="${categoryId}" data-item="${entry.id}">\uC0AD\uC81C</button></div></div>`;
}

function renderPhase(phaseEntry) {
  const collapsed = !!V.collapsed[V.role][phaseEntry.key];
  if (V.edit) {
    return `<section class="phase-panel"><button type="button" class="phase-head" data-action="toggle-phase" data-phase="${phaseEntry.key}"><div><span class="phase-label">${phaseEntry.description}</span><h3>${phaseEntry.title}</h3></div><span class="phase-toggle">${collapsed ? "+" : "\u2212"}</span></button>${collapsed ? "" : `<div class="phase-content"><div class="editor-toolbar"><button type="button" class="button-primary" data-action="add-category" data-phase="${phaseEntry.key}">${T.addCategory}</button></div><div class="card-stack">${phaseEntry.categories.map((c, i) => `<article class="category-card editor"><div class="editor-stack"><input data-action="rename-category" data-phase="${phaseEntry.key}" data-category="${c.id}" value="${esc(c.title)}"><div class="action-row"><button type="button" class="button-secondary" data-action="move-category-up" data-phase="${phaseEntry.key}" data-category="${c.id}" ${i === 0 ? "disabled" : ""}>\uC704\uB85C</button><button type="button" class="button-secondary" data-action="move-category-down" data-phase="${phaseEntry.key}" data-category="${c.id}" ${i === phaseEntry.categories.length - 1 ? "disabled" : ""}>\uC544\uB798\uB85C</button><button type="button" class="button-danger" data-action="delete-category" data-phase="${phaseEntry.key}" data-category="${c.id}">\uC0AD\uC81C</button></div><div class="item-stack">${c.items.map((x, n) => renderEditItem(phaseEntry.key, c.id, x, n, c.items.length)).join("")}</div><button type="button" class="button-primary" data-action="add-item" data-phase="${phaseEntry.key}" data-category="${c.id}">${T.addItem}</button></div></article>`).join("")}</div></div>`}</section>`;
  }
  const prog = calc({ phases: [phaseEntry] });
  return `<section class="phase-panel"><button type="button" class="phase-head" data-action="toggle-phase" data-phase="${phaseEntry.key}"><div><span class="phase-label">${phaseEntry.description}</span><h3>${phaseEntry.title}</h3></div><div class="phase-meta"><span>${prog.completed}/${prog.total}</span><span class="phase-toggle">${collapsed ? "+" : "\u2212"}</span></div></button>${collapsed ? "" : `<div class="phase-content"><div class="card-stack">${phaseEntry.categories.map((c) => { const p = c.items.reduce((a, x) => ({ completed: a.completed + (complete(x) ? 1 : 0), total: a.total + 1 }), { completed: 0, total: 0 }); return `<article class="category-card"><div class="category-bar"><div><h4>${c.title}</h4><p>${p.completed}/${p.total} ${T.done}</p></div><span class="count-badge">${c.items.length}</span></div><div class="item-stack">${c.items.map((x) => renderViewItem(phaseEntry.key, c.id, x)).join("")}</div></article>`; }).join("")}</div></div>`}</section>`;
}

function renderSheet() {
  U.overlay.classList.toggle("open", V.sheet);
  U.sheet.classList.toggle("open", V.sheet);
  U.startBtn.innerHTML = `<div><strong>\uC0C8 \uC138\uC158 \uC2DC\uC791</strong><span>\uD604\uC7AC \uD15C\uD50C\uB9BF \uAE30\uC900\uC73C\uB85C \uC624\uB298 \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB97C \uC0C8\uB85C \uB9CC\uB4ED\uB2C8\uB2E4.</span></div>`;
  U.editBtn.innerHTML = `<div><strong>${V.edit ? "\uCCB4\uD06C \uBAA8\uB4DC\uB85C \uC804\uD658" : "\uD15C\uD50C\uB9BF \uD3B8\uC9D1 \uC5F4\uAE30"}</strong><span>\uCE74\uD14C\uACE0\uB9AC\uC640 \uC138\uBD80 \uD56D\uBAA9\uC744 \uC218\uC815\uD569\uB2C8\uB2E4.</span></div>`;
  U.installBtn.disabled = !V.prompt;
  U.installBtn.innerHTML = `<div><strong>${V.prompt ? "PWA \uC124\uCE58 \uAC00\uB2A5" : "PWA \uC124\uCE58 \uB300\uAE30 \uC911"}</strong><span>${V.prompt ? "\uD648 \uD654\uBA74\uC5D0 \uCD94\uAC00\uD560 \uC900\uBE44\uAC00 \uB410\uC2B5\uB2C8\uB2E4." : "\uBE0C\uB77C\uC6B0\uC800 \uBA54\uB274\uC758 \uD648 \uD654\uBA74 \uCD94\uAC00\uB3C4 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."}</span></div>`;
  U.exportBtn.innerHTML = `<div><strong>JSON \uBC31\uC5C5 \uC800\uC7A5</strong><span>\uD604\uC7AC \uD15C\uD50C\uB9BF\uACFC \uC138\uC158 \uAE30\uB85D\uC744 \uD30C\uC77C\uB85C \uB0B4\uBCF4\uB0C5\uB2C8\uB2E4.</span></div>`;
  U.importBtn.innerHTML = `<div><strong>JSON \uBC31\uC5C5 \uBD88\uB7EC\uC624\uAE30</strong><span>\uC800\uC7A5\uD55C \uD30C\uC77C\uB85C \uB85C\uCEEC \uB370\uC774\uD130\uB97C \uBCF5\uAD6C\uD569\uB2C8\uB2E4.</span></div>`;
}

function render() {
  const roleProgress = calc(roleSession());
  const globalProgress = Object.keys(T.roles).reduce((a, key) => {
    const p = calc(active().roleSessions[key]);
    return { completed: a.completed + p.completed, total: a.total + p.total };
  }, { completed: 0, total: 0 });
  syncStaticCopy();
  renderSummary(roleProgress, globalProgress);
  renderRoles();
  renderMeta(globalProgress);
  renderSheet();
  U.stack.innerHTML = (V.edit ? roleTemplate().phases : roleSession().phases).map(renderPhase).join("");
  save();
}

const findPhase = (phaseKey, template = V.edit) => (template ? roleTemplate() : roleSession()).phases.find((p) => p.key === phaseKey);
const findCategory = (phaseKey, categoryId, template = V.edit) => findPhase(phaseKey, template)?.categories.find((c) => c.id === categoryId);
const findItem = (phaseKey, categoryId, itemId, template = V.edit) => findCategory(phaseKey, categoryId, template)?.items.find((x) => x.id === itemId);

function move(list, targetId, dir) {
  const index = list.findIndex((entry) => entry.id === targetId);
  if (index < 0 || index + dir < 0 || index + dir >= list.length) {
    return list;
  }
  const copy = [...list];
  const [picked] = copy.splice(index, 1);
  copy.splice(index + dir, 0, picked);
  return copy;
}

function startSession() {
  const session = makeSession(S.templates);
  S.sessions.push(session);
  S.activeSessionId = session.id;
  V.edit = false;
  V.sheet = false;
  V.status = T.sessionDone;
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `kfc-checklist-${day()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  V.sheet = false;
  V.status = T.exportDone;
  render();
}

async function installPwa() {
  if (!V.prompt) {
    V.status = T.installHelp;
    render();
    return;
  }
  V.prompt.prompt();
  const result = await V.prompt.userChoice;
  V.status = result.outcome === "accepted" ? T.installDone : T.installCancel;
  V.prompt = null;
  V.sheet = false;
  render();
}

function registerPwa() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(SW).catch(() => {
      V.status = T.offline;
      render();
    });
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    V.prompt = event;
    V.status = T.installReady;
    render();
  });
  window.addEventListener("appinstalled", () => {
    V.prompt = null;
    V.status = T.installDone;
    render();
  });
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], #toggle-edit, #start-session, #open-settings, #floating-button, #close-settings, #sheet-start-session, #sheet-toggle-edit, #sheet-install, #sheet-export, #sheet-import");
  if (!target) {
    if (event.target === U.overlay) {
      V.sheet = false;
      render();
    }
    return;
  }

  const action = target.dataset.action || target.id;
  const phaseKey = target.dataset.phase;
  const categoryId = target.dataset.category;
  const itemId = target.dataset.item;

  if (action === "toggle-edit" || action === "sheet-toggle-edit") {
    V.edit = !V.edit;
    V.sheet = false;
    V.status = V.edit ? T.editMode : T.checkMode;
    render();
    return;
  }
  if (action === "start-session" || action === "sheet-start-session") {
    startSession();
    return;
  }
  if (action === "open-settings" || action === "floating-button") {
    V.sheet = true;
    render();
    return;
  }
  if (action === "close-settings") {
    V.sheet = false;
    render();
    return;
  }
  if (action === "sheet-install") {
    installPwa();
    return;
  }
  if (action === "sheet-export") {
    exportJson();
    return;
  }
  if (action === "sheet-import") {
    U.file.click();
    return;
  }
  if (action === "switch-role") {
    V.role = target.dataset.role;
    render();
    return;
  }
  if (action === "toggle-phase") {
    V.collapsed[V.role][phaseKey] = !V.collapsed[V.role][phaseKey];
    render();
    return;
  }

  if (V.edit) {
    const phaseEntry = findPhase(phaseKey, true);
    const categoryEntry = findCategory(phaseKey, categoryId, true);
    if (action === "add-category" && phaseEntry) {
      phaseEntry.categories.push(cat(T.newCategory, [item(T.newItem, "check")]));
      touchTemplate();
      V.status = T.addCategory;
      render();
      return;
    }
    if (!categoryEntry) {
      return;
    }
    if (action === "delete-category") {
      phaseEntry.categories = phaseEntry.categories.filter((entry) => entry.id !== categoryId);
      touchTemplate();
      V.status = T.delCategory;
      render();
      return;
    }
    if (action === "move-category-up") {
      phaseEntry.categories = move(phaseEntry.categories, categoryId, -1);
      touchTemplate();
      render();
      return;
    }
    if (action === "move-category-down") {
      phaseEntry.categories = move(phaseEntry.categories, categoryId, 1);
      touchTemplate();
      render();
      return;
    }
    if (action === "add-item") {
      categoryEntry.items.push(item(T.newItem, "check"));
      touchTemplate();
      V.status = T.addItem;
      render();
      return;
    }
    if (action === "delete-item") {
      categoryEntry.items = categoryEntry.items.filter((entry) => entry.id !== itemId);
      touchTemplate();
      V.status = T.delItem;
      render();
      return;
    }
    if (action === "move-item-up") {
      categoryEntry.items = move(categoryEntry.items, itemId, -1);
      touchTemplate();
      render();
      return;
    }
    if (action === "move-item-down") {
      categoryEntry.items = move(categoryEntry.items, itemId, 1);
      touchTemplate();
      render();
      return;
    }
    return;
  }

  const entry = findItem(phaseKey, categoryId, itemId, false);
  if (!entry) {
    return;
  }
  if (action === "start-timer") {
    entry.timerValue.startedAt = now();
    entry.updatedAt = now();
    render();
    return;
  }
  if (action === "stop-timer") {
    entry.timerValue.elapsedSeconds = seconds(entry);
    entry.timerValue.startedAt = null;
    entry.updatedAt = now();
    render();
    return;
  }
  if (action === "reset-timer") {
    entry.timerValue = { elapsedSeconds: 0, startedAt: null };
    entry.updatedAt = now();
    render();
  }
});

document.addEventListener("input", (event) => {
  const target = event.target;
  const action = target.dataset.action;
  if (!action) {
    return;
  }
  const phaseKey = target.dataset.phase;
  const categoryId = target.dataset.category;
  const itemId = target.dataset.item;

  if (V.edit) {
    const categoryEntry = findCategory(phaseKey, categoryId, true);
    const templateItem = findItem(phaseKey, categoryId, itemId, true);
    if (action === "rename-category" && categoryEntry) {
      categoryEntry.title = target.value;
      touchTemplate();
      save();
    }
    if (action === "rename-item" && templateItem) {
      templateItem.title = target.value;
      touchTemplate();
      save();
    }
    if (action === "change-item-type" && templateItem) {
      templateItem.type = target.value;
      touchTemplate();
      save();
    }
    return;
  }

  const entry = findItem(phaseKey, categoryId, itemId, false);
  if (!entry) {
    return;
  }
  if (action === "toggle-check") {
    entry.checked = target.checked;
    entry.updatedAt = now();
    render();
    return;
  }
  if (action === "input-number") {
    entry.numberValue = target.value;
    entry.updatedAt = now();
    save();
    return;
  }
  if (action === "input-text") {
    entry.textValue = target.value;
    entry.updatedAt = now();
    save();
  }
});

U.file.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  try {
    S = JSON.parse(await file.text());
    V.edit = false;
    V.sheet = false;
    V.status = T.importDone;
  } catch {
    V.status = T.importFail;
  }
  event.target.value = "";
  render();
});

window.addEventListener("online", () => {
  V.status = T.online;
  render();
});

window.addEventListener("offline", () => {
  V.status = T.offline;
  render();
});

registerPwa();
tickClock();
render();
setInterval(() => {
  tickClock();
  if (!V.edit) {
    render();
  }
}, 1000);
