// ============================================================
// AP3X — URL INTELLIGENCE VIEW CONTROLLER
// Manages the URL Analysis screen UI
// ============================================================

const URLIntelligenceView = (() => {

  let activeJobId = null;

  // ── Render job list ───────────────────────────────────────
  function renderJobList() {
    const jobs = URLIngestionEngine.getAllJobs().slice().reverse();
    const el   = document.getElementById('url-job-list');
    if (!el) return;

    if (jobs.length === 0) {
      el.innerHTML = `
        <div class="empty-state">
          [ NO ANALYSIS JOBS — SUBMIT A URL ABOVE ]
        </div>`;
      return;
    }

    el.innerHTML = jobs.map(j => {
      const statusClass = {
        queued:     'status-queued',
        crawling:   'status-crawling',
        processing: 'status-processing',
        compiled:   'status-compiled',
        error:      'status-error'
      }[j.status] || '';

      const domain = (() => { try { return new URL(j.url).hostname; } catch { return j.url; } })();

      return `
        <div class="job-card ${j.id === activeJobId ? 'active' : ''}" onclick="URLIntelligenceView.loadJob('${j.id}')">
          <div class="job-card-header">
            <span class="job-status-dot ${statusClass}"></span>
            <span class="job-domain">${domain}</span>
            <span class="job-status-label ${statusClass}">${j.status.toUpperCase()}</span>
          </div>
          <div class="job-url">${j.url.slice(0,55)}${j.url.length>55?'…':''}</div>
          <div class="job-meta">
            <span>${new Date(j.createdAt).toLocaleString()}</span>
            <button class="btn-delete-job" onclick="URLIntelligenceView.deleteJob(event,'${j.id}')">✕</button>
          </div>
          ${j.status === 'error' ? `<div class="job-error">${j.error}</div>` : ''}
          ${j.status !== 'error' && j.status !== 'compiled'
            ? `<div class="job-progress-bar"><div class="job-progress-fill" style="width:${j.progress?.percent||0}%"></div></div>`
            : ''}
        </div>`;
    }).join('');
  }

  // ── Submit URL ────────────────────────────────────────────
  async function submitUrl() {
    const inputEl = document.getElementById('url-input');
    const logEl   = document.getElementById('url-log');
    const url     = inputEl?.value?.trim();

    if (!url) {
      showLog('[ERROR] No URL entered', 'error');
      return;
    }

    clearLog();
    showLog(`[ INIT ] Creating ingestion job for: ${url}`, 'info');

    const result = URLIngestionEngine.createJob(url);
    if (!result.success) {
      showLog(`[ ERROR ] ${result.error}`, 'error');
      return;
    }

    activeJobId = result.job.id;
    renderJobList();
    showLog(`[ JOB CREATED ] ${result.job.id}`, 'info');

    // Clear output panel
    clearOutputPanel();
    document.getElementById('url-output-placeholder')?.classList.remove('hidden');

    // Execute job with live progress
    const execResult = await URLIngestionEngine.executeJob(result.job.id, (msg) => {
      showLog(msg, msg.includes('ERROR') || msg.includes('FAIL') ? 'error' : 'progress');
      renderJobList();
    });

    renderJobList();

    if (!execResult.success) {
      showLog(`\n[ ✗ PIPELINE FAILED ]\n${execResult.error}`, 'error');
      return;
    }

    showLog('\n[ ✓ COMPILATION COMPLETE — LOADING INTELLIGENCE PACK ]', 'success');
    inputEl.value = '';
    loadJob(result.job.id);
  }

  // ── Load job output ───────────────────────────────────────
  function loadJob(jobId) {
    activeJobId = jobId;
    renderJobList();

    const job = URLIngestionEngine.getJobById(jobId);
    if (!job) return;
    if (job.status !== 'compiled') {
      clearOutputPanel();
      document.getElementById('url-output-placeholder').innerHTML =
        `<div class="output-idle">[ JOB STATUS: ${job.status.toUpperCase()} ]<br>${job.progress?.message || ''}</div>`;
      document.getElementById('url-output-placeholder').classList.remove('hidden');
      return;
    }

    const spec    = AP3X_Storage.getRecord('project_specs',     jobId);
    const bp      = AP3X_Storage.getRecord('system_blueprints', jobId);
    const ui      = AP3X_Storage.getRecord('ui_blueprints',     jobId);
    const inv     = AP3X_Storage.getRecord('investor_packs',    jobId);
    const snap    = AP3X_Storage.getRecord('site_snapshots',    jobId);
    const model   = AP3X_Storage.getRecord('site_models',       jobId);

    if (!spec || !inv) {
      showLog('[ERROR] Records missing from SSOT', 'error');
      return;
    }

    renderOutputPanel(snap, model, spec, bp, ui, inv);
  }

  // ── Output Panel ──────────────────────────────────────────
  function renderOutputPanel(snap, model, spec, bp, ui, inv) {
    const placeholder = document.getElementById('url-output-placeholder');
    const panel       = document.getElementById('url-output-content');
    if (placeholder) placeholder.classList.add('hidden');
    if (!panel) return;
    panel.classList.remove('hidden');

    panel.innerHTML = `
      <!-- Header -->
      <div class="intel-header">
        <div class="intel-title">${spec.productName}</div>
        <div class="intel-meta">
          <span class="intel-cat">${spec.category}</span>
          <span class="intel-url">${snap.url}</span>
          <span class="intel-conf intel-conf-${inv.inferenceScore.score >= 80 ? 'high' : inv.inferenceScore.score >= 50 ? 'med' : 'low'}">${inv.inferenceScore.label}</span>
        </div>
      </div>

      <!-- Tab Nav -->
      <div class="intel-tabs">
        <button class="intel-tab active" onclick="URLIntelligenceView.showTab('summary',this)">SUMMARY</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('product',this)">PRODUCT SPEC</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('architecture',this)">ARCHITECTURE</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('database',this)">DATABASE</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('ui',this)">UI STRUCTURE</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('investor',this)">INVESTOR PACK</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('status',this)">STATUS</button>
      </div>

      <!-- Tab Content -->
      <div id="tab-summary"    class="tab-content active">${renderSummaryTab(snap, model, spec, inv)}</div>
      <div id="tab-product"    class="tab-content hidden">${renderProductTab(spec)}</div>
      <div id="tab-architecture" class="tab-content hidden">${renderArchitectureTab(bp)}</div>
      <div id="tab-database"   class="tab-content hidden">${renderDatabaseTab(bp)}</div>
      <div id="tab-ui"         class="tab-content hidden">${renderUITab(ui)}</div>
      <div id="tab-investor"   class="tab-content hidden">${renderInvestorTab(inv)}</div>
      <div id="tab-status"     class="tab-content hidden">${renderStatusTab(snap, model)}</div>
    `;
  }

  function showTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.intel-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.remove('hidden');
    btn?.classList.add('active');
  }

  // ── Tab: Summary ─────────────────────────────────────────
  function renderSummaryTab(snap, model, spec, inv) {
    const maturity = AP3X_Storage.getRecord('system_blueprints', activeJobId);
    const mat = (() => {
      // compute maturity from blueprint store
      const db = AP3X_Storage.getDB();
      return (db.investor_packs || []).find(r => r.jobId === activeJobId)?.productMaturity;
    })();

    return `
      <div class="tab-section">
        <div class="ts-label">[ ANALYSIS COMPLETE ]</div>
        <div class="ts-value large">${spec.productName}</div>
        <div class="ts-value muted">${spec.tagline}</div>
      </div>

      <div class="tab-grid-3">
        <div class="tab-stat-card">
          <div class="tsc-val">${model.features?.length || 0}</div>
          <div class="tsc-label">FEATURES</div>
        </div>
        <div class="tab-stat-card">
          <div class="tsc-val">${model.pages?.length || 0}</div>
          <div class="tsc-label">PAGES</div>
        </div>
        <div class="tab-stat-card">
          <div class="tsc-val">${model.inferred_data_entities?.length || 0}</div>
          <div class="tsc-label">DATA ENTITIES</div>
        </div>
      </div>

      ${_row('PRODUCT CATEGORY', spec.category)}
      ${_row('WHAT IT DOES', spec.whatItDoes)}
      ${_row('PROBLEM SOLVED', spec.problemItSolves)}
      ${_row('TARGET USERS', (spec.targetUsers||[]).join(' · '))}
      ${mat ? _row('MATURITY TIER', `<span class="maturity-badge maturity-${mat.tier.replace(/[\s+]/g,'-').toLowerCase()}">${mat.tier}</span>  COMPLEXITY: ${mat.complexity}`) : ''}
      ${_row('CORE FEATURES', (spec.coreFeatures||[]).slice(0,6).map(f=>`<span class="feat-badge">${f.name}</span>`).join(' '))}
      ${_row('60-SECOND PITCH', inv.investorPitch?.sixtySecondPitch || '')}
    `;
  }

  // ── Tab: Product Spec ─────────────────────────────────────
  function renderProductTab(spec) {
    return `
      ${_row('PRODUCT NAME',     spec.productName)}
      ${_row('CATEGORY',         spec.category)}
      ${_row('WHAT IT DOES',     spec.whatItDoes)}
      ${_row('PROBLEM IT SOLVES',spec.problemItSolves)}
      ${_row('TARGET USERS',     (spec.targetUsers||[]).join(' · '))}
      ${_row('CORE FEATURES',    (spec.coreFeatures||[]).map(f=>`<span class="feat-badge">${f.name} <span class="feat-type">${f.type}</span></span>`).join(' '))}
      <div class="tab-section">
        <div class="ts-label">[ USER JOURNEYS ]</div>
        ${(spec.userJourneys||[]).map(j => `
          <div class="journey-row">
            <div class="journey-name">${j.name}</div>
            <div class="journey-steps">${j.steps.map((s,i) => `<span class="step">${i===0?'':' → '}${s}</span>`).join('')}</div>
          </div>`).join('') || '<div class="muted ts-value">No user journeys inferred</div>'}
      </div>`;
  }

  // ── Tab: Architecture ─────────────────────────────────────
  function renderArchitectureTab(bp) {
    if (!bp) return '<div class="output-idle">[ NO BLUEPRINT ]</div>';
    const a = bp.architecture;
    return `
      <div class="tab-section">
        <div class="ts-label">[ SYSTEM ARCHITECTURE BLUEPRINT ]</div>
      </div>
      ${_row('FRONTEND STACK',   a.frontend.stackSignals.join(', '))}
      ${_row('PAGES DETECTED',   a.frontend.pages.join(' · '))}
      ${_row('PWA SIGNALS',      a.frontend.pwaSignals ? 'PWA signals detected' : 'No PWA signals')}
      ${_row('MOBILE SIGNALS',   a.frontend.mobileSignals ? 'Mobile support inferred' : 'None detected')}
      ${_row('BACKEND TYPE',     a.backend.type)}
      ${_row('CLOUD SIGNALS',    a.backend.cloudSignals.join(', ') || 'None detected')}
      ${_row('SERVER PROTOCOLS', a.backend.serverSignals.join(', ') || 'None detected')}
      ${_row('CACHE SIGNALS',    a.backend.cacheSignals.join(', ') || 'None')}
      ${_row('ASYNC/QUEUE',      a.backend.queueSignals.join(', ') || 'None')}
      ${_row('AUTH TYPE',        a.auth.type)}
      ${_row('OAUTH',            a.auth.oauth ? 'OAuth detected' : 'Not detected')}
      ${_row('SSO / SAML',       a.auth.sso  ? 'SSO/SAML signals' : 'Not detected')}
      ${_row('MFA',              a.auth.mfa  ? '2FA/MFA detected' : 'Not detected')}
      ${_row('STATE MANAGEMENT', a.state.type)}
      ${_row('API STYLE',        a.api.style.join(', '))}
      ${_row('PUBLIC API',       a.api.publicApi ? 'API layer inferred' : 'No public API signals')}
      ${_row('WEBHOOKS',         a.api.webhooks ? 'Webhook support inferred' : 'Not detected')}
    `;
  }

  // ── Tab: Database ─────────────────────────────────────────
  function renderDatabaseTab(bp) {
    if (!bp) return '<div class="output-idle">[ NO DATABASE MODEL ]</div>';
    const db = bp.databaseModel;
    return `
      <div class="tab-section">
        <div class="ts-label">[ DATABASE MODEL ]</div>
      </div>
      ${_row('DATABASE TYPE', db.type)}
      ${_row('RELATIONSHIPS', db.relationships.join('<br>') || 'None inferred')}
      <div class="tab-section">
        <div class="ts-label">[ SCHEMA — ${db.entities.length} ENTITIES ]</div>
        <div class="schema-grid">
          ${(db.entities||[]).map(e => `
            <div class="schema-card">
              <div class="schema-name">${e.name}</div>
              <div class="schema-source">${e.source||'core'}</div>
              ${(e.fields||[]).map(f => `<div class="schema-field">· ${f}</div>`).join('')}
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ── Tab: UI Structure ─────────────────────────────────────
  function renderUITab(ui) {
    if (!ui) return '<div class="output-idle">[ NO UI BLUEPRINT ]</div>';
    const u = ui.uiStructure;
    const l = ui.logicFlow;
    return `
      ${_row('NAVIGATION ITEMS', (u.navigation||[]).join(' · ') || 'None extracted')}
      ${_row('DASHBOARD LAYOUT', typeof u.dashboardLayout === 'object'
        ? `${u.dashboardLayout.layout} — Panels: ${u.dashboardLayout.panels?.join(', ')}`
        : u.dashboardLayout)}
      ${_row('COMPONENT TREE', (u.componentTree||[]).map(c=>`<span class="comp-badge">${c.name}</span>`).join(' '))}
      <div class="tab-section">
        <div class="ts-label">[ PAGES — ${(u.pages||[]).length} DETECTED ]</div>
        <div class="page-grid">
          ${(u.pages||[]).map(p => `<div class="page-chip">${p.label}</div>`).join('')}
        </div>
      </div>
      <div class="tab-section">
        <div class="ts-label">[ STATE TRANSITIONS ]</div>
        ${(l.stateTransitions||[]).slice(0,12).map(t=>`<div class="transition-row">→ ${t}</div>`).join('') || '<div class="muted ts-value">None inferred</div>'}
      </div>
      ${_row('FEATURE INTERACTIONS', (l.featureInteractions||[]).join('<br>') || 'None detected')}
      ${_row('SYSTEM BEHAVIOURS', (l.systemBehaviours||[]).join('<br>') || 'None detected')}
    `;
  }

  // ── Tab: Investor Pack ────────────────────────────────────
  function renderInvestorTab(inv) {
    const m = inv.productMaturity;
    const b = inv.businessModel;
    const s = inv.scalabilitySignals;
    const p = inv.investorPitch;
    const mkt = inv.marketSignals;

    return `
      <div class="tab-section investor-disclaimer">⚠ ${inv.disclaimer}</div>

      <div class="tab-section">
        <div class="ts-label">[ EXECUTIVE SUMMARY ]</div>
        <div class="ts-value pitch-text">${inv.executiveSummary?.oneLiner || ''}</div>
      </div>
      ${_row('VALUE PROPOSITION', inv.executiveSummary?.valueProposition)}
      ${_row('WHAT MAKES IT VALUABLE', inv.executiveSummary?.whatMakesItValuable)}

      <div class="tab-section">
        <div class="ts-label">[ PROBLEM & SOLUTION ]</div>
      </div>
      ${_row('PROBLEM',    inv.problemSolution?.problem)}
      ${_row('SOLUTION',   inv.problemSolution?.solution)}
      ${_row('DIFFERENTIATORS', (inv.problemSolution?.keyDifferentiators||[]).join('<br>'))}

      <div class="tab-section">
        <div class="ts-label">[ PRODUCT MATURITY ]</div>
      </div>
      ${_row('MATURITY TIER',     `<span class="maturity-badge maturity-${(m.tier||'').replace(/[\s+]/g,'-').toLowerCase()}">${m.tier}</span>`)}
      ${_row('COMPLEXITY SCORE',  `${m.complexityScore}/13 — ${m.complexity}`)}
      ${_row('COMPLETE',          (m.complete||[]).join(' · '))}
      ${_row('MISSING',           (m.missing||[]).join(' · '))}

      <div class="tab-section">
        <div class="ts-label">[ MARKET SIGNALS ]</div>
      </div>
      ${_row('CATEGORY',            mkt.productCategory)}
      ${_row('MARKET POSITIONING',  mkt.positioning)}
      ${_row('BUYER SEGMENT',       mkt.buyerSegment)}
      ${_row('LIKELY COMPETITORS',  mkt.likelyCompetitorCategory)}
      ${_row('ADOPTION SIGNALS',    (mkt.adoptionSignals||[]).join(' · '))}

      <div class="tab-section">
        <div class="ts-label">[ BUSINESS MODEL — INFERRED ]</div>
      </div>
      ${_row('MODELS DETECTED',    (b.models||[]).join(' · '))}
      ${_row('PRICING SIGNALS',    (b.pricingSignals||[]).join(' · ') || 'None detected')}
      ${_row('HAS PRICING PAGE',   b.hasPricingPage ? 'Yes' : 'Not detected')}
      ${_row('REVENUE HYPOTHESIS', `<span class="inference-tag">${b.revenueHypothesis}</span>`)}

      <div class="tab-section">
        <div class="ts-label">[ SCALABILITY SIGNALS ]</div>
      </div>
      ${_row('MVP EVIDENCE',           (s.mvpEvidence||[]).join('<br>'))}
      ${_row('SCALABILITY INDICATORS', (s.scalabilityIndicators||[]).join('<br>'))}
      ${_row('ENGINEERING MATURITY',   s.engineeringMaturity)}

      <div class="tab-section">
        <div class="ts-label">[ INVESTOR PITCH ]</div>
      </div>
      <div class="tab-section">
        <div class="pitch-block">${p?.sixtySecondPitch || ''}</div>
      </div>
      ${_row('WHY IT MATTERS',     p?.whyItMatters)}
      ${_row('WHY IT COULD SCALE', p?.whyItCouldScale)}

      ${_row('INFERENCE CONFIDENCE', `<span class="confidence-${inv.inferenceScore.score>=80?'high':inv.inferenceScore.score>=50?'med':'low'}">${inv.inferenceScore.label} (${inv.inferenceScore.score}/100)</span>`)}
    `;
  }

  // ── Tab: Ingestion Status ─────────────────────────────────
  function renderStatusTab(snap, model) {
    const job  = activeJobId ? URLIngestionEngine.getJobById(activeJobId) : null;
    const gates = activeJobId ? URLIngestionEngine.runValidationGates(activeJobId) : null;

    return `
      <div class="tab-section">
        <div class="ts-label">[ INGESTION STATUS ]</div>
      </div>
      ${_row('JOB ID',         job?.id || '—')}
      ${_row('URL',            snap?.url || '—')}
      ${_row('STATUS',         `<span class="status-pill status-compiled">COMPILED</span>`)}
      ${_row('CRAWLED AT',     snap?.crawledAt ? new Date(snap.crawledAt).toLocaleString() : '—')}
      ${_row('HTTP STATUS',    snap?.httpStatus || '—')}
      ${_row('HTML SIZE',      snap?.htmlLength ? `${(snap.htmlLength/1024).toFixed(1)} KB` : '—')}
      ${_row('TEXT EXTRACTED', snap?.textLength ? `${snap.textLength} chars` : '—')}
      ${_row('LINKS FOUND',    snap?.links?.length || 0)}
      ${_row('FORMS FOUND',    snap?.forms?.length || 0)}
      ${_row('PRICING SIGNALS',snap?.pricingSignals?.length || 0)}
      ${_row('API SIGNALS',    snap?.apiSignals?.length || 0)}
      ${_row('MODEL VERSION',  model?.version || 1)}
      <div class="tab-section">
        <div class="ts-label">[ VALIDATION GATES ]</div>
        ${gates?.pass
          ? '<div class="gate-pass">✓ ALL VALIDATION GATES PASSED</div>'
          : (gates?.failures||[]).map(f=>`<div class="gate-fail">✗ ${f}</div>`).join('')}
      </div>
    `;
  }

  // ── Helpers ───────────────────────────────────────────────
  function _row(label, value) {
    if (!value && value !== 0) return '';
    return `
      <div class="ts-row">
        <div class="ts-label">[ ${label} ]</div>
        <div class="ts-value">${value}</div>
      </div>`;
  }

  function showLog(msg, type = 'info') {
    const logEl = document.getElementById('url-log');
    if (!logEl) return;
    const line = document.createElement('div');
    line.className = `log-line log-${type}`;
    line.textContent = msg;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function clearLog() {
    const logEl = document.getElementById('url-log');
    if (logEl) logEl.innerHTML = '';
  }

  function clearOutputPanel() {
    const panel = document.getElementById('url-output-content');
    if (panel) { panel.innerHTML = ''; panel.classList.add('hidden'); }
  }

  function deleteJob(event, jobId) {
    event.stopPropagation();
    if (!confirm('Delete this analysis job and all associated data?')) return;
    URLIngestionEngine.deleteJob(jobId);
    if (activeJobId === jobId) {
      activeJobId = null;
      clearOutputPanel();
      document.getElementById('url-output-placeholder')?.classList.remove('hidden');
    }
    renderJobList();
  }

  function init() {
    renderJobList();
  }

  return { init, renderJobList, submitUrl, loadJob, showTab, deleteJob };
})();

window.URLIntelligenceView = URLIntelligenceView;
