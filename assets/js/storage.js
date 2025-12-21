import { APP_VERSION, STORAGE_KEY, LEGACY_STORAGE_KEY, DEFAULT_CARRY, createDefaultState } from "./data.js";

function createId(prefix = "id"){
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function safeParse(raw){
  try{
    return raw ? JSON.parse(raw) : null;
  }catch(_){
    return null;
  }
}

function normalizeTask(task){
  const safe = task && typeof task === "object" ? task : {};
  return {
    id: safe.id || createId("task"),
    text: String(safe.text || "항목").trim() || "항목",
    done: !!safe.done
  };
}

function normalizeCategories(categories, fallbackCategories = []){
  if(!Array.isArray(categories)) return [];
  const fallbackMap = new Map(
    Array.isArray(fallbackCategories)
      ? fallbackCategories.map((cat) => [cat?.id, cat])
      : []
  );
  return categories.map((cat, index) => {
    const safe = cat && typeof cat === "object" ? cat : {};
    const fallback = fallbackMap.get(safe.id) || fallbackCategories[index];
    return {
      id: safe.id || createId("cat"),
      name: String(safe.name || "카테고리").trim() || "카테고리",
      mode: safe.mode || fallback?.mode || "default",
      tasks: Array.isArray(safe.tasks) ? safe.tasks.map(normalizeTask) : []
    };
  });
}

function normalizePosition(pos, fallback){
  const safe = pos && typeof pos === "object" ? pos : {};
  const name = String(safe.name || fallback?.name || "포지션").trim() || "포지션";
  const categories = normalizeCategories(safe.categories || fallback?.categories || [], fallback?.categories || []);
  return {
    id: safe.id || fallback?.id || createId("pos"),
    name,
    categories
  };
}

function mergeDefaultTasks(targetCat, defaultCat){
  if(!targetCat || !Array.isArray(defaultCat?.tasks)) return;
  if(!Array.isArray(targetCat.tasks)) targetCat.tasks = [];
  const existing = new Set(targetCat.tasks.map((task) => task.id));
  defaultCat.tasks.forEach((task) => {
    if(!existing.has(task.id)){
      targetCat.tasks.push(normalizeTask(task));
    }
  });
}

function mergeDefaultCategories(positions, defaults){
  Object.keys(defaults.positions).forEach((key) => {
    const defPos = defaults.positions[key];
    const pos = positions[key];
    if(!pos || !Array.isArray(defPos.categories)) return;
    const existingById = new Map(pos.categories.map((cat) => [cat.id, cat]));
    const defaultIds = new Set();
    const merged = [];

    defPos.categories.forEach((defCat) => {
      defaultIds.add(defCat.id);
      const existing = existingById.get(defCat.id);
      if(existing){
        if(!existing.mode && defCat.mode) existing.mode = defCat.mode;
        mergeDefaultTasks(existing, defCat);
        merged.push(existing);
      }else{
        merged.push({
          id: defCat.id || createId("cat"),
          name: String(defCat.name || "카테고리").trim() || "카테고리",
          mode: defCat.mode || "default",
          tasks: Array.isArray(defCat.tasks) ? defCat.tasks.map(normalizeTask) : []
        });
      }
    });

    pos.categories.forEach((cat) => {
      if(!defaultIds.has(cat.id)){
        merged.push(cat);
      }
    });

    pos.categories = merged;
  });
}

function mergeTasksPreserve(targetCat, sourceCat){
  if(!targetCat || !sourceCat) return;
  if(!Array.isArray(targetCat.tasks)) targetCat.tasks = [];
  const existing = new Map(targetCat.tasks.map((task) => [task.id, task]));
  sourceCat.tasks.forEach((task) => {
    const safe = normalizeTask(task);
    const found = existing.get(safe.id);
    if(found){
      found.done = safe.done;
      found.text = safe.text;
    }else{
      targetCat.tasks.push(safe);
    }
  });
}

function migrateKitchenTasksToBack(positions){
  const kitchen = positions.kitchen;
  const back = positions.back;
  if(!kitchen || !back) return;
  const mapping = {
    "kitchen-start": "back-start",
    "kitchen-mid": "back-mid",
    "kitchen-late": "back-late"
  };
  const moved = [];
  kitchen.categories = Array.isArray(kitchen.categories)
    ? kitchen.categories.filter((cat) => {
      const targetId = mapping[cat.id];
      if(targetId){
        moved.push({ cat, targetId });
        return false;
      }
      return true;
    })
    : [];

  moved.forEach(({ cat, targetId }) => {
    const target = Array.isArray(back.categories)
      ? back.categories.find((item) => item.id === targetId)
      : null;
    if(target){
      mergeTasksPreserve(target, cat);
    }else{
      back.categories = Array.isArray(back.categories) ? back.categories : [];
      back.categories.push({
        id: targetId,
        name: cat.name,
        mode: cat.mode || "default",
        tasks: Array.isArray(cat.tasks) ? cat.tasks.map(normalizeTask) : []
      });
    }
  });
}

function pruneEmptyPlaceholders(positions){
  const placeholders = new Set(["kitchen-default", "counter-default", "back-default"]);
  Object.values(positions).forEach((pos) => {
    if(!pos || !Array.isArray(pos.categories)) return;
    pos.categories = pos.categories.filter((cat) => {
      if(!placeholders.has(cat.id)) return true;
      return Array.isArray(cat.tasks) && cat.tasks.length > 0;
    });
  });
}

function normalizeCarry(carry){
  if(!Array.isArray(carry)) return DEFAULT_CARRY.map(item => ({ ...item }));
  return carry.map((item) => {
    const safe = item && typeof item === "object" ? item : {};
    return {
      id: safe.id || createId("carry"),
      name: String(safe.name || "항목"),
      qty: safe.qty === 0 ? "0" : (safe.qty ?? ""),
      hint: safe.hint ?? ""
    };
  });
}

function normalizeState(raw){
  const defaults = createDefaultState();
  const safe = raw && typeof raw === "object" ? raw : {};
  const positions = {};

  const rawPositions = safe.positions && typeof safe.positions === "object" ? safe.positions : {};
  Object.keys(defaults.positions).forEach((key) => {
    positions[key] = normalizePosition(rawPositions[key], defaults.positions[key]);
  });

  Object.keys(rawPositions).forEach((key) => {
    if(!positions[key]){
      positions[key] = normalizePosition(rawPositions[key], null);
    }
  });

  mergeDefaultCategories(positions, defaults);
  migrateKitchenTasksToBack(positions);
  pruneEmptyPlaceholders(positions);

  const baseOrder = Array.isArray(safe.positionOrder) && safe.positionOrder.length
    ? safe.positionOrder
    : Object.keys(defaults.positions);
  const positionOrder = [];
  const orderSet = new Set();
  baseOrder.forEach((id) => {
    if (positions[id] && !orderSet.has(id)) {
      positionOrder.push(id);
      orderSet.add(id);
    }
  });
  Object.keys(positions).forEach((id) => {
    if (!orderSet.has(id)) {
      positionOrder.push(id);
      orderSet.add(id);
    }
  });

  const collapsed = safe.ui && typeof safe.ui === "object" && safe.ui.collapsed && typeof safe.ui.collapsed === "object"
    ? safe.ui.collapsed
    : {};
  const restockFilter = safe.ui && typeof safe.ui === "object" && safe.ui.restockFilter && typeof safe.ui.restockFilter === "object"
    ? safe.ui.restockFilter
    : {};
  const focusMode = safe.ui && typeof safe.ui === "object" && safe.ui.focusMode === true;
  const carryOpen = safe.ui && typeof safe.ui === "object" && safe.ui.carryOpen === true;
  const restockOpen = safe.ui && typeof safe.ui === "object" && safe.ui.restockOpen === true;

  const prefs = safe.preferences && typeof safe.preferences === "object" ? safe.preferences : {};

  const activeTab = typeof safe.activeTab === "string" ? safe.activeTab : (prefs.defaultTab || defaults.activeTab);

  return {
    version: safe.version || APP_VERSION,
    lastPunchDate: safe.lastPunchDate || "",
    activeTab,
    positionOrder,
    positions,
    carry: normalizeCarry(safe.carry || defaults.carry),
    ui: { collapsed, restockFilter, focusMode, carryOpen, restockOpen },
    preferences: {
      showCarry: prefs.showCarry !== false,
      defaultTab: prefs.defaultTab || defaults.preferences.defaultTab
    }
  };
}

export function migrateLegacy(legacy){
  const state = createDefaultState();
  const safe = legacy && typeof legacy === "object" ? legacy : {};
  state.lastPunchDate = safe.lastPunchDate || "";

  if(Array.isArray(safe.tasks)){
    safe.tasks.forEach((task) => {
      const catName = String(task.cat || "기타").trim() || "기타";
      let category = state.positions.kitchen.categories.find(c => c.name === catName);
      if(!category){
        category = { id: createId("cat"), name: catName, tasks: [] };
        state.positions.kitchen.categories.push(category);
      }
      category.tasks.push({
        id: task.id || createId("task"),
        text: String(task.text || "항목").trim() || "항목",
        done: !!task.done
      });
    });
  }

  if(safe.carry){
    state.carry = normalizeCarry(safe.carry);
  }

  if(safe.ui && safe.ui.collapsedCats){
    Object.entries(safe.ui.collapsedCats).forEach(([catName, collapsed]) => {
      const cat = state.positions.kitchen.categories.find(c => c.name === catName);
      if(cat){
        state.ui.collapsed[cat.id] = !!collapsed;
      }
    });
  }

  return state;
}

export function loadState(){
  const raw = safeParse(localStorage.getItem(STORAGE_KEY));
  if(raw){
    return normalizeState(raw);
  }

  const legacy = safeParse(localStorage.getItem(LEGACY_STORAGE_KEY));
  if(legacy){
    const migrated = migrateLegacy(legacy);
    saveState(migrated);
    return migrated;
  }

  const fresh = createDefaultState();
  saveState(fresh);
  return fresh;
}

export function saveState(state){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){
    console.warn("[Storage.save] failed:", e);
  }
}
