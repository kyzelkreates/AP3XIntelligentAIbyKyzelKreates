// ============================================================
// AP3X — MODULE 1: URL INGESTION ENGINE
// Job queue management — queued → crawling → processing → compiled
// ============================================================

const URLIngestionEngine = (() => {

  const CRAWLER_ENDPOINT = 'https://superagent-a75cd307.base44.app/functions/crawlUrl';
  const STATUSES = ['queued','crawling','processing','compiled','error'];

  // ── Create job ────────────────────────────────────────────
  function createJob(url) {
    const db = AP3X_Storage.getDB();
    url = url.trim();

    // Validate basic format
    try { new URL(url); } catch {
      return { success: false, error: '[VALIDATION FAIL] Invalid URL format' };
    }

    // Check for duplicate active job
    const existing = db.ingestion_jobs.find(j =>
      j.url === url && ['queued','crawling','processing'].includes(j.status)
    );
    if (existing) {
      return { success: false, error: `[DUPLICATE] Active job exists for this URL (${existing.id})` };
    }

    const job = {
      id:          'job_' + Date.now() + '_' + Math.random().toString(36).substr(2,6),
      url,
      status:      'queued',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
      version:     1,
      error:       null,
      progress:    { step: 'queued', percent: 0, message: 'Job created — awaiting execution' }
    };

    AP3X_Storage.saveJob(job);
    db.meta.totalUrlJobs = (db.meta.totalUrlJobs || 0) + 1;
    AP3X_Storage.saveDB(AP3X_Storage.getDB()); // refresh meta

    return { success: true, job };
  }

  // ── Transition status ─────────────────────────────────────
  function setStatus(jobId, status, extra = {}) {
    const job = AP3X_Storage.getJob(jobId);
    if (!job) return null;
    const progressMap = {
      queued:     { percent: 0,   message: 'Queued for processing' },
      crawling:   { percent: 20,  message: 'Crawling URL — extracting raw content' },
      processing: { percent: 60,  message: 'Normalising + compiling intelligence' },
      compiled:   { percent: 100, message: 'Intelligence compiled successfully' },
      error:      { percent: 0,   message: extra.error || 'Processing failed' }
    };
    const updated = {
      ...job,
      ...extra,
      status,
      updatedAt: new Date().toISOString(),
      progress: { step: status, ...progressMap[status] }
    };
    AP3X_Storage.saveJob(updated);
    return updated;
  }

  // ── Execute full pipeline ─────────────────────────────────
  async function executeJob(jobId, onProgress) {
    const job = AP3X_Storage.getJob(jobId);
    if (!job) return { success: false, error: '[JOB NOT FOUND]' };

    const emit = (msg) => { if (onProgress) onProgress(msg); };

    try {
      // Step 1: Crawling
      setStatus(jobId, 'crawling');
      emit('[ CRAWLING ] Sending request to controlled crawler…');

      const crawlResp = await fetch(CRAWLER_ENDPOINT, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'x-ap3x-token':  'AP3X-CRAWLER-PUBLIC-2025'
        },
        body: JSON.stringify({ url: job.url })
      });

      const crawlData = await crawlResp.json();

      if (!crawlResp.ok || crawlData.error) {
        const errMsg = crawlData.error || `HTTP ${crawlResp.status}`;
        setStatus(jobId, 'error', { error: errMsg });
        return { success: false, error: errMsg };
      }

      const snapshot = { ...crawlData.snapshot, jobId, version: 1 };

      // Validation gate
      if (!snapshot.text || snapshot.text.length < 100) {
        const err = '[EXTRACTION FAIL] Snapshot has insufficient text content';
        setStatus(jobId, 'error', { error: err });
        return { success: false, error: err };
      }

      AP3X_Storage.saveRecord('site_snapshots', snapshot);
      emit('[ SNAPSHOT SAVED ] Raw site data extracted and stored');

      // Step 2: Processing
      setStatus(jobId, 'processing');
      emit('[ PROCESSING ] Normalising site model…');

      const siteModel = SiteModelEngine.buildModel(snapshot, jobId);
      AP3X_Storage.saveRecord('site_models', siteModel);
      emit('[ SITE MODEL ] Structure normalised');

      emit('[ COMPILING ] Generating project specification…');
      const projectSpec = ProjectCompiler.compileSpec(snapshot, siteModel, jobId);
      AP3X_Storage.saveRecord('project_specs', projectSpec);

      emit('[ COMPILING ] Building system architecture blueprint…');
      const blueprint = ProjectCompiler.compileBlueprint(snapshot, siteModel, jobId);
      AP3X_Storage.saveRecord('system_blueprints', blueprint);

      emit('[ COMPILING ] Mapping UI structure…');
      const uiBlueprint = ProjectCompiler.compileUI(snapshot, siteModel, jobId);
      AP3X_Storage.saveRecord('ui_blueprints', uiBlueprint);

      emit('[ COMPILING ] Analysing commercial model…');
      const commercialModel = ProjectCompiler.compileCommercialModel(snapshot, siteModel, jobId);
      AP3X_Storage.saveRecord('commercial_models', commercialModel);

      emit('[ COMPILING ] Scoring system maturity…');
      const maturityScores = ProjectCompiler.compileMaturityScores(snapshot, siteModel, jobId);
      AP3X_Storage.saveRecord('maturity_scores', maturityScores);

      emit('[ COMPILING ] Generating replication blueprint…');
      const replicationBlueprint = ProjectCompiler.compileReplicationBlueprint(snapshot, siteModel, jobId);
      AP3X_Storage.saveRecord('replication_blueprints', replicationBlueprint);

      emit('[ COMPILING ] Generating investor intelligence pack…');
      const investorPack = InvestorEngine.compile(snapshot, siteModel, projectSpec, jobId);
      AP3X_Storage.saveRecord('investor_packs', investorPack);

      // Final validation gate
      const gates = runValidationGates(jobId);
      if (!gates.pass) {
        const err = `[VALIDATION GATE FAIL] ${gates.failures.join('; ')}`;
        setStatus(jobId, 'error', { error: err });
        return { success: false, error: err };
      }

      setStatus(jobId, 'compiled');
      emit('[ COMPLETE ] All modules compiled — intelligence ready');

      return {
        success: true,
        jobId,
        snapshot,
        siteModel,
        projectSpec,
        blueprint,
        uiBlueprint,
        commercialModel,
        maturityScores,
        replicationBlueprint,
        investorPack
      };

    } catch (err) {
      const msg = `[SYSTEM ERROR] ${err.message}`;
      setStatus(jobId, 'error', { error: msg });
      return { success: false, error: msg };
    }
  }

  // ── Validation gates ──────────────────────────────────────
  function runValidationGates(jobId) {
    const failures = [];
    const snap   = AP3X_Storage.getRecord('site_snapshots',       jobId);
    const model  = AP3X_Storage.getRecord('site_models',          jobId);
    const spec   = AP3X_Storage.getRecord('project_specs',        jobId);
    const bp     = AP3X_Storage.getRecord('system_blueprints',    jobId);
    const inv    = AP3X_Storage.getRecord('investor_packs',       jobId);
    const com    = AP3X_Storage.getRecord('commercial_models',    jobId);
    const mat    = AP3X_Storage.getRecord('maturity_scores',      jobId);
    const rep    = AP3X_Storage.getRecord('replication_blueprints', jobId);

    if (!snap)                         failures.push('No site snapshot');
    if (!model || !model.pages?.length)failures.push('Site model empty or no pages');
    if (!spec)                         failures.push('No project spec');
    if (!bp)                           failures.push('No system blueprint');
    if (!inv || !inv.executiveSummary) failures.push('No investor pack');
    if (!com)                          failures.push('No commercial model');
    if (!mat)                          failures.push('No maturity scores');
    if (!rep)                          failures.push('No replication blueprint');

    return { pass: failures.length === 0, failures };
  }

  function getAllJobs() { return AP3X_Storage.getAllJobs(); }
  function getJobById(id) { return AP3X_Storage.getJob(id); }

  function deleteJob(jobId) {
    const db = AP3X_Storage.getDB();
    db.ingestion_jobs         = db.ingestion_jobs.filter(j => j.id !== jobId);
    db.site_snapshots         = (db.site_snapshots         || []).filter(r => r.jobId !== jobId);
    db.site_models            = (db.site_models            || []).filter(r => r.jobId !== jobId);
    db.project_specs          = (db.project_specs          || []).filter(r => r.jobId !== jobId);
    db.system_blueprints      = (db.system_blueprints      || []).filter(r => r.jobId !== jobId);
    db.ui_blueprints          = (db.ui_blueprints          || []).filter(r => r.jobId !== jobId);
    db.investor_packs         = (db.investor_packs         || []).filter(r => r.jobId !== jobId);
    db.commercial_models      = (db.commercial_models      || []).filter(r => r.jobId !== jobId);
    db.maturity_scores        = (db.maturity_scores        || []).filter(r => r.jobId !== jobId);
    db.replication_blueprints = (db.replication_blueprints || []).filter(r => r.jobId !== jobId);
    AP3X_Storage.saveDB(db);
    return true;
  }

  return { createJob, executeJob, setStatus, getAllJobs, getJobById, deleteJob, runValidationGates };
})();

window.URLIngestionEngine = URLIngestionEngine;
