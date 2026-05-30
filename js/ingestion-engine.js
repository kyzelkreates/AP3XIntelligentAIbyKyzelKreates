// ============================================================
// AP3X INTELLIGENT AI — INGESTION ENGINE
// Converts raw unstructured text → structured intelligence
// ============================================================

const IngestionEngine = (() => {

  // ── Domain classification keywords ──────────────────────
  const DOMAIN_SIGNALS = {
    ap3x:      ['ap3x','apex','os','platform','system','engine','module','architecture','api','sdk','core','base'],
    fleet:     ['fleet','vehicle','driver','route','logistics','transport','delivery','tracking','gps','fuel'],
    education: ['education','learn','course','student','curriculum','school','teach','train','knowledge','skill','study'],
    health:    ['health','medical','fitness','wellness','diet','exercise','mental','therapy','nutrition','clinical'],
    general:   []
  };

  // ── Entity patterns ──────────────────────────────────────
  const ENTITY_PATTERNS = [
    { pattern: /\b([A-Z][A-Za-z0-9\s]{2,30}(?:OS|AI|Engine|System|Module|Platform|Hub|Core|Base|Pro|App))\b/g, type: 'system' },
    { pattern: /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g, type: 'concept' },
    { pattern: /\b(manages?|handles?|processes?|monitors?|tracks?|analyses?|analyzes?|coordinates?|integrates?)\s+([a-zA-Z\s,]+)/gi, type: 'function' },
    { pattern: /\b(\d+(?:\.\d+)?%|\$[\d,]+|[\d,]+\s+(?:users?|drivers?|vehicles?|records?))\b/gi, type: 'metric' }
  ];

  // ── Stop words for tag extraction ────────────────────────
  const STOP_WORDS = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'by','from','is','are','was','were','be','been','has','have','had',
    'do','does','did','will','would','could','should','may','might','can',
    'this','that','these','those','it','its','as','into','through','about',
    'between','then','than','so','if','when','where','how','what','which','who'
  ]);

  // ── Classify domain ──────────────────────────────────────
  function classifyDomain(text) {
    const lower = text.toLowerCase();
    const scores = {};
    for (const [domain, keywords] of Object.entries(DOMAIN_SIGNALS)) {
      if (domain === 'general') continue;
      scores[domain] = keywords.reduce((acc, kw) => {
        const regex = new RegExp(`\\b${kw}\\b`, 'gi');
        const matches = lower.match(regex);
        return acc + (matches ? matches.length : 0);
      }, 0);
    }
    const best = Object.entries(scores).sort((a,b) => b[1]-a[1]);
    return (best[0][1] > 0) ? best[0][0] : 'general';
  }

  // ── Classify type ────────────────────────────────────────
  function classifyType(text) {
    const lower = text.toLowerCase();
    if (/\b(is|are|was|were|means?|refers?|defines?|describes?)\b/.test(lower)) return 'definition';
    if (/\b(manages?|handles?|processes?|monitors?|tracks?|coordinates?)\b/.test(lower)) return 'functional';
    if (/\b(architecture|structure|built|designed|comprised|consists?)\b/.test(lower)) return 'architectural';
    if (/\b(revenue|profit|scale|market|growth|users?|customers?)\b/.test(lower)) return 'business';
    if (/\b(api|sdk|data|flow|pipeline|endpoint|module|class|function)\b/.test(lower)) return 'technical';
    return 'informational';
  }

  // ── Extract entities ─────────────────────────────────────
  function extractEntities(text) {
    const entities = [];
    const seen = new Set();

    for (const { pattern, type } of ENTITY_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = (match[2] || match[1]).trim();
        if (value.length > 2 && value.length < 60 && !seen.has(value.toLowerCase())) {
          seen.add(value.toLowerCase());
          entities.push({ value, type, confidence: type === 'system' ? 0.9 : 0.7 });
        }
      }
    }

    // Fallback: capitalised words as potential named concepts
    const caps = text.match(/\b[A-Z][A-Za-z]{2,20}\b/g) || [];
    for (const w of caps) {
      if (!seen.has(w.toLowerCase()) && !STOP_WORDS.has(w.toLowerCase())) {
        seen.add(w.toLowerCase());
        entities.push({ value: w, type: 'named_concept', confidence: 0.5 });
      }
    }

    return entities;
  }

  // ── Extract tags ─────────────────────────────────────────
  function extractTags(text) {
    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w));

    const freq = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;

    return Object.entries(freq)
      .sort((a,b) => b[1]-a[1])
      .slice(0, 12)
      .map(([tag]) => tag);
  }

  // ── Parse input ──────────────────────────────────────────
  function parseInput(text) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    return {
      raw:           text.trim(),
      wordCount:     text.split(/\s+/).length,
      sentenceCount: sentences.length,
      sentences:     sentences.map(s => s.trim()).filter(Boolean)
    };
  }

  // ── Generate summary ─────────────────────────────────────
  function generateSummary(text, entities) {
    const first = text.split(/[.!?]/)[0].trim();
    const entityNames = entities.slice(0,3).map(e => e.value).join(', ');
    if (entityNames) {
      return `${first}. Key entities: ${entityNames}.`;
    }
    return first + '.';
  }

  // ── Main ingest pipeline ─────────────────────────────────
  function ingestRawData(inputText, forceDomain = null) {
    if (!inputText || inputText.trim().length < 3) {
      return { success: false, error: 'Input too short for processing.' };
    }

    const db = AP3X_Storage.getDB();

    const parsed   = parseInput(inputText);
    const domain   = forceDomain || classifyDomain(inputText);
    const type     = classifyType(inputText);
    const entities = extractEntities(inputText);
    const tags     = extractTags(inputText);
    const summary  = generateSummary(inputText, entities);

    const record = {
      id:            'ing_' + Date.now() + '_' + Math.random().toString(36).substr(2,6),
      raw:           parsed.raw,
      domain,
      type,
      summary,
      entities,
      tags,
      wordCount:     parsed.wordCount,
      sentenceCount: parsed.sentenceCount,
      ingestedAt:    new Date().toISOString(),
      graphUpdated:  false
    };

    // Store in correct domain
    if (domain === 'ap3x') {
      // Auto-create project from ingestion
      const project = {
        name:        entities[0]?.value || `Intelligence Record ${db.meta.totalIngestions + 1}`,
        domain,
        description: summary,
        tags,
        entities:    entities.map(e => e.value),
        architecture:inputText,
        status:      'active',
        meta:        { type, ingestedRecord: record.id }
      };
      ProjectEngine.addProject(project);
    } else {
      if (!db.domains[domain]) db.domains[domain] = { notes: [], entities: [] };
      db.domains[domain].notes.push(record);
      // Add entities
      for (const ent of entities) {
        if (!db.domains[domain].entities.find(e => e.value.toLowerCase() === ent.value.toLowerCase())) {
          db.domains[domain].entities.push(ent);
        }
      }
    }

    db.meta.totalIngestions++;
    db.meta.indexedEntities += entities.length;
    record.graphUpdated = true;

    AP3X_Storage.saveDB(db);
    RelationshipEngine.buildGraph();

    return {
      success:  true,
      record,
      domain,
      type,
      summary,
      entities,
      tags
    };
  }

  return { ingestRawData, parseInput, classifyType, extractEntities, extractTags, classifyDomain };
})();

window.IngestionEngine = IngestionEngine;
