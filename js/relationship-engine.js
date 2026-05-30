// ============================================================
// AP3X INTELLIGENT AI — RELATIONSHIP ENGINE
// Builds the knowledge graph automatically
// ============================================================

const RelationshipEngine = (() => {

  function buildGraph() {
    const db = AP3X_Storage.getDB();
    const nodes = [];
    const edges = [];
    const nodeMap = {};

    // ── 1. Create project nodes ──────────────────────────
    for (const proj of db.domains.ap3x.projects) {
      if (!nodeMap[proj.id]) {
        const node = {
          id:    proj.id,
          label: proj.name,
          type:  'project',
          domain:'ap3x',
          tags:  proj.tags || [],
          x:     null,
          y:     null
        };
        nodes.push(node);
        nodeMap[proj.id] = node;
      }
    }

    // ── 2. Create entity nodes ────────────────────────────
    for (const [dName, dVal] of Object.entries(db.domains)) {
      const entities = dName === 'ap3x'
        ? db.domains.ap3x.projects.flatMap(p => (p.entities || []).map(e => ({ value: typeof e === 'string' ? e : e.value, domain: dName })))
        : (dVal.entities || []).map(e => ({ value: typeof e === 'string' ? e : e.value, domain: dName }));

      for (const ent of entities) {
        const entId = 'ent_' + ent.value.toLowerCase().replace(/\s+/g,'_');
        if (!nodeMap[entId]) {
          const node = {
            id:     entId,
            label:  ent.value,
            type:   'entity',
            domain: ent.domain,
            tags:   [],
            x:      null,
            y:      null
          };
          nodes.push(node);
          nodeMap[entId] = node;
        }
      }
    }

    // ── 3. Build edges (shared tags / entities) ───────────
    const projects = db.domains.ap3x.projects;
    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const a = projects[i];
        const b = projects[j];
        const sharedTags = (a.tags || []).filter(t => (b.tags || []).includes(t));
        const sharedEnts = (a.entities || [])
          .map(e => typeof e === 'string' ? e.toLowerCase() : e.value.toLowerCase())
          .filter(e => (b.entities || [])
            .map(x => typeof x === 'string' ? x.toLowerCase() : x.value.toLowerCase())
            .includes(e));

        if (sharedTags.length > 0 || sharedEnts.length > 0) {
          edges.push({
            id:       `edge_${a.id}_${b.id}`,
            source:   a.id,
            target:   b.id,
            weight:   sharedTags.length + sharedEnts.length,
            relation: sharedTags.length > 0 ? `shared: ${sharedTags.slice(0,2).join(', ')}` : `linked entities`
          });
        }
      }
    }

    // ── 4. Link entities to their parent projects ─────────
    for (const proj of projects) {
      for (const ent of (proj.entities || [])) {
        const entVal = typeof ent === 'string' ? ent : ent.value;
        const entId  = 'ent_' + entVal.toLowerCase().replace(/\s+/g,'_');
        if (nodeMap[entId]) {
          edges.push({
            id:       `edge_${proj.id}_${entId}`,
            source:   proj.id,
            target:   entId,
            weight:   1,
            relation: 'contains'
          });
        }
      }
    }

    // ── 5. Assign positions (force-layout approximation) ──
    assignPositions(nodes, edges);

    db.knowledgeGraph.nodes = nodes;
    db.knowledgeGraph.edges = edges;
    AP3X_Storage.saveDB(db);

    return { nodes, edges };
  }

  function assignPositions(nodes, edges) {
    const W = 800, H = 600, padding = 60;
    // Simple circular layout with clusters by domain
    const domainGroups = {};
    for (const n of nodes) {
      if (!domainGroups[n.domain]) domainGroups[n.domain] = [];
      domainGroups[n.domain].push(n);
    }
    const domains = Object.keys(domainGroups);
    const dAngle  = (2 * Math.PI) / Math.max(domains.length, 1);

    domains.forEach((d, di) => {
      const cx = W/2 + Math.cos(di * dAngle) * (W/3 - padding);
      const cy = H/2 + Math.sin(di * dAngle) * (H/3 - padding);
      const grp = domainGroups[d];
      const nAngle = (2 * Math.PI) / Math.max(grp.length, 1);
      grp.forEach((n, ni) => {
        n.x = cx + Math.cos(ni * nAngle) * 80;
        n.y = cy + Math.sin(ni * nAngle) * 80;
      });
    });
  }

  function linkEntities(entityA, entityB, relation = 'related') {
    const db = AP3X_Storage.getDB();
    const idA = 'ent_' + entityA.toLowerCase().replace(/\s+/g,'_');
    const idB = 'ent_' + entityB.toLowerCase().replace(/\s+/g,'_');
    const edgeId = `edge_${idA}_${idB}`;
    if (!db.knowledgeGraph.edges.find(e => e.id === edgeId)) {
      db.knowledgeGraph.edges.push({ id: edgeId, source: idA, target: idB, weight: 1, relation });
      AP3X_Storage.saveDB(db);
    }
  }

  function updateIndexes() {
    return buildGraph();
  }

  function getGraph() {
    const db = AP3X_Storage.getDB();
    return db.knowledgeGraph;
  }

  return { buildGraph, linkEntities, updateIndexes, getGraph };
})();

window.RelationshipEngine = RelationshipEngine;
