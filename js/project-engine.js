// ============================================================
// AP3X INTELLIGENT AI — PROJECT ENGINE
// ============================================================

const ProjectEngine = (() => {

  function addProject(projectData) {
    const db = AP3X_Storage.getDB();
    const project = {
      id:          'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2,6),
      name:        projectData.name        || 'Unnamed Project',
      domain:      projectData.domain      || 'ap3x',
      description: projectData.description || '',
      tags:        projectData.tags        || [],
      entities:    projectData.entities    || [],
      architecture:projectData.architecture|| '',
      status:      projectData.status      || 'active',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      meta:        projectData.meta        || {}
    };
    db.domains.ap3x.projects.push(project);
    db.meta.indexedEntities++;
    AP3X_Storage.saveDB(db);

    // Update knowledge graph
    RelationshipEngine.buildGraph();
    return project;
  }

  function updateProject(id, updates) {
    const db = AP3X_Storage.getDB();
    const idx = db.domains.ap3x.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.domains.ap3x.projects[idx] = {
      ...db.domains.ap3x.projects[idx],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    AP3X_Storage.saveDB(db);
    RelationshipEngine.buildGraph();
    return db.domains.ap3x.projects[idx];
  }

  function getProject(id) {
    const db = AP3X_Storage.getDB();
    return db.domains.ap3x.projects.find(p => p.id === id) || null;
  }

  function getAllProjects() {
    const db = AP3X_Storage.getDB();
    return db.domains.ap3x.projects;
  }

  function deleteProject(id) {
    const db = AP3X_Storage.getDB();
    const before = db.domains.ap3x.projects.length;
    db.domains.ap3x.projects = db.domains.ap3x.projects.filter(p => p.id !== id);
    if (db.domains.ap3x.projects.length < before) {
      db.meta.indexedEntities = Math.max(0, db.meta.indexedEntities - 1);
      // Remove from graph
      db.knowledgeGraph.nodes = db.knowledgeGraph.nodes.filter(n => n.id !== id);
      db.knowledgeGraph.edges = db.knowledgeGraph.edges.filter(e => e.source !== id && e.target !== id);
      AP3X_Storage.saveDB(db);
      return true;
    }
    return false;
  }

  return { addProject, updateProject, getProject, getAllProjects, deleteProject };
})();

window.ProjectEngine = ProjectEngine;
