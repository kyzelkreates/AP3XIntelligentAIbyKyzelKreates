// ============================================================
// AP3X INTELLIGENT AI — STORAGE ENGINE v2.0
// Single Source of Truth — Extended for URL Intelligence System
// ============================================================

const STORAGE_KEY = 'AP3X_KNOWLEDGE_DB';

const DEFAULT_DB = {
  // ── Existing domains ────────────────────────────────────
  domains: {
    ap3x:      { projects: [] },
    fleet:     { notes: [], entities: [] },
    education: { notes: [], entities: [] },
    health:    { notes: [], entities: [] },
    general:   { notes: [], entities: [] }
  },

  // ── URL Intelligence System ──────────────────────────────
  ingestion_jobs:    [],   // Module 1: job queue per URL
  site_snapshots:    [],   // Module 2: raw crawl output
  site_models:       [],   // Module 3: normalised structure
  project_specs:          [],   // Module 4A: product specification
  system_blueprints:      [],   // Module 4B+C: architecture + DB model
  ui_blueprints:          [],   // Module 4D+E: UI + logic flow
  investor_packs:         [],   // Module 5: full investor intelligence
  commercial_models:      [],   // Module 4D: commercial & monetisation model
  maturity_scores:        [],   // Module 4E: system maturity scores (1-10)
  replication_blueprints: [],   // Module 4F: rebuild blueprint
  // ── Cloner Module (Module 6) ─────────────────────────────
  clone_dom_structures:    [],  // Stage 1: DOM extraction
  clone_structural_models: [],  // Stage 2: structural interpretation
  clone_system_designs:    [],  // Stage 3: system design
  clone_prompts:           [],  // Stage 4: AI clone build prompt
  clone_pwa_scaffolds:     [],  // Stage 5: deployable PWA files

  // ── SecureScan AI Module ────────────────────────────────────
  securescan_reports: [],   // Full scan reports (max 50)
  securescan_history: [],   // Lightweight history entries (max 200)

  // ── Existing knowledge graph ─────────────────────────────
  knowledgeGraph: {
    nodes: [],
    edges: []
  },

  systemContext: {
    productName:      'AP3X Intelligent AI',
    creator:          'Kyzel Kreates',
    baseArchitecture: 'AP3X Base Structure',
    version:          '2.0',
    mode:             'Local Intelligence OS + URL Analysis Engine'
  },

  meta: {
    totalIngestions:    0,
    totalSecureScans:   0,
    totalUrlJobs:       0,
    lastActivity:       null,
    indexedEntities:    0
  }
};

// ── Core accessors ───────────────────────────────────────────
function getDB() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DB));
    return deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), JSON.parse(raw));
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
  try { localStorage.removeItem(STORAGE_KEY); return true; }
  catch (e) { return false; }
}

// ── URL Intelligence SSOT helpers ───────────────────────────

function getJob(jobId) {
  const db = getDB();
  return db.ingestion_jobs.find(j => j.id === jobId) || null;
}

function saveJob(job) {
  const db = getDB();
  const idx = db.ingestion_jobs.findIndex(j => j.id === job.id);
  if (idx >= 0) db.ingestion_jobs[idx] = job;
  else          db.ingestion_jobs.push(job);
  saveDB(db);
}

function getAllJobs() {
  return getDB().ingestion_jobs;
}

function saveRecord(collection, record) {
  const db = getDB();
  if (!Array.isArray(db[collection])) db[collection] = [];
  const idx = db[collection].findIndex(r => r.jobId === record.jobId);
  if (idx >= 0) db[collection][idx] = record;
  else          db[collection].push(record);
  saveDB(db);
}

function getRecord(collection, jobId) {
  const db = getDB();
  return (db[collection] || []).find(r => r.jobId === jobId) || null;
}

// ── Deep merge ────────────────────────────────────────────────
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

window.AP3X_Storage = {
  getDB, saveDB, resetDB,
  getJob, saveJob, getAllJobs,
  saveRecord, getRecord
};
