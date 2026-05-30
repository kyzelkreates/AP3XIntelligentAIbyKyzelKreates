// ============================================================
// AP3X INTELLIGENT AI — KNOWLEDGE ENGINE
// ============================================================

const KnowledgeEngine = (() => {

  function queryKnowledge(domain, query) {
    const db = AP3X_Storage.getDB();
    const results = [];
    const q = query.toLowerCase();

    if (domain === 'ap3x' || domain === 'all') {
      for (const proj of db.domains.ap3x.projects) {
        const score = _scoreMatch(proj, q);
        if (score > 0) results.push({ ...proj, _score: score, _source: 'project' });
      }
    }

    const domains = domain === 'all'
      ? ['fleet','education','health','general']
      : (domain !== 'ap3x' ? [domain] : []);

    for (const d of domains) {
      if (!db.domains[d]) continue;
      for (const note of (db.domains[d].notes || [])) {
        const score = _scoreMatch(note, q);
        if (score > 0) results.push({ ...note, _score: score, _source: d });
      }
    }

    return results.sort((a,b) => b._score - a._score).slice(0, 20);
  }

  function _scoreMatch(item, q) {
    let score = 0;
    const fields = [item.name, item.description, item.summary, item.raw, item.architecture];
    for (const f of fields) {
      if (!f) continue;
      const lower = f.toLowerCase();
      if (lower.includes(q)) score += 2;
    }
    for (const tag of (item.tags || [])) {
      if (tag.includes(q)) score++;
    }
    for (const ent of (item.entities || [])) {
      const v = typeof ent === 'string' ? ent : ent.value;
      if (v.toLowerCase().includes(q)) score += 1.5;
    }
    return score;
  }

  function systemOverview() {
    const db = AP3X_Storage.getDB();
    const projects = db.domains.ap3x.projects;
    const graph    = db.knowledgeGraph;

    const domainSummary = {};
    for (const [key, val] of Object.entries(db.domains)) {
      if (key === 'ap3x') {
        domainSummary[key] = { count: val.projects?.length || 0, type: 'projects' };
      } else {
        domainSummary[key] = {
          notes:    val.notes?.length    || 0,
          entities: val.entities?.length || 0
        };
      }
    }

    return {
      systemContext:    db.systemContext,
      totalProjects:    projects.length,
      totalNodes:       graph.nodes.length,
      totalEdges:       graph.edges.length,
      totalIngestions:  db.meta.totalIngestions,
      indexedEntities:  db.meta.indexedEntities,
      lastActivity:     db.meta.lastActivity,
      domainSummary,
      statusHealth:     _computeHealth(db)
    };
  }

  function _computeHealth(db) {
    const p = db.domains.ap3x.projects.length;
    const n = db.knowledgeGraph.nodes.length;
    if (p === 0 && n === 0) return { status: 'INITIALISING', score: 0, label: 'No data indexed' };
    if (p < 3)  return { status: 'BUILDING',      score: 30, label: 'Knowledge base populating' };
    if (p < 10) return { status: 'ACTIVE',         score: 70, label: 'Intelligence engine active' };
    return           { status: 'OPTIMAL',          score: 100, label: 'Full operational capacity' };
  }

  function searchIndex(query) {
    return queryKnowledge('all', query);
  }

  function getProjectById(id) {
    return ProjectEngine.getProject(id);
  }

  function getAllProjects() {
    return ProjectEngine.getAllProjects();
  }

  function getDomainData(domain) {
    const db = AP3X_Storage.getDB();
    if (domain === 'ap3x') return db.domains.ap3x;
    return db.domains[domain] || { notes: [], entities: [] };
  }

  return { queryKnowledge, systemOverview, searchIndex, getAllProjects, getProjectById, getDomainData };
})();

window.KnowledgeEngine = KnowledgeEngine;
