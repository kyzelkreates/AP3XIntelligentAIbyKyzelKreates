// ============================================================
// AP3X INTELLIGENT AI — MAIN APPLICATION CONTROLLER
// ============================================================

(function () {
  'use strict';

  let currentView   = 'dashboard';
  let selectedItem  = null;
  let installPrompt = null;

  // ── PWA Install prompt capture ────────────────────────────
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
    document.getElementById('install-banner')?.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner')?.classList.add('hidden');
    installPrompt = null;
  });

  // ── Detect iOS ────────────────────────────────────────────
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  }

  // ── Navigation ────────────────────────────────────────────
  function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const viewEl = document.getElementById(`view-${view}`);
    const navEl  = document.querySelector(`[data-view="${view}"]`);
    if (viewEl) viewEl.classList.add('active');
    if (navEl)  navEl.classList.add('active');

    switch (view) {
      case 'dashboard':  renderDashboard();  break;
      case 'projects':   renderProjects();   break;
      case 'ingestion':  renderIngestion();  break;
      case 'analysis':   renderAnalysis();   break;
      case 'graph':      renderGraph();      break;
    }
  }

  // ── DASHBOARD ─────────────────────────────────────────────
  function renderDashboard() {
    const overview = KnowledgeEngine.systemOverview();
    const health   = overview.statusHealth;

    document.getElementById('stat-projects').textContent  = overview.totalProjects;
    document.getElementById('stat-nodes').textContent     = overview.totalNodes;
    document.getElementById('stat-edges').textContent     = overview.totalEdges;
    document.getElementById('stat-ingestions').textContent= overview.totalIngestions;
    document.getElementById('stat-entities').textContent  = overview.indexedEntities;

    const lastEl = document.getElementById('stat-last-activity');
    if (lastEl) lastEl.textContent = overview.lastActivity
      ? new Date(overview.lastActivity).toLocaleString()
      : 'No activity yet';

    const healthEl = document.getElementById('system-health');
    if (healthEl) {
      healthEl.className = `health-badge health-${health.status.toLowerCase()}`;
      healthEl.innerHTML = `
        <span class="health-dot"></span>
        <span class="health-status">${health.status}</span>
        <span class="health-label">${health.label}</span>`;
    }

    // Domain matrix
    const matrixEl = document.getElementById('domain-matrix');
    if (matrixEl) {
      const domainColors = {
        ap3x:'#D4AF37', fleet:'#4DA3FF', education:'#FFC832',
        health:'#FF5078', general:'#C0C0C0'
      };
      matrixEl.innerHTML = Object.entries(overview.domainSummary).map(([d, info]) => {
        const count = info.count !== undefined ? info.count : (info.notes || 0);
        const col   = domainColors[d] || '#C0C0C0';
        return `
          <div class="domain-card" onclick="AP3X_App.navigateTo('projects')">
            <div class="domain-indicator" style="background:${col}"></div>
            <div class="domain-name">${d.toUpperCase()}</div>
            <div class="domain-count">${count}</div>
            <div class="domain-label">${d === 'ap3x' ? 'PROJECTS' : 'RECORDS'}</div>
          </div>`;
      }).join('');
    }

    // Recent projects
    const recentEl = document.getElementById('recent-projects');
    if (recentEl) {
      const projects = KnowledgeEngine.getAllProjects().slice(-4).reverse();
      if (projects.length === 0) {
        recentEl.innerHTML = '<div class="empty-state">[ NO PROJECTS INDEXED — USE INGESTION ENGINE ]</div>';
      } else {
        recentEl.innerHTML = projects.map(p => `
          <div class="recent-item" onclick="AP3X_App.openProject('${p.id}')">
            <div class="recent-dot" style="background:#D4AF37"></div>
            <div class="recent-info">
              <div class="recent-name">${p.name}</div>
              <div class="recent-meta">${(p.tags||[]).slice(0,3).join(' · ')}</div>
            </div>
            <div class="recent-arrow">›</div>
          </div>`).join('');
      }
    }
  }

  // ── PROJECTS ──────────────────────────────────────────────
  function renderProjects() {
    const projects = KnowledgeEngine.getAllProjects();
    const listEl   = document.getElementById('project-list');
    if (!listEl) return;

    if (projects.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state-full">
          <div class="empty-icon">◈</div>
          <div class="empty-title">NO PROJECTS INDEXED</div>
          <div class="empty-sub">Use the Ingestion Engine to ingest raw intelligence</div>
          <button class="btn-primary" onclick="AP3X_App.navigateTo('ingestion')">OPEN INGESTION ENGINE</button>
        </div>`;
      return;
    }

    listEl.innerHTML = projects.map(p => `
      <div class="project-card" onclick="AP3X_App.openProject('${p.id}')">
        <div class="project-card-header">
          <div class="project-status-dot ${p.status === 'active' ? 'active' : ''}"></div>
          <div class="project-name">${p.name}</div>
          <div class="project-type-badge">${(p.meta?.type || 'PROJECT').toUpperCase()}</div>
        </div>
        <div class="project-desc">${(p.description || p.summary || '').slice(0,100)}${(p.description||'').length > 100 ? '…' : ''}</div>
        <div class="project-tags">${(p.tags||[]).slice(0,5).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <div class="project-entities-row">${(p.entities||[]).slice(0,3).map(e=>`<span class="entity-chip">${typeof e==='string'?e:e.value}</span>`).join('')}</div>
        <div class="project-footer">
          <span class="project-date">${new Date(p.createdAt).toLocaleDateString()}</span>
          <span class="project-action">INSPECT ›</span>
        </div>
      </div>`).join('');
  }

  function openProject(id) {
    const project = KnowledgeEngine.getProjectById(id);
    if (!project) return;
    selectedItem = project;
    navigateTo('analysis');
    setTimeout(() => renderAnalysisForItem(project), 50);
  }

  // ── INGESTION ─────────────────────────────────────────────
  function renderIngestion() {
    // Reset output
    const outputEl = document.getElementById('ingestion-output');
    if (outputEl) {
      outputEl.innerHTML = '<div class="output-idle">[ AWAITING INPUT — PASTE RAW INTELLIGENCE BELOW ]</div>';
    }
  }

  function processIngestion() {
    const textEl   = document.getElementById('ingestion-text');
    const domainEl = document.getElementById('ingestion-domain');
    const outputEl = document.getElementById('ingestion-output');
    if (!textEl || !outputEl) return;

    const text   = textEl.value.trim();
    const domain = domainEl?.value || null;

    if (!text) {
      outputEl.innerHTML = '<div class="output-error">[ ERROR: NO INPUT DETECTED ]</div>';
      return;
    }

    outputEl.innerHTML = '<div class="output-processing"><span class="spinner">◈</span> PROCESSING INTELLIGENCE…</div>';

    setTimeout(() => {
      const result = IngestionEngine.ingestRawData(text, domain === 'auto' ? null : domain);

      if (!result.success) {
        outputEl.innerHTML = `<div class="output-error">[ PROCESSING ERROR: ${result.error} ]</div>`;
        return;
      }

      const entityHTML = result.entities.slice(0,8).map(e =>
        `<div class="result-entity"><span class="entity-type">[${(e.type||'').toUpperCase()}]</span> ${e.value} <span class="confidence">${Math.round((e.confidence||0.7)*100)}%</span></div>`
      ).join('');

      const tagHTML = result.tags.slice(0,10).map(t =>
        `<span class="result-tag">${t}</span>`
      ).join('');

      outputEl.innerHTML = `
        <div class="output-success">
          <div class="output-header">
            <span class="output-status">[ ANALYSIS COMPLETE ]</span>
            <span class="output-domain">DOMAIN: ${result.domain.toUpperCase()}</span>
          </div>

          <div class="output-section">
            <div class="output-label">[ TYPE DETECTED ]</div>
            <div class="output-value type-badge">${result.type.toUpperCase()}</div>
          </div>

          <div class="output-section">
            <div class="output-label">[ SUMMARY GENERATED ]</div>
            <div class="output-value">${result.summary}</div>
          </div>

          <div class="output-section">
            <div class="output-label">[ ENTITIES EXTRACTED — ${result.entities.length} ]</div>
            <div class="entity-list">${entityHTML || '<span class="muted">None detected</span>'}</div>
          </div>

          <div class="output-section">
            <div class="output-label">[ TAGS GENERATED — ${result.tags.length} ]</div>
            <div class="tag-cloud">${tagHTML}</div>
          </div>

          <div class="output-section">
            <div class="output-label">[ KNOWLEDGE GRAPH UPDATED ]</div>
            <div class="output-value graph-note">+ 1 record indexed · Relationships mapped · Storage written</div>
          </div>

          <div class="output-actions">
            <button class="btn-secondary" onclick="AP3X_App.navigateTo('graph')">VIEW GRAPH</button>
            <button class="btn-secondary" onclick="AP3X_App.navigateTo('projects')">VIEW PROJECTS</button>
          </div>
        </div>`;

      // Clear input
      textEl.value = '';

      // Refresh dashboard stats silently
    }, 600);
  }

  // ── ANALYSIS ──────────────────────────────────────────────
  function renderAnalysis() {
    const projects = KnowledgeEngine.getAllProjects();
    const selectEl = document.getElementById('analysis-select');
    if (selectEl) {
      selectEl.innerHTML = '<option value="">— SELECT SYSTEM —</option>' +
        projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
      if (selectedItem) selectEl.value = selectedItem.id;
    }
    if (selectedItem) renderAnalysisForItem(selectedItem);
  }

  function renderAnalysisForItem(item) {
    const modeEl   = document.querySelector('input[name="analysis-mode"]:checked');
    const mode     = modeEl?.value || 'simple';
    const result   = ExplanationEngine.generateExplanation(item, mode);
    const outputEl = document.getElementById('analysis-output');
    if (!outputEl) return;

    const rows = result.output.map(row => `
      <div class="analysis-row">
        <div class="analysis-label">[ ${row.label} ]</div>
        <div class="analysis-value">${row.value}</div>
      </div>`).join('');

    outputEl.innerHTML = `
      <div class="analysis-header">
        <span class="analysis-status">[ ANALYSIS COMPLETE ]</span>
        <span class="analysis-mode-badge mode-${result.mode.toLowerCase()}">${result.mode} MODE</span>
      </div>
      <div class="analysis-title">${result.title}</div>
      <div class="analysis-rows">${rows}</div>`;
  }

  function runAnalysis() {
    const selectEl = document.getElementById('analysis-select');
    if (!selectEl?.value) return;
    const project = KnowledgeEngine.getProjectById(selectEl.value);
    if (!project) return;
    selectedItem = project;
    renderAnalysisForItem(project);
  }

  // ── GRAPH ─────────────────────────────────────────────────
  function renderGraph() {
    const graph = RelationshipEngine.getGraph();
    const canvasEl = document.getElementById('graph-canvas');
    if (!canvasEl) return;

    if (!canvasEl._ap3xInit) {
      GraphRenderer.init(canvasEl, (node) => {
        showGraphNodeInfo(node);
      });
      canvasEl._ap3xInit = true;
    }

    GraphRenderer.loadGraph(graph);

    const statsEl = document.getElementById('graph-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="gstat">NODES: ${graph.nodes.length}</span>
        <span class="gstat">EDGES: ${graph.edges.length}</span>
        <span class="gstat">PROJECTS: ${graph.nodes.filter(n=>n.type==='project').length}</span>
        <span class="gstat">ENTITIES: ${graph.nodes.filter(n=>n.type==='entity').length}</span>`;
    }
  }

  function showGraphNodeInfo(node) {
    const infoEl = document.getElementById('graph-node-info');
    if (!infoEl) return;
    infoEl.innerHTML = `
      <div class="node-info-header">[ NODE SELECTED ]</div>
      <div class="node-info-row"><span>ID:</span> <span>${node.id}</span></div>
      <div class="node-info-row"><span>LABEL:</span> <span>${node.label}</span></div>
      <div class="node-info-row"><span>TYPE:</span> <span>${node.type.toUpperCase()}</span></div>
      <div class="node-info-row"><span>DOMAIN:</span> <span>${node.domain.toUpperCase()}</span></div>
      ${node.type === 'project' ? `<button class="btn-mini" onclick="AP3X_App.openProject('${node.id}')">ANALYSE ›</button>` : ''}`;
  }

  // ── Search ────────────────────────────────────────────────
  function runSearch(query) {
    if (!query || query.length < 2) return;
    const results = KnowledgeEngine.searchIndex(query);
    const el = document.getElementById('search-results');
    if (!el) return;
    if (results.length === 0) {
      el.innerHTML = '<div class="search-empty">[ NO RESULTS ]</div>';
    } else {
      el.innerHTML = results.slice(0,6).map(r => `
        <div class="search-result" onclick="AP3X_App.openProject('${r.id}')">
          <span class="sr-name">${r.name || r.summary?.slice(0,40)}</span>
          <span class="sr-domain">${(r._source||'').toUpperCase()}</span>
        </div>`).join('');
    }
    el.classList.remove('hidden');
  }

  // ── Install ────────────────────────────────────────────────
  function triggerInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
          document.getElementById('install-banner')?.classList.add('hidden');
        }
        installPrompt = null;
      });
    } else if (isIOS() && !isInStandaloneMode()) {
      document.getElementById('ios-install-overlay')?.classList.remove('hidden');
    }
  }

  function closeIOSOverlay() {
    document.getElementById('ios-install-overlay')?.classList.add('hidden');
  }

  // ── Reset DB ──────────────────────────────────────────────
  function confirmReset() {
    if (confirm('RESET ALL DATA?\n\nThis will permanently delete all indexed intelligence.\nThis action cannot be undone.')) {
      AP3X_Storage.resetDB();
      navigateTo('dashboard');
    }
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    // iOS install hint
    if (isIOS() && !isInStandaloneMode()) {
      setTimeout(() => {
        document.getElementById('ios-install-banner')?.classList.remove('hidden');
      }, 3000);
    }

    // Nav clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.view));
    });

    // Start on dashboard
    navigateTo('dashboard');
  }

  // Public interface
  window.AP3X_App = {
    navigateTo,
    openProject,
    processIngestion,
    runAnalysis,
    runSearch,
    triggerInstall,
    closeIOSOverlay,
    confirmReset,
    renderAnalysisForItem
  };

  // Boot on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
