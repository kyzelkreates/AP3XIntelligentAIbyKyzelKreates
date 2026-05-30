// ============================================================
// AP3X VER5E — PROJECT INTELLIGENCE VIEW v1.0
// Investor, Grant, Build & Entity packs for YOUR projects
// ============================================================

const ProjIntelView = (() => {

  let activeProjectId = null;
  let activePack      = null;
  let activeTab       = 'exec';

  function init() {
    _renderProjectList();
    _renderStatus();
  }

  function _renderStatus() {
    const projects = ProjectEngine.getAllProjects();
    const packs    = ProjectIntelligence.getAllPacks();
    const el       = document.getElementById('pi-status');
    if (!el) return;
    el.innerHTML =
      '<div class="pi-stat"><div class="pi-sv">' + projects.length + '</div><div class="pi-sl">PROJECTS</div></div>' +
      '<div class="pi-stat"><div class="pi-sv">' + packs.length + '</div><div class="pi-sl">PACKS GENERATED</div></div>' +
      '<div class="pi-stat"><div class="pi-sv">' + projects.filter(p => p.status === 'active').length + '</div><div class="pi-sl">ACTIVE</div></div>';
  }

  function _renderProjectList() {
    const el       = document.getElementById('pi-project-list');
    const projects = ProjectEngine.getAllProjects();
    if (!el) return;

    if (projects.length === 0) {
      el.innerHTML = '<div class="pi-empty">[ NO PROJECTS — USE INGESTION ENGINE TO ADD PROJECTS ]</div>';
      return;
    }

    el.innerHTML = projects.map(function(p) {
      const pack  = ProjectIntelligence.getPack(p.id);
      const ready = pack ? (pack.productAnalysis && pack.productAnalysis.readiness ? pack.productAnalysis.readiness.level : 'READY') : 'NOT GENERATED';
      const cls   = p.id === activeProjectId ? 'active' : '';
      const readyCls = ready === 'INVESTOR READY' ? 'ready-green' : ready === 'NEAR READY' ? 'ready-amber' : 'ready-grey';
      return '<div class="pi-proj-item ' + cls + '" onclick="ProjIntelView.selectProject(\'' + p.id + '\')">' +
        '<div class="pi-proj-name">' + p.name + '</div>' +
        '<div class="pi-proj-meta">' +
          '<span class="pi-proj-status">' + (p.status || 'active').toUpperCase() + '</span>' +
          '<span class="pi-proj-ready ' + readyCls + '">' + ready + '</span>' +
        '</div>' +
        '<div class="pi-proj-desc">' + (p.description || '').slice(0, 70) + (p.description && p.description.length > 70 ? '…' : '') + '</div>' +
        '</div>';
    }).join('');
  }

  function selectProject(id) {
    activeProjectId = id;
    _renderProjectList();
    const project = ProjectEngine.getProject(id);
    if (!project) return;

    // Generate or load pack
    let pack = ProjectIntelligence.getPack(id);
    if (!pack) {
      pack = ProjectIntelligence.generateAndSave(project);
    }
    activePack = pack;
    _renderPack(pack);
    _renderStatus();

    // Auto-learn for AI
    if (typeof ProjectAI !== 'undefined') {
      const text = [project.name, project.description, project.architecture, (project.tags || []).join(' ')].filter(Boolean).join('\n');
      if (text.length > 30) ProjectAI.learnFromText(project.name, text, project.id);
    }
  }

  function regenerate() {
    if (!activeProjectId) return;
    const project = ProjectEngine.getProject(activeProjectId);
    if (!project) return;
    activePack = ProjectIntelligence.generateAndSave(project);
    _renderPack(activePack);
  }

  function showTab(tab, btn) {
    activeTab = tab;
    document.querySelectorAll('.pi-tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.pi-tab-panel').forEach(function(t) { t.classList.add('hidden'); });
    var el = document.getElementById('pi-tab-' + tab);
    if (el) el.classList.remove('hidden');
    if (btn) btn.classList.add('active');
  }

  function _renderPack(pack) {
    var ph    = document.getElementById('pi-pack-placeholder');
    var panel = document.getElementById('pi-pack-panel');
    if (ph) ph.classList.add('hidden');
    if (!panel) return;
    panel.classList.remove('hidden');

    var p = pack;
    var e = p.executive || {};
    var b = p.buildStructure || {};
    var pa = p.productAnalysis || {};
    var inv = p.investorPack || {};
    var g  = p.grantIntelligence || {};
    var em = p.entityMap || {};
    var ta = p.technicalArch || {};
    var mp = p.marketPosition || {};
    var ready = (pa.readiness || { level: '—', colour: '#888', note: '' });

    panel.innerHTML =
      // Pack header
      '<div class="pi-pack-header">' +
        '<div class="pi-ph-left">' +
          '<div class="pi-ph-name">' + p.projectName + '</div>' +
          '<div class="pi-ph-meta">' +
            '<span class="pi-ph-type">' + (e.type || '') + '</span>' +
            '<span class="pi-ph-stage">' + (e.stage || '') + '</span>' +
            '<span class="pi-ready-badge" style="color:' + ready.colour + '">' + ready.level + '</span>' +
          '</div>' +
          '<div class="pi-ph-oneliner">' + _esc(e.oneLiner || '') + '</div>' +
        '</div>' +
        '<div class="pi-ph-actions">' +
          '<button class="pi-regen-btn" onclick="ProjIntelView.regenerate()">↻ REGENERATE</button>' +
          '<button class="pi-regen-btn" onclick="ProjIntelView.exportPack()">↓ EXPORT</button>' +
        '</div>' +
      '</div>' +

      // Completeness bar
      (pa.completeness ? _renderCompletenessBar(pa.completeness) : '') +

      // Tabs
      '<div class="pi-tabs">' +
        '<button class="pi-tab active"   onclick="ProjIntelView.showTab(\'exec\',this)">EXECUTIVE</button>' +
        '<button class="pi-tab"          onclick="ProjIntelView.showTab(\'investor\',this)">INVESTOR</button>' +
        '<button class="pi-tab"          onclick="ProjIntelView.showTab(\'grant\',this)">GRANTS</button>' +
        '<button class="pi-tab"          onclick="ProjIntelView.showTab(\'build\',this)">BUILD</button>' +
        '<button class="pi-tab"          onclick="ProjIntelView.showTab(\'entities\',this)">ENTITIES</button>' +
        '<button class="pi-tab"          onclick="ProjIntelView.showTab(\'market\',this)">MARKET</button>' +
      '</div>' +

      '<div id="pi-tab-exec"     class="pi-tab-panel">'       + _renderExecTab(e, pa) + '</div>' +
      '<div id="pi-tab-investor" class="pi-tab-panel hidden">' + _renderInvestorTab(inv, e) + '</div>' +
      '<div id="pi-tab-grant"    class="pi-tab-panel hidden">' + _renderGrantTab(g) + '</div>' +
      '<div id="pi-tab-build"    class="pi-tab-panel hidden">' + _renderBuildTab(b, ta) + '</div>' +
      '<div id="pi-tab-entities" class="pi-tab-panel hidden">' + _renderEntitiesTab(em) + '</div>' +
      '<div id="pi-tab-market"   class="pi-tab-panel hidden">' + _renderMarketTab(mp) + '</div>';
  }

  function _renderCompletenessBar(comp) {
    var score = comp.score || 0;
    var cls   = score >= 70 ? 'comp-high' : score >= 40 ? 'comp-mid' : 'comp-low';
    var failing = (comp.checks || []).filter(function(c) { return !c.pass; }).map(function(c) { return c.label; }).slice(0,3);
    return '<div class="pi-completeness">' +
      '<div class="pi-comp-label">INTELLIGENCE COMPLETENESS: ' + score + '%</div>' +
      '<div class="pi-comp-bar"><div class="pi-comp-fill ' + cls + '" style="width:' + score + '%"></div></div>' +
      (failing.length ? '<div class="pi-comp-missing">Missing: ' + failing.join(' · ') + '</div>' : '') +
      '</div>';
  }

  function _renderExecTab(e, pa) {
    var out = '';
    out += _row('ONE-LINER',        e.oneLiner);
    out += _row('TYPE',             e.type);
    out += _row('STAGE',            e.stage);
    out += _row('STATUS',           e.currentStatus);
    out += _row('PROBLEM SOLVED',   e.problemSolved);
    out += _row('SOLUTION',         e.solution);
    out += _row('TARGET AUDIENCE',  e.targetAudience);
    out += _row('UNIQUE VALUE',     e.uniqueValue);
    out += _row('KEY OUTCOMES',     (e.keyOutcomes || []).map(function(o) { return '• ' + o; }).join('<br>'));
    if (pa.featureSet && pa.featureSet.length) {
      out += _section('FEATURES', pa.featureSet.map(function(f) {
        return '<span class="pi-feat-badge pi-feat-' + f.type + '">' + f.name + '</span>';
      }).join(''));
    }
    if (pa.differentiators && pa.differentiators.length) {
      out += _section('DIFFERENTIATORS', pa.differentiators.map(function(d) {
        return '<div class="pi-diff-item">◈ ' + d + '</div>';
      }).join(''));
    }
    if (pa.limitations && pa.limitations.length) {
      out += _section('TO IMPROVE', pa.limitations.map(function(l) {
        return '<div class="pi-limit-item">▸ ' + l + '</div>';
      }).join(''));
    }
    return out;
  }

  function _renderInvestorTab(inv, e) {
    var out = '';
    out += _section('ELEVATOR PITCH', '<div class="pi-pitch-text">' + _esc(inv.elevatorPitch || '') + '</div>');
    out += _section('PROBLEM STATEMENT', '<div class="pi-pitch-text">' + _esc(inv.problemStatement || '') + '</div>');
    out += _section('SOLUTION', '<div class="pi-pitch-text">' + _esc(inv.solutionStatement || '') + '</div>');
    out += _row('BUSINESS MODEL',    (inv.businessModel && (inv.businessModel.detected || []).join(', ')) || '');
    out += _row('REVENUE HYPOTHESIS',(inv.businessModel && inv.businessModel.hypothesis) || '');
    if (inv.traction && inv.traction.length) {
      out += _section('TRACTION', inv.traction.map(function(t) { return '<div class="pi-diff-item">• ' + t + '</div>'; }).join(''));
    }
    if (inv.marketOpportunity) {
      var m = inv.marketOpportunity;
      out += _section('MARKET OPPORTUNITY',
        _row2('TAM', m.tam) + _row2('SAM', m.sam) + _row2('SOM', m.som) +
        '<div class="pi-muted">' + _esc(m.note || '') + '</div>');
    }
    if (inv.competitiveAdvantage) {
      var ca = inv.competitiveAdvantage;
      out += _section('COMPETITIVE ADVANTAGE',
        (ca.moat || []).map(function(m) { return '<div class="pi-diff-item">◈ ' + m + '</div>'; }).join('') +
        (ca.defensibility || []).map(function(d) { return '<div class="pi-diff-item">🔒 ' + d + '</div>'; }).join(''));
    }
    if (inv.roadmap) {
      out += _section('ROADMAP',
        _row2('CURRENT',   inv.roadmap.current) +
        _row2('NEXT 3M',   inv.roadmap.next3months) +
        _row2('NEXT 12M',  inv.roadmap.next12months) +
        _row2('VISION',    inv.roadmap.longTerm));
    }
    out += _row('ASK',              (inv.askSuggestion && inv.askSuggestion.amount) || '');
    out += _row('USE OF FUNDS',     (inv.askSuggestion && inv.askSuggestion.use) || '');
    if (inv.fullPitchScript) {
      out += _section('60-SECOND PITCH SCRIPT', '<pre class="pi-script">' + _esc(inv.fullPitchScript) + '</pre>');
    }
    return out;
  }

  function _renderGrantTab(g) {
    if (!g || !g.grantTypes) return '<div class="pi-empty">No grant data generated.</div>';
    var out = '';
    out += '<div class="pi-grant-grid">';
    out += (g.grantTypes || []).map(function(gt) {
      var fitCls = gt.fit === 'HIGH' ? 'fit-high' : gt.fit === 'MEDIUM' ? 'fit-med' : 'fit-low';
      return '<div class="pi-grant-card">' +
        '<div class="pi-gc-top">' +
          '<span class="pi-gc-name">' + gt.name + '</span>' +
          '<span class="pi-gc-fit ' + fitCls + '">' + gt.fit + ' FIT</span>' +
        '</div>' +
        '<div class="pi-gc-region">' + gt.region + '</div>' +
        '<div class="pi-gc-notes">' + _esc(gt.notes) + '</div>' +
        '</div>';
    }).join('');
    out += '</div>';
    if (g.eligibility && g.eligibility.length) {
      out += _section('ELIGIBILITY SIGNALS', g.eligibility.map(function(e) { return '<div class="pi-diff-item">✓ ' + e + '</div>'; }).join(''));
    }
    if (g.tips && g.tips.length) {
      out += _section('APPLICATION TIPS', g.tips.map(function(t) { return '<div class="pi-diff-item">▸ ' + t + '</div>'; }).join(''));
    }
    out += '<div class="pi-muted" style="margin:12px 0">' + _esc(g.disclaimer || '') + '</div>';
    return out;
  }

  function _renderBuildTab(b, ta) {
    var out = '';
    out += _row('PROJECT TYPE',    b.projectType);
    out += _row('ARCHITECTURE',    b.architecture);
    out += _row('STORAGE MODEL',   b.storageModel);
    out += _row('DEPLOYMENT',      b.deploymentModel);
    out += _row('API SURFACE',     b.apiSurface);
    out += _row('OFFLINE CAPABLE', b.offlineCapable ? '✓ Yes — local-first' : '✗ No');
    out += _row('OPEN SOURCE',     b.openSource ? '✓ Yes' : '✗ No / Not specified');

    if (b.techStack) {
      var s = b.techStack;
      out += _section('TECH STACK',
        (s.frontend.length ? '<div class="pi-stack-row"><span class="pi-sl-lbl">FRONTEND</span>' + s.frontend.map(function(x) { return '<span class="pi-stack-badge">'+x+'</span>'; }).join('') + '</div>' : '') +
        (s.backend.length  ? '<div class="pi-stack-row"><span class="pi-sl-lbl">BACKEND</span>'  + s.backend.map(function(x) { return '<span class="pi-stack-badge">'+x+'</span>'; }).join('') + '</div>' : '') +
        (s.database.length ? '<div class="pi-stack-row"><span class="pi-sl-lbl">DATABASE</span>' + s.database.map(function(x) { return '<span class="pi-stack-badge">'+x+'</span>'; }).join('') + '</div>' : '') +
        (s.ai.length       ? '<div class="pi-stack-row"><span class="pi-sl-lbl">AI</span>'       + s.ai.map(function(x) { return '<span class="pi-stack-badge">'+x+'</span>'; }).join('') + '</div>' : '') +
        (s.devops.length   ? '<div class="pi-stack-row"><span class="pi-sl-lbl">DEVOPS</span>'   + s.devops.map(function(x) { return '<span class="pi-stack-badge">'+x+'</span>'; }).join('') + '</div>' : ''));
    }

    if (b.modules && b.modules.length) {
      out += _section('MODULES', b.modules.map(function(m) {
        return '<div class="pi-diff-item"><span class="pi-mod-src">[' + m.source + ']</span> ' + m.name + '</div>';
      }).join(''));
    }

    if (b.fileStructure) {
      out += _section('FILE STRUCTURE', '<pre class="pi-script">' + _esc(b.fileStructure) + '</pre>');
    }

    if (ta) {
      out += _row('DATA FLOW',          ta.dataFlow);
      if (ta.securityNotes && ta.securityNotes.length)    out += _section('SECURITY NOTES',    ta.securityNotes.map(function(n) { return '<div class="pi-diff-item">🔒 '+n+'</div>'; }).join(''));
      if (ta.scalabilityNotes && ta.scalabilityNotes.length) out += _section('SCALABILITY',    ta.scalabilityNotes.map(function(n) { return '<div class="pi-diff-item">↑ '+n+'</div>'; }).join(''));
      if (ta.integrations && ta.integrations.length) out += _section('INTEGRATIONS',           ta.integrations.map(function(n) { return '<span class="pi-stack-badge">'+n+'</span> '; }).join(''));
    }
    return out;
  }

  function _renderEntitiesTab(em) {
    if (!em || !em.total) return '<div class="pi-empty">No entities detected. Add more detail to project description.</div>';
    var out = '<div class="pi-ent-summary">' + em.total + ' entities extracted</div>';
    var types = ['system', 'concept', 'metric', 'function'];
    for (var i = 0; i < types.length; i++) {
      var type = types[i];
      var items = (em.byType && em.byType[type]) || [];
      if (!items.length) continue;
      out += _section(type.toUpperCase() + ' ENTITIES (' + items.length + ')',
        items.map(function(e) {
          return '<div class="pi-ent-row">' +
            '<span class="pi-ent-val">' + e.value + '</span>' +
            '<span class="pi-ent-role">' + (e.role || '') + '</span>' +
            '<span class="pi-ent-conf">' + Math.round((e.confidence || 0.7) * 100) + '%</span>' +
            '</div>';
        }).join(''));
    }
    if (em.searchable && em.searchable.length) {
      out += _section('SEARCH TERMS', em.searchable.map(function(s) {
        return '<span class="pi-search-tag" onclick="ProjIntelView.searchEntity(\'' + _esc(s) + '\')">' + s + '</span>';
      }).join(''));
    }
    return out;
  }

  function _renderMarketTab(mp) {
    var out = '';
    out += _row('POSITIONING',     mp.positioning);
    out += _row('BUYER JOURNEY',   mp.buyerJourney);
    out += _row('PRICING MODEL',   mp.pricingModel);
    if (mp.competitors && mp.competitors.length) {
      out += _section('LIKELY COMPETITORS', mp.competitors.map(function(c) { return '<span class="pi-stack-badge">' + c + '</span> '; }).join(''));
    }
    if (mp.goToMarket && mp.goToMarket.length) {
      out += _section('GO-TO-MARKET CHANNELS', mp.goToMarket.map(function(c) { return '<div class="pi-diff-item">→ ' + c + '</div>'; }).join(''));
    }
    return out;
  }

  function searchEntity(term) {
    if (typeof AP3X_App !== 'undefined' && AP3X_App.runSearch) {
      AP3X_App.runSearch(term);
    }
  }

  function exportPack() {
    if (!activePack) return;
    var blob = new Blob([JSON.stringify(activePack, null, 2)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href     = url;
    a.download = 'intel-' + (activePack.projectName || 'project').replace(/\s+/g,'-').toLowerCase() + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Helpers
  function _row(label, value) {
    if (!value || (typeof value === 'string' && value.length < 2)) return '';
    return '<div class="pi-row"><div class="pi-row-label">[ ' + label + ' ]</div><div class="pi-row-val">' + _esc(String(value)) + '</div></div>';
  }
  function _row2(label, value) {
    if (!value) return '';
    return '<div class="pi-row2"><span class="pi-r2-label">' + label + ':</span> <span class="pi-r2-val">' + _esc(String(value)) + '</span></div>';
  }
  function _section(label, content) {
    return '<div class="pi-section"><div class="pi-section-label">[ ' + label + ' ]</div><div class="pi-section-body">' + content + '</div></div>';
  }
  function _esc(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, selectProject, regenerate, showTab, exportPack, searchEntity };
})();

window.ProjIntelView = ProjIntelView;
