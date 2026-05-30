// ============================================================
// AP3X INTELLIGENT AI — STORAGE ENGINE
// Single Source of Truth
// ============================================================

const STORAGE_KEY = 'AP3X_KNOWLEDGE_DB';

const DEFAULT_DB = {
  domains: {
    ap3x:      { projects: [] },
    fleet:     { notes: [], entities: [] },
    education: { notes: [], entities: [] },
    health:    { notes: [], entities: [] },
    general:   { notes: [], entities: [] }
  },
  knowledgeGraph: {
    nodes: [],
    edges: []
  },
  systemContext: {
    productName:       'AP3X Intelligent AI',
    creator:           'Kyzel Kreates',
    baseArchitecture:  'AP3X Base Structure',
    version:           '1.0',
    mode:              'Local Intelligence OS'
  },
  meta: {
    totalIngestions: 0,
    lastActivity:    null,
    indexedEntities: 0
  }
};

function getDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DB));
    const parsed = JSON.parse(raw);
    // Deep merge to ensure all keys exist
    return deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), parsed);
  } catch (e) {
    console.error('[STORAGE] Read error:', e);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDB(db) {
  try {
    db.meta.lastActivity = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return true;
  } catch (e) {
    console.error('[STORAGE] Write error:', e);
    return false;
  }
}

function resetDB() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.error('[STORAGE] Reset error:', e);
    return false;
  }
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

window.AP3X_Storage = { getDB, saveDB, resetDB };
