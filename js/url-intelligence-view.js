// ============================================================
// AP3X — URL INTELLIGENCE VIEW CONTROLLER v2.0
// SYSTEM INTELLIGENCE REVERSE-ENGINEERING ENGINE
// 10 analysis tabs — all 7 layers of intelligence
// ============================================================

const URLIntelligenceView = (() => {

  let activeJobId = null;

  // ── Render job list ───────────────────────────────────────
  function renderJobList() {
    const jobs = URLIngestionEngine.getAllJobs().slice().reverse();
    const el   = document.getElementById('url-job-list');
    if (!el) return;

    if (jobs.length === 0) {
      el.innerHTML = '<div class="empty-state">[ NO ANALYSIS JOBS — SUBMIT A URL ABOVE ]</div>';
      return;
    }

    el.innerHTML = jobs.map(j => {
      const cls    = { queued:'status-queued', crawling:'status-crawling', processing:'status-processing', compiled:'status-compiled', error:'status-error' }[j.status] || '';
      const domain = (() => { try { return new URL(j.url).hostname; } catch { return j.url; } })();
      return `
        <div class="job-card ${j.id === activeJobId ? 'active' : ''}" onclick="URLIntelligenceView.loadJob('${j.id}')">
          <div class="job-card-header">
            <span class="job-status-dot ${cls}"></span>
            <span class="job-domain">${domain}</span>
            <span class="job-status-label ${cls}">${j.status.toUpperCase()}</span>
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
    const url     = inputEl?.value?.trim();
    if (!url) { showLog('[ERROR] No URL entered', 'error'); return; }

    clearLog();
    showLog(`[ INIT ] Creating ingestion job for: ${url}`, 'info');

    const result = URLIngestionEngine.createJob(url);
    if (!result.success) { showLog(`[ ERROR ] ${result.error}`, 'error'); return; }

    activeJobId = result.job.id;
    renderJobList();
    showLog(`[ JOB CREATED ] ${result.job.id}`, 'info');
    clearOutputPanel();
    document.getElementById('url-output-placeholder')?.classList.remove('hidden');

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
      const ph = document.getElementById('url-output-placeholder');
      if (ph) { ph.innerHTML = `<div class="output-idle">[ JOB STATUS: ${job.status.toUpperCase()} ]<br>${job.progress?.message || ''}</div>`; ph.classList.remove('hidden'); }
      return;
    }

    const snap   = AP3X_Storage.getRecord('site_snapshots',         jobId);
    const model  = AP3X_Storage.getRecord('site_models',            jobId);
    const spec   = AP3X_Storage.getRecord('project_specs',          jobId);
    const bp     = AP3X_Storage.getRecord('system_blueprints',      jobId);
    const ui     = AP3X_Storage.getRecord('ui_blueprints',          jobId);
    const inv    = AP3X_Storage.getRecord('investor_packs',         jobId);
    const com    = AP3X_Storage.getRecord('commercial_models',      jobId);
    const mat    = AP3X_Storage.getRecord('maturity_scores',        jobId);
    const rep    = AP3X_Storage.getRecord('replication_blueprints', jobId);
    const clDom  = AP3X_Storage.getRecord('clone_dom_structures',   jobId);
    const clStr  = AP3X_Storage.getRecord('clone_structural_models',jobId);
    const clSys  = AP3X_Storage.getRecord('clone_system_designs',   jobId);
    const clPrm  = AP3X_Storage.getRecord('clone_prompts',          jobId);
    const clPwa  = AP3X_Storage.getRecord('clone_pwa_scaffolds',    jobId);

    if (!spec || !inv) { showLog('[ERROR] Records missing from SSOT', 'error'); return; }
    renderOutputPanel(snap, model, spec, bp, ui, inv, com, mat, rep, clDom, clStr, clSys, clPrm, clPwa);
  }

  // ── Output Panel ──────────────────────────────────────────
  function renderOutputPanel(snap, model, spec, bp, ui, inv, com, mat, rep, clDom, clStr, clSys, clPrm, clPwa) {
    const ph    = document.getElementById('url-output-placeholder');
    const panel = document.getElementById('url-output-content');
    if (ph) ph.classList.add('hidden');
    if (!panel) return;
    panel.classList.remove('hidden');

    const confScore = inv.inferenceScore?.score || 0;
    const confClass = confScore >= 80 ? 'high' : confScore >= 50 ? 'med' : 'low';

    panel.innerHTML = `
      <div class="intel-header">
        <div class="intel-title">${spec.productName}</div>
        <div class="intel-meta">
          <span class="intel-cat">${spec.category}</span>
          <span class="intel-url">${snap.url}</span>
          <span class="intel-conf intel-conf-${confClass}">${inv.inferenceScore?.label || 'Inferred'}</span>
        </div>
      </div>

      <div class="intel-tabs">
        <button class="intel-tab active" onclick="URLIntelligenceView.showTab('summary',this)">SUMMARY</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('tech',this)">TECH STACK</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('ai',this)">AI AGENTS</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('dataflow',this)">DATA FLOW</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('commercial',this)">COMMERCIAL</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('maturity',this)">MATURITY</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('blueprint',this)">BLUEPRINT</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('product',this)">PRODUCT</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('investor',this)">INVESTOR</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('cloner',this)">⬡ CLONER</button>
        <button class="intel-tab" onclick="URLIntelligenceView.showTab('status',this)">STATUS</button>
      </div>

      <div id="tab-summary"    class="tab-content active">${renderSummaryTab(snap, model, spec, inv, mat)}</div>
      <div id="tab-tech"       class="tab-content hidden">${renderTechStackTab(model, bp)}</div>
      <div id="tab-ai"         class="tab-content hidden">${renderAIAgentTab(model)}</div>
      <div id="tab-dataflow"   class="tab-content hidden">${renderDataFlowTab(model)}</div>
      <div id="tab-commercial" class="tab-content hidden">${renderCommercialTab(com)}</div>
      <div id="tab-maturity"   class="tab-content hidden">${renderMaturityTab(mat)}</div>
      <div id="tab-blueprint"  class="tab-content hidden">${renderBlueprintTab(rep)}</div>
      <div id="tab-product"    class="tab-content hidden">${renderProductTab(spec, ui)}</div>
      <div id="tab-investor"   class="tab-content hidden">${renderInvestorTab(inv)}</div>
      <div id="tab-cloner"     class="tab-content hidden">${renderClonerTab(clDom, clStr, clSys, clPrm, clPwa)}</div>
      <div id="tab-status"     class="tab-content hidden">${renderStatusTab(snap, model)}</div>
    `;
  }

  function showTab(name, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.intel-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${name}`)?.classList.remove('hidden');
    btn?.classList.add('active');
  }

  // ════════════════════════════════════════════════════════════
  // TAB: EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════════
  function renderSummaryTab(snap, model, spec, inv, mat) {
    const scores  = mat?.scores || {};
    const overall = mat?.overall || { score: '?', label: 'Pending' };
    const ai      = model?.aiAgentModel || {};
    const tech    = model?.techStack || {};

    return `
      <div class="summary-hero">
        <div class="sh-name">${spec.productName}</div>
        <div class="sh-category">${spec.category}</div>
        <div class="sh-desc">${spec.whatItDoes || ''}</div>
      </div>

      <div class="tab-grid-5">
        ${Object.entries(scores).map(([key, s]) => `
          <div class="tab-stat-card score-card score-${_scoreClass(s.score)}">
            <div class="tsc-val">${s.score}<span class="tsc-denom">/10</span></div>
            <div class="tsc-label">${_scoreKey(key)}</div>
          </div>`).join('')}
      </div>

      ${_row('OVERALL MATURITY', `<span class="maturity-badge">${overall.label}</span> (${overall.score}/10)`)}
      ${_row('PROBLEM SOLVED',   spec.problemItSolves)}
      ${_row('TARGET USERS',     (spec.targetUsers||[]).join(' · '))}
      ${_row('STACK SUMMARY',    tech.stackSummary || 'See Tech Stack tab')}
      ${_row('AI SYSTEM',        ai.detected ? `<span class="ai-badge">${ai.systemType}</span> — ${ai.summary}` : 'No AI signals detected')}
      ${_row('CORE FEATURES',    (spec.coreFeatures||[]).slice(0,6).map(f=>`<span class="feat-badge">${f.name}</span>`).join(' '))}
      ${_row('60-SEC PITCH',     inv.investorPitch?.sixtySecondPitch || '')}

      <div class="tab-section">
        <div class="ts-label">[ CONFIDENCE DISCLAIMER ]</div>
        <div class="ts-value muted">${inv.disclaimer || 'All values inferred from public page signals only.'}</div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: LAYER 2 — TECHNICAL ARCHITECTURE
  // ════════════════════════════════════════════════════════════
  function renderTechStackTab(model, bp) {
    const tech = model?.techStack || {};
    const arch = bp?.architecture || {};
    const flow = bp?.architectureFlow || '';

    const _sigs = (arr) => (arr||[]).map(s => `<span class="sig-badge sig-${s.confidence}">${s.name} <span class="sig-conf">[${s.confidence}]</span></span>`).join(' ');

    return `
      <div class="tab-section">
        <div class="ts-label">[ LAYER 2 — TECHNICAL ARCHITECTURE ANALYSIS ]</div>
        <div class="ts-value muted">Every signal labelled: confirmed / likely / inferred</div>
      </div>

      <div class="tech-grid">
        <div class="tech-card">
          <div class="tc-label">FRONTEND</div>
          <div class="tc-value">${_sigs(tech.frontend?.signals)}</div>
          ${tech.frontend?.cssFramework ? `<div class="tc-sub">CSS: <span class="sig-badge sig-${tech.frontend.cssFramework.confidence}">${tech.frontend.cssFramework.name}</span></div>` : ''}
          <div class="tc-flags">
            ${tech.frontend?.ssr    ? '<span class="flag flag-on">SSR</span>' : '<span class="flag flag-off">SSR</span>'}
            ${tech.frontend?.pwa    ? '<span class="flag flag-on">PWA</span>' : '<span class="flag flag-off">PWA</span>'}
            ${tech.frontend?.mobile ? '<span class="flag flag-on">MOBILE</span>' : '<span class="flag flag-off">MOBILE</span>'}
          </div>
        </div>

        <div class="tech-card">
          <div class="tc-label">BACKEND</div>
          <div class="tc-value">${_sigs(tech.backend?.signals)}</div>
          <div class="tc-flags">
            ${tech.backend?.cache    ? '<span class="flag flag-on">CACHE</span>' : '<span class="flag flag-off">CACHE</span>'}
            ${tech.backend?.queue    ? '<span class="flag flag-on">QUEUE</span>' : '<span class="flag flag-off">QUEUE</span>'}
            ${tech.backend?.realtime ? '<span class="flag flag-on">REALTIME</span>' : '<span class="flag flag-off">REALTIME</span>'}
          </div>
        </div>

        <div class="tech-card">
          <div class="tc-label">DATABASE</div>
          <div class="tc-value">${_sigs(tech.database?.signals)}</div>
        </div>

        <div class="tech-card">
          <div class="tc-label">AUTH</div>
          <div class="tc-value">${_sigs(tech.auth?.signals)}</div>
          <div class="tc-flags">
            ${tech.auth?.oauth   ? '<span class="flag flag-on">OAUTH</span>' : ''}
            ${tech.auth?.sso     ? '<span class="flag flag-on">SSO</span>' : ''}
            ${tech.auth?.mfa     ? '<span class="flag flag-on">MFA</span>' : ''}
            ${tech.auth?.passkey ? '<span class="flag flag-on">PASSKEY</span>' : ''}
          </div>
        </div>

        <div class="tech-card">
          <div class="tc-label">HOSTING / CDN</div>
          <div class="tc-value">${_sigs(tech.hosting?.signals)}</div>
          ${tech.hosting?.cdn ? '<div class="tc-sub"><span class="flag flag-on">CDN detected</span></div>' : ''}
        </div>

        <div class="tech-card">
          <div class="tc-label">API</div>
          <div class="tc-value">${_sigs(tech.api?.style)}</div>
          <div class="tc-flags">
            ${tech.api?.hasPublicApi ? '<span class="flag flag-on">PUBLIC API</span>' : '<span class="flag flag-off">PUBLIC API</span>'}
            ${tech.api?.hasSDK       ? '<span class="flag flag-on">SDK</span>' : ''}
          </div>
        </div>

        <div class="tech-card">
          <div class="tc-label">STATE</div>
          <div class="tc-value">${_sigs(tech.state?.signals)}</div>
        </div>
      </div>

      ${flow ? `<div class="tab-section"><div class="ts-label">[ ARCHITECTURE FLOW ]</div><pre class="arch-diagram">${flow}</pre></div>` : ''}

      <div class="tab-section">
        <div class="ts-label">[ DATABASE SCHEMA — ${(bp?.databaseModel?.entities||[]).length} ENTITIES ]</div>
        <div class="schema-grid">
          ${(bp?.databaseModel?.entities||[]).map(e => `
            <div class="schema-card">
              <div class="schema-name">${e.name}</div>
              <div class="schema-source">${e.source||'inferred'}</div>
              ${(e.fields||[]).map(f => `<div class="schema-field">· ${f}</div>`).join('')}
            </div>`).join('')}
        </div>
      </div>
      ${_row('DB RELATIONSHIPS', (bp?.databaseModel?.relationships||[]).join('<br>') || 'None inferred')}
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: LAYER 3 — AI AGENT MODEL
  // ════════════════════════════════════════════════════════════
  function renderAIAgentTab(model) {
    const ai = model?.aiAgentModel || {};

    if (!ai.detected) {
      return `
        <div class="tab-section">
          <div class="ts-label">[ LAYER 3 — AI & AGENT SYSTEM DETECTION ]</div>
          <div class="ts-value muted">No AI or agent system signals detected on this page.</div>
          <div class="ts-value muted">This may indicate a non-AI product, or AI signals are not publicly exposed.</div>
        </div>`;
    }

    return `
      <div class="tab-section">
        <div class="ts-label">[ LAYER 3 — AI & AGENT SYSTEM DETECTION ]</div>
        <div class="ts-value"><span class="ai-badge ai-badge-${ai.confidence}">${ai.systemType}</span></div>
        <div class="ts-value muted">Confidence: ${ai.confidence}</div>
      </div>

      <div class="tab-grid-3">
        <div class="tab-stat-card">
          <div class="tsc-val">${ai.agentCount || 0}</div>
          <div class="tsc-label">AGENT ROLES</div>
        </div>
        <div class="tab-stat-card">
          <div class="tsc-val">${(ai.llmProviders||[]).length}</div>
          <div class="tsc-label">LLM PROVIDERS</div>
        </div>
        <div class="tab-stat-card">
          <div class="tsc-val">${(ai.triggerTypes||[]).length}</div>
          <div class="tsc-label">TRIGGER TYPES</div>
        </div>
      </div>

      <div class="tab-section">
        <div class="ts-label">[ AGENT ROLES ]</div>
        ${(ai.agentRoles||[]).map(r => `
          <div class="agent-role-row">
            <span class="agent-role-name">${r.role}</span>
            <span class="agent-role-type">${r.type}</span>
            <span class="sig-conf">[${r.confidence}]</span>
          </div>`).join('') || '<div class="muted ts-value">No specific agent roles detected</div>'}
      </div>

      ${_row('LLM PROVIDERS', (ai.llmProviders||[]).map(l=>`<span class="sig-badge sig-${l.confidence}">${l.name} [${l.confidence}]</span>`).join(' ') || 'Not detected')}
      ${_row('TRIGGER TYPES', (ai.triggerTypes||[]).join(' · '))}

      <div class="tab-section">
        <div class="ts-label">[ AI CAPABILITIES ]</div>
        <div class="capability-grid">
          ${_capFlag('RAG / Vector Search',     ai.capabilities?.rag)}
          ${_capFlag('Tool / Function Calling', ai.capabilities?.toolUse)}
          ${_capFlag('Long-term Memory',        ai.capabilities?.memory)}
          ${_capFlag('Streaming Responses',     ai.capabilities?.streaming)}
          ${_capFlag('Fine-tuning Signals',     ai.capabilities?.fineTuning)}
        </div>
      </div>

      ${ai.interactionFlow ? `<div class="tab-section"><div class="ts-label">[ INTERACTION FLOW DIAGRAM ]</div><pre class="arch-diagram">${ai.interactionFlow}</pre></div>` : ''}
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: LAYER 4 — DATA FLOW MODEL
  // ════════════════════════════════════════════════════════════
  function renderDataFlowTab(model) {
    const df = model?.dataFlowModel || {};

    return `
      <div class="tab-section">
        <div class="ts-label">[ LAYER 4 — DATA FLOW & INTELLIGENCE LOOP ]</div>
      </div>

      <div class="tab-section">
        <div class="ts-label">[ DATA INPUTS ]</div>
        ${(df.inputs||[]).map(i => `
          <div class="flow-row">
            <span class="flow-type">${i.type}</span>
            <span class="flow-detail">${i.detail}</span>
            <span class="sig-conf">[${i.confidence}]</span>
          </div>`).join('') || '<div class="muted ts-value">None detected</div>'}
      </div>

      <div class="tab-section">
        <div class="ts-label">[ PROCESSING LAYERS ]</div>
        ${(df.processing||[]).map(p => `<div class="flow-row"><span class="flow-item">◈ ${p}</span></div>`).join('') || '<div class="muted ts-value">None detected</div>'}
      </div>

      <div class="tab-section">
        <div class="ts-label">[ STORAGE BEHAVIOUR ]</div>
        ${(df.storage||[]).map(s => `
          <div class="flow-row">
            <span class="flow-type">${s.type}</span>
            <span class="flow-detail">${s.detail}</span>
            <span class="sig-conf">[${s.confidence}]</span>
          </div>`).join('') || '<div class="muted ts-value">None detected</div>'}
      </div>

      ${_row('REAL-TIME SYSTEM', df.isRealtime ? '<span class="flag flag-on">REAL-TIME DATA SYNC INFERRED</span>' : 'Static / request-response system (inferred)')}

      <div class="tab-section">
        <div class="ts-label">[ FEEDBACK LOOPS ]</div>
        ${(df.feedbackLoops||[]).map(f => `
          <div class="flow-row">
            <span class="flow-type">↺ ${f.type}</span>
            <span class="flow-detail">${f.detail}</span>
            <span class="sig-conf">[${f.confidence}]</span>
          </div>`).join('') || '<div class="muted ts-value">No feedback loop signals detected</div>'}
      </div>

      <div class="tab-section">
        <div class="ts-label">[ TELEMETRY & ANALYTICS ]</div>
        ${(df.telemetry||[]).map(t => `<span class="feat-badge">${t.name} [${t.confidence}]</span> `).join('') || '<div class="muted ts-value">No telemetry detected</div>'}
      </div>

      ${df.flowDiagram ? `<div class="tab-section"><div class="ts-label">[ DATA FLOW DIAGRAM ]</div><pre class="arch-diagram">${df.flowDiagram}</pre></div>` : ''}
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: LAYER 5 — COMMERCIAL MODEL
  // ════════════════════════════════════════════════════════════
  function renderCommercialTab(com) {
    if (!com) return '<div class="output-idle">[ COMMERCIAL MODEL NOT AVAILABLE ]</div>';

    return `
      <div class="tab-section">
        <div class="ts-label">[ LAYER 5 — COMMERCIAL & PRODUCT MODEL ]</div>
      </div>

      <div class="tab-section">
        <div class="ts-label">[ BUSINESS MODELS DETECTED ]</div>
        ${(com.models||[]).map(m => `
          <div class="flow-row">
            <span class="feat-badge">${m.model}</span>
            <span class="sig-conf">[${m.confidence}]</span>
          </div>`).join('')}
      </div>

      ${_row('REVENUE HYPOTHESIS', `<span class="inference-tag">${com.revenueHypothesis}</span>`)}

      <div class="tab-section">
        <div class="ts-label">[ MONETISATION SIGNALS ]</div>
        <div class="capability-grid">
          ${_capFlag('Pricing page',       com.monetisation?.hasPricingPage)}
          ${_capFlag('Free trial',         com.monetisation?.freeTrial)}
          ${_capFlag('Freemium tier',      com.monetisation?.freemium)}
          ${_capFlag('Enterprise sales',   com.monetisation?.enterpriseSales)}
          ${_capFlag('Self-serve signup',  com.monetisation?.selfServe)}
          ${_capFlag('Annual discount',    com.monetisation?.annualDiscount)}
        </div>
      </div>

      ${com.monetisation?.pricingSignals?.length ? _row('PRICING SIGNALS', com.monetisation.pricingSignals.join(' · ')) : ''}

      <div class="tab-section">
        <div class="ts-label">[ USER ACQUISITION STRATEGY ]</div>
        ${(com.acquisition||[]).map(a => `
          <div class="flow-row">
            <span class="flow-type">${a.channel}</span>
            <span class="sig-conf">[${a.confidence}]</span>
          </div>`).join('') || '<div class="muted ts-value">Not detectable from public signals</div>'}
      </div>

      <div class="tab-section">
        <div class="ts-label">[ SCALING APPROACH ]</div>
        ${(com.scaling||[]).map(s => `<div class="flow-row"><span class="flow-item">◈ ${s}</span></div>`).join('') || '<div class="muted ts-value">Not directly observable</div>'}
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: LAYER 6 — MATURITY SCORES
  // ════════════════════════════════════════════════════════════
  function renderMaturityTab(mat) {
    if (!mat) return '<div class="output-idle">[ MATURITY SCORES NOT AVAILABLE ]</div>';
    const scores  = mat.scores || {};
    const overall = mat.overall || {};

    return `
      <div class="tab-section">
        <div class="ts-label">[ LAYER 6 — SYSTEM MATURITY SCORES ]</div>
        <div class="ts-value muted">${mat.disclaimer || ''}</div>
      </div>

      <div class="maturity-overall">
        <div class="mo-score">${overall.score}<span class="mo-denom">/10</span></div>
        <div class="mo-label">${overall.label}</div>
      </div>

      <div class="maturity-bars">
        ${Object.entries(scores).map(([key, s]) => `
          <div class="maturity-row">
            <div class="maturity-key">${_scoreKey(key)}</div>
            <div class="maturity-bar-wrap">
              <div class="maturity-bar-fill score-fill-${_scoreClass(s.score)}" style="width:${s.score*10}%"></div>
            </div>
            <div class="maturity-score-num">${s.score}/10</div>
            <div class="maturity-label-text">${s.label}</div>
          </div>
          <div class="maturity-note">${s.note}</div>`).join('')}
      </div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: LAYER 7 — REPLICATION BLUEPRINT
  // ════════════════════════════════════════════════════════════
  function renderBlueprintTab(rep) {
    if (!rep) return '<div class="output-idle">[ REPLICATION BLUEPRINT NOT AVAILABLE ]</div>';

    return `
      <div class="tab-section">
        <div class="ts-label">[ LAYER 7 — REPLICATION BLUEPRINT ]</div>
        <div class="ts-value pitch-text">${rep.howToRebuild || ''}</div>
      </div>

      <div class="tab-section">
        <div class="ts-label">[ RECOMMENDED STACK ]</div>
        <div class="stack-grid">
          ${Object.entries(rep.recommendedStack || {}).filter(([,v])=>v&&v!=='N/A').map(([k,v]) => `
            <div class="stack-card">
              <div class="sc-layer">${k.toUpperCase()}</div>
              <div class="sc-value">${v}</div>
            </div>`).join('')}
        </div>
      </div>

      ${rep.architectureOverview ? `<div class="tab-section"><div class="ts-label">[ ARCHITECTURE OVERVIEW ]</div><pre class="arch-diagram">${rep.architectureOverview}</pre></div>` : ''}

      <div class="tab-section">
        <div class="ts-label">[ REQUIRED COMPONENTS ]</div>
        <div class="component-list">
          ${(rep.components||[]).map(c => `
            <div class="component-row priority-${c.priority}">
              <span class="comp-layer">${c.layer}</span>
              <span class="comp-name">${c.component}</span>
              <span class="comp-priority priority-badge-${c.priority}">${c.priority.toUpperCase()}</span>
              <span class="comp-notes">${c.notes}</span>
            </div>`).join('')}
        </div>
      </div>

      <div class="tab-section">
        <div class="ts-label">[ MVP BUILD PHASES ]</div>
        ${['phase1','phase2','phase3'].map(ph => {
          const p = rep.mvpStructure?.[ph];
          if (!p) return '';
          return `
            <div class="phase-block">
              <div class="phase-name">${ph.toUpperCase()}: ${p.name}</div>
              ${(p.items||[]).map(i => `<div class="phase-item">▸ ${i}</div>`).join('')}
            </div>`;
        }).join('')}
      </div>

      ${rep.effort ? `
        <div class="tab-section">
          <div class="ts-label">[ EFFORT ESTIMATE ]</div>
          ${_row('SOLO DEVELOPER', rep.effort.solo)}
          ${_row('3-PERSON TEAM',  rep.effort.team)}
          ${_row('COMPLEXITY',     rep.effort.complexity)}
          <div class="ts-value muted">${rep.effort.notes}</div>
        </div>` : ''}

      <div class="tab-section investor-disclaimer">⚠ ${rep.disclaimer || ''}</div>
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: PRODUCT SPEC (preserved from v1)
  // ════════════════════════════════════════════════════════════
  function renderProductTab(spec, ui) {
    const u = ui?.uiStructure || {};
    const l = ui?.logicFlow || {};
    return `
      ${_row('PRODUCT NAME',      spec.productName)}
      ${_row('CATEGORY',          spec.category)}
      ${_row('WHAT IT DOES',      spec.whatItDoes)}
      ${_row('PROBLEM IT SOLVES', spec.problemItSolves)}
      ${_row('TARGET USERS',      (spec.targetUsers||[]).join(' · '))}
      ${_row('CORE FEATURES',     (spec.coreFeatures||[]).map(f=>`<span class="feat-badge">${f.name} <span class="feat-type">${f.type}</span></span>`).join(' '))}
      <div class="tab-section">
        <div class="ts-label">[ USER JOURNEYS ]</div>
        ${(spec.userJourneys||[]).map(j => `
          <div class="journey-row">
            <div class="journey-name">${j.name}</div>
            <div class="journey-steps">${j.steps.map((s,i)=>`<span class="step">${i===0?'':' → '}${s}</span>`).join('')}</div>
          </div>`).join('') || '<div class="muted ts-value">None inferred</div>'}
      </div>
      ${_row('NAVIGATION',    (u.navigation||[]).join(' · '))}
      ${_row('COMPONENTS',    (u.componentTree||[]).map(c=>`<span class="comp-badge">${c.name}</span>`).join(' '))}
      <div class="tab-section">
        <div class="ts-label">[ PAGES — ${(u.pages||[]).length} ]</div>
        <div class="page-grid">${(u.pages||[]).map(p=>`<div class="page-chip">${p.label}</div>`).join('')}</div>
      </div>
      ${_row('STATE TRANSITIONS',  (l.stateTransitions||[]).slice(0,8).map(t=>`<div class="transition-row">→ ${t}</div>`).join('') || 'None inferred')}
      ${_row('SYSTEM BEHAVIOURS',  (l.systemBehaviours||[]).join('<br>') || 'None detected')}
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: INVESTOR PACK (preserved from v1)
  // ════════════════════════════════════════════════════════════
  function renderInvestorTab(inv) {
    const m   = inv.productMaturity || {};
    const b   = inv.businessModel || {};
    const s   = inv.scalabilitySignals || {};
    const p   = inv.investorPitch || {};
    const mkt = inv.marketSignals || {};

    return `
      <div class="tab-section investor-disclaimer">⚠ ${inv.disclaimer}</div>
      <div class="tab-section">
        <div class="ts-label">[ EXECUTIVE SUMMARY ]</div>
        <div class="ts-value pitch-text">${inv.executiveSummary?.oneLiner || ''}</div>
      </div>
      ${_row('VALUE PROPOSITION',     inv.executiveSummary?.valueProposition)}
      ${_row('WHAT MAKES IT VALUABLE',inv.executiveSummary?.whatMakesItValuable)}
      ${_row('PROBLEM',               inv.problemSolution?.problem)}
      ${_row('SOLUTION',              inv.problemSolution?.solution)}
      ${_row('DIFFERENTIATORS',       (inv.problemSolution?.keyDifferentiators||[]).join('<br>'))}
      ${_row('MATURITY TIER',         `<span class="maturity-badge maturity-${(m.tier||'').replace(/[\s+]/g,'-').toLowerCase()}">${m.tier}</span>`)}
      ${_row('COMPLETE',              (m.complete||[]).join(' · '))}
      ${_row('MISSING',               (m.missing||[]).join(' · '))}
      ${_row('MARKET POSITIONING',    mkt.positioning)}
      ${_row('BUYER SEGMENT',         mkt.buyerSegment)}
      ${_row('LIKELY COMPETITORS',    mkt.likelyCompetitorCategory)}
      ${_row('ADOPTION SIGNALS',      (mkt.adoptionSignals||[]).join(' · '))}
      ${_row('BUSINESS MODELS',       (b.models||[]).join(' · '))}
      ${_row('PRICING SIGNALS',       (b.pricingSignals||[]).join(' · ') || 'None detected')}
      ${_row('REVENUE HYPOTHESIS',    `<span class="inference-tag">${b.revenueHypothesis||''}</span>`)}
      ${_row('MVP EVIDENCE',          (s.mvpEvidence||[]).join('<br>'))}
      ${_row('SCALABILITY',           (s.scalabilityIndicators||[]).join('<br>'))}
      <div class="tab-section">
        <div class="ts-label">[ 60-SECOND PITCH ]</div>
        <div class="pitch-block">${p.sixtySecondPitch || ''}</div>
      </div>
      ${_row('WHY IT MATTERS',     p.whyItMatters)}
      ${_row('WHY IT COULD SCALE', p.whyItCouldScale)}
      ${_row('CONFIDENCE',         `<span class="confidence-${inv.inferenceScore?.score>=80?'high':inv.inferenceScore?.score>=50?'med':'low'}">${inv.inferenceScore?.label} (${inv.inferenceScore?.score}/100)</span>`)}
    `;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: INGESTION STATUS
  // ════════════════════════════════════════════════════════════
  function renderStatusTab(snap, model) {
    const job   = activeJobId ? URLIngestionEngine.getJobById(activeJobId) : null;
    const gates = activeJobId ? URLIngestionEngine.runValidationGates(activeJobId) : null;
    return `
      ${_row('JOB ID',          job?.id || '—')}
      ${_row('URL',             snap?.url || '—')}
      ${_row('STATUS',          '<span class="status-pill status-compiled">COMPILED</span>')}
      ${_row('CRAWLED AT',      snap?.crawledAt ? new Date(snap.crawledAt).toLocaleString() : '—')}
      ${_row('HTTP STATUS',     snap?.httpStatus || '—')}
      ${_row('HTML SIZE',       snap?.htmlLength ? `${(snap.htmlLength/1024).toFixed(1)} KB` : '—')}
      ${_row('TEXT EXTRACTED',  snap?.textLength ? `${snap.textLength} chars` : '—')}
      ${_row('LINKS FOUND',     snap?.links?.length || 0)}
      ${_row('FORMS FOUND',     snap?.forms?.length || 0)}
      ${_row('PRICING SIGNALS', snap?.pricingSignals?.length || 0)}
      ${_row('API SIGNALS',     snap?.apiSignals?.length || 0)}
      ${_row('SITE MODEL V',    model?.version || 1)}
      ${_row('AI DETECTED',     model?.aiAgentModel?.detected ? `Yes — ${model.aiAgentModel.systemType}` : 'No')}
      <div class="tab-section">
        <div class="ts-label">[ VALIDATION GATES ]</div>
        ${gates?.pass
          ? '<div class="gate-pass">✓ ALL VALIDATION GATES PASSED</div>'
          : (gates?.failures||[]).map(f=>`<div class="gate-fail">✗ ${f}</div>`).join('')}
      </div>`;
  }

  // ════════════════════════════════════════════════════════════
  // TAB: SITE → SYSTEM CLONER (Module 6)
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  // TAB: SITE → SYSTEM CLONER (Module 6)
  // ════════════════════════════════════════════════════════════
  function renderClonerTab(clDom, clStr, clSys, clPrm, clPwa) {
    if (!clPrm && !clPwa) {
      return '<div class="output-idle">[ CLONER MODULE — NO DATA. RE-ANALYSE URL TO GENERATE. ]</div>';
    }

    const flows      = (clStr && clStr.userFlowMap)      || [];
    const features   = (clStr && clStr.featureMap)       || [];
    const layers     = (clSys && clSys.layeredArchitecture) || [];
    const contract   = (clSys && clSys.apiContract)      || {};
    const logic      = (clStr && clStr.logicSeparation) || (clSys && clSys.logicSeparation) || {};
    const ssot       = (clSys && clSys.ssotDataModel)    || {};
    const pwaFiles   = (clPwa && clPwa.files)            || {};
    const domSigs    = (clDom && clDom.domSignals)       || {};
    const components = (clDom && clDom.componentGraph && clDom.componentGraph.nodes) || [];
    const pageTree   = (clDom && clDom.pageTree)         || {};
    const interactions = ((clDom && clDom.interactionPoints) || []).slice(0, 12);

    var firstFileKey  = Object.keys(pwaFiles)[0] || '';
    var firstFileCont = firstFileKey ? _escapeHtml((pwaFiles[firstFileKey] || {}).content || '') : '';
    var fileTabsHtml  = Object.keys(pwaFiles).map(function(fname, i) {
      return '<button class="file-tab ' + (i===0?'active':'') + '" onclick="URLIntelligenceView.showFile(\'' + fname + '\',this)">' + fname + '</button>';
    }).join('');

    var stageHtml = [
      _stageCard('1','DOM EXTRACTION',   clDom ? 'complete':'pending', components.length + ' components · ' + (pageTree.totalPages||0) + ' pages'),
      _stageCard('2','STRUCTURAL MODEL', clStr ? 'complete':'pending', flows.length + ' flows · ' + features.length + ' features mapped'),
      _stageCard('3','SYSTEM DESIGN',    clSys ? 'complete':'pending', layers.length + ' layers · ' + ((contract.endpoints||[]).length) + ' endpoints'),
      _stageCard('4','CLONE PROMPT',     clPrm ? 'complete':'pending', (clPrm&&clPrm.sections||0) + ' sections · ' + (clPrm&&clPrm.promptLength||0) + ' chars'),
      _stageCard('5','PWA SCAFFOLD',     clPwa ? 'complete':'pending', Object.keys(pwaFiles).length + ' files · deploy-ready')
    ].join('');

    var compHtml = components.map(function(c) {
      return '<div class="comp-chip comp-' + (c.type||'') + '">' + c.name + ' <span class="comp-src">' + (c.source||'') + '</span></div>';
    }).join('') || '<span class="muted">None extracted</span>';

    var flagsHtml = [
      _domFlag('Service Worker', domSigs.hasServiceWorker),
      _domFlag('PWA Manifest',   domSigs.hasManifest),
      _domFlag('Lazy Load',      domSigs.hasLazyLoad),
      _domFlag('Dark Mode',      domSigs.hasDarkMode),
      _domFlag('i18n',           domSigs.hasI18n),
      _domFlag('Accessibility',  domSigs.hasAccessibility),
      _domFlag('Animations',     domSigs.hasAnimations),
      _domFlag('Modal System',   domSigs.hasModalSystem)
    ].join('');

    var interactionHtml = interactions.map(function(i) {
      return '<div class="interaction-row">' +
        '<span class="int-element">' + (i.element||'') + '</span>' +
        '<span class="int-trigger">' + (i.trigger||'').toUpperCase() + '</span>' +
        '<span class="int-label">' + ((i.label||i.action||'').slice(0,30)) + '</span>' +
        '<span class="int-arrow">→</span>' +
        '<span class="int-result">' + (i.result||'') + '</span>' +
        '</div>';
    }).join('') || '<div class="muted ts-value">None mapped</div>';

    var flowsHtml = flows.map(function(f) {
      var stepsHtml = (f.steps||[]).map(function(s) {
        return '<div class="fb-step">' +
          '<span class="step-num">' + s.step + '</span>' +
          '<span class="step-action">' + s.action + '</span>' +
          '<span class="step-arrow">→</span>' +
          '<span class="step-result">' + s.result + '</span>' +
          '</div>';
      }).join('');
      return '<div class="flow-block">' +
        '<div class="fb-name">' + f.name + '</div>' +
        '<div class="fb-entry">Entry: ' + f.entry + '</div>' +
        '<div class="fb-steps">' + stepsHtml + '</div>' +
        '</div>';
    }).join('') || '<div class="muted ts-value">No flows detected</div>';

    var layersHtml = layers.map(function(l) {
      var compsHtml = (l.components||[]).map(function(c) { return '<span class="layer-chip">' + c + '</span>'; }).join('');
      return '<div class="layer-row">' +
        '<div class="lr-layer">' + l.layer + '</div>' +
        '<div class="lr-tech">' + l.technology + '</div>' +
        '<div class="lr-resp">' + l.responsibility + '</div>' +
        '<div class="lr-comps">' + compsHtml + '</div>' +
        '</div>';
    }).join('');

    var uiLogicHtml  = (logic.uiLogic||[]).map(function(l) { return '<div class="lc-item">▸ ' + l + '</div>'; }).join('');
    var bizLogicHtml = (logic.businessLogic||[]).map(function(l) { return '<div class="lc-item">▸ ' + l + '</div>'; }).join('');
    var stLogicHtml  = (logic.stateLogic||[]).map(function(l) { return '<div class="lc-item">▸ ' + l + '</div>'; }).join('');

    var apiHtml = '';
    if ((contract.endpoints||[]).length > 0) {
      var endpointRows = (contract.endpoints||[]).slice(0,15).map(function(ep) {
        return '<div class="api-row">' +
          '<span class="api-method method-' + ep.method.toLowerCase() + '">' + ep.method + '</span>' +
          '<span class="api-path">' + ep.path + '</span>' +
          '<span class="api-feature">' + ep.feature + '</span>' +
          '<span class="api-auth">' + (ep.auth ? '🔒' : '🔓') + '</span>' +
          '</div>';
      }).join('');
      apiHtml = '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 3 — API CONTRACT (REST · ' + (contract.authScheme||'JWT') + ') ]</div>' +
        '<div class="api-list">' + endpointRows + '</div>' +
        '</div>';
    }

    var entityHtml = (ssot.persistedEntities||[]).map(function(e) {
      var fieldHtml = (e.fields||[]).slice(0,5).map(function(f) { return '<div class="schema-field">· ' + f + '</div>'; }).join('');
      return '<div class="schema-card">' +
        '<div class="schema-name">' + e.name + '</div>' +
        '<div class="schema-source">' + (e.ssotKey||'') + '</div>' +
        fieldHtml + '</div>';
    }).join('');

    var featureCountStr = (clPrm && clPrm.featureCount) || 0;
    var pageCountStr    = (clPrm && clPrm.pageCount)    || 0;

    return '<div class="cloner-header">' +
        '<div class="ch-title">⬡ SITE → SYSTEM CLONER AGENT</div>' +
        '<div class="ch-sub">5-stage reverse-engineering pipeline — ' + featureCountStr + ' features · ' + pageCountStr + ' pages · ' + Object.keys(pwaFiles).length + ' files generated</div>' +
        '</div>' +
      '<div class="cloner-stages">' + stageHtml + '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 1 — DOM STRUCTURE ]</div>' +
        '<div class="comp-grid">' + compHtml + '</div>' +
        _row('PAGE TREE', (pageTree.totalPages||0) + ' pages — root: ' + (pageTree.root||'/')) +
        '<div class="cloner-flags">' + flagsHtml + '</div>' +
        '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 2 — INTERACTION MAP (click → action → result) ]</div>' +
        '<div class="interaction-list">' + interactionHtml + '</div>' +
        '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 2 — USER FLOW MAP ]</div>' +
        flowsHtml +
        '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 3 — LAYERED SYSTEM ARCHITECTURE ]</div>' +
        layersHtml +
        '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 3 — LOGIC SEPARATION ]</div>' +
        '<div class="logic-grid">' +
          '<div class="logic-col"><div class="lc-label">UI LOGIC</div>' + uiLogicHtml + '</div>' +
          '<div class="logic-col"><div class="lc-label">BUSINESS LOGIC</div>' + bizLogicHtml + '</div>' +
          '<div class="logic-col"><div class="lc-label">STATE LOGIC (SSOT)</div>' + stLogicHtml + '</div>' +
        '</div></div>' +

      apiHtml +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 3 — SSOT DATA MODEL ]</div>' +
        '<div class="ts-value muted">' + (ssot.ssotPattern||'') + '</div>' +
        '<div class="schema-grid" style="margin-top:10px">' + entityHtml + '</div>' +
        '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 4 — AI CLONE BUILD PROMPT ]</div>' +
        '<div class="prompt-meta">' +
          (clPrm&&clPrm.sections||0) + ' sections · ' + (clPrm&&clPrm.featureCount||0) + ' features · ' + (clPrm&&clPrm.promptLength||0) + ' chars ' +
          '<button class="btn-copy-prompt" onclick="URLIntelligenceView.copyPrompt()">COPY PROMPT</button>' +
        '</div>' +
        '<pre id="clone-prompt-text" class="prompt-block">' + _escapeHtml((clPrm&&clPrm.prompt)||'Prompt not generated') + '</pre>' +
        '</div>' +

      '<div class="cloner-section">' +
        '<div class="cs-label">[ STAGE 5 — PWA SCAFFOLD — ' + Object.keys(pwaFiles).length + ' FILES ]</div>' +
        '<div class="ts-value muted" style="margin-bottom:8px;white-space:pre">' + _escapeHtml((clPwa&&clPwa.fileStructure)||'') + '</div>' +
        '<div class="file-tabs">' + fileTabsHtml + '</div>' +
        '<div id="scaffold-file-content" class="scaffold-file">' +
          '<pre class="code-block">' + firstFileCont + '</pre>' +
        '</div>' +
        '</div>';
  }

  function _stageCard(num, label, status, detail) {
    var icon = status === 'complete' ? '✓' : '◌';
    var cls  = status === 'complete' ? 'stage-complete' : 'stage-pending';
    return '<div class="stage-card ' + cls + '">' +
      '<div class="sc-num">' + icon + ' ' + num + '</div>' +
      '<div class="sc-label">' + label + '</div>' +
      '<div class="sc-detail">' + detail + '</div>' +
      '</div>';
  }

  function _domFlag(label, active) {
    return '<span class="dom-flag ' + (active?'df-on':'df-off') + '">' + (active?'✓':'✗') + ' ' + label + '</span>';
  }

  function _escapeHtml(str) {
    return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function copyPrompt() {
    var el = document.getElementById('clone-prompt-text');
    if (!el) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.textContent)
        .then(function() { showLog('[ COPIED ] Clone build prompt copied to clipboard', 'success'); })
        .catch(function() { showLog('[ MANUAL ] Select and copy the prompt text', 'info'); });
    } else {
      showLog('[ MANUAL ] Select and copy the prompt text above', 'info');
    }
  }

  function showFile(filename, btn) {
    var job = activeJobId;
    var pwa = job ? AP3X_Storage.getRecord('clone_pwa_scaffolds', job) : null;
    if (!pwa) return;
    var file = pwa.files && pwa.files[filename];
    if (!file) return;
    document.querySelectorAll('.file-tab').forEach(function(t) { t.classList.remove('active'); });
    if (btn) btn.classList.add('active');
    var el = document.getElementById('scaffold-file-content');
    if (el) el.innerHTML = '<pre class="code-block">' + _escapeHtml(file.content) + '</pre>';
  }

    // ── Helpers ───────────────────────────────────────────────
  function _row(label, value) {
    if (value === null || value === undefined || value === '') return '';
    return `
      <div class="ts-row">
        <div class="ts-label">[ ${label} ]</div>
        <div class="ts-value">${value}</div>
      </div>`;
  }

  function _capFlag(label, active) {
    return `<div class="cap-item ${active ? 'cap-on' : 'cap-off'}">${active ? '✓' : '✗'} ${label}</div>`;
  }

  function _scoreClass(score) {
    if (score >= 8) return 'high';
    if (score >= 5) return 'mid';
    return 'low';
  }

  function _scoreKey(key) {
    const map = {
      architectureMaturity:  'ARCH',
      aiSophistication:      'AI',
      dataIntelligenceDepth: 'DATA',
      scalabilityReadiness:  'SCALE',
      productMarketClarity:  'PMF'
    };
    return map[key] || key.toUpperCase().slice(0,8);
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
    if (!confirm('Delete this analysis job and all associated intelligence data?')) return;
    URLIngestionEngine.deleteJob(jobId);
    if (activeJobId === jobId) {
      activeJobId = null;
      clearOutputPanel();
      document.getElementById('url-output-placeholder')?.classList.remove('hidden');
    }
    renderJobList();
  }

  function init() { renderJobList(); }

  return { init, renderJobList, submitUrl, loadJob, showTab, deleteJob, copyPrompt, showFile };
})();

window.URLIntelligenceView = URLIntelligenceView;
