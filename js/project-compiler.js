// ============================================================
// AP3X — MODULE 4: AI PROJECT COMPILER v2.0
// Layers: Product Spec · Architecture · DB Model ·
//         UI Blueprint · Commercial Model · Maturity Scores ·
//         Replication Blueprint
// ============================================================

const ProjectCompiler = (() => {

  // ──────────────────────────────────────────────────────────
  // 4A: PRODUCT SPECIFICATION
  // ──────────────────────────────────────────────────────────
  function compileSpec(snapshot, siteModel, jobId) {
    const meta = snapshot.meta || {};
    const name = siteModel.productName;
    const desc = meta.description || meta['og:description'] || '';

    return {
      jobId,
      version:    2,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,
      productName:     name,
      tagline:         meta['og:title'] || meta.title || name,
      whatItDoes:      desc || _inferDescription(snapshot, siteModel),
      problemItSolves: _inferProblem(snapshot, siteModel),
      targetUsers:     _inferTargetUsers(snapshot, siteModel),
      coreFeatures:    siteModel.features
        .filter(f => f.confidence === 'inferred' || f.type !== 'content')
        .slice(0, 12)
        .map(f => ({ name: f.name, type: f.type })),
      userJourneys: siteModel.userFlows,
      category:     siteModel.category,
      domain:       _inferDomain(siteModel.category)
    };
  }

  function _inferDescription(snapshot, siteModel) {
    const h1 = snapshot.headings.h1[0] || '';
    const features = siteModel.features.slice(0,3).map(f=>f.name).join(', ');
    return `${siteModel.productName} is a ${siteModel.category} product${h1?` — "${h1}"`:''}${features?`. Key capabilities: ${features}`:''}.`;
  }

  function _inferProblem(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const painPoints = [
      [/manual|tedious|time-consuming/i,  'Reduces manual, time-consuming processes'],
      [/complex|complicated|difficult/i,  'Simplifies complex workflows'],
      [/slow|inefficient/i,               'Addresses slow or inefficient systems'],
      [/disconnected|silos|fragmented/i,  'Connects fragmented data or teams'],
      [/expensive|cost/i,                 'Reduces operational costs'],
      [/scale|growing/i,                  'Helps businesses scale effectively'],
    ];
    for (const [pattern, statement] of painPoints) {
      if (pattern.test(text)) return statement;
    }
    return `Provides streamlined ${siteModel.category} capabilities for modern teams`;
  }

  function _inferTargetUsers(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const users = [];
    const signals = [
      [/developer|engineer/i,             'Developers / Engineers'],
      [/startup|founder|entrepreneur/i,   'Startup founders'],
      [/enterprise|large team/i,          'Enterprise teams'],
      [/small business|smb/i,             'SMBs'],
      [/marketing|marketer/i,             'Marketing teams'],
      [/designer/i,                       'Product designers'],
      [/data team|analyst/i,              'Data analysts'],
      [/finance|accounting/i,             'Finance teams'],
    ];
    for (const [p, label] of signals) {
      if (p.test(text)) users.push(label);
    }
    return users.length > 0 ? users.slice(0,4) : ['Business professionals', 'Product teams'];
  }

  function _inferDomain(category) {
    if (/fintech|payment/i.test(category)) return 'finance';
    if (/health/i.test(category))          return 'health';
    if (/edtech/i.test(category))          return 'education';
    if (/logistic/i.test(category))        return 'fleet';
    return 'ap3x';
  }

  // ──────────────────────────────────────────────────────────
  // 4B: SYSTEM ARCHITECTURE BLUEPRINT
  // ──────────────────────────────────────────────────────────
  function compileBlueprint(snapshot, siteModel, jobId) {
    const features  = siteModel.features;
    const apiSigs   = snapshot.apiSignals || [];
    const entities  = siteModel.inferred_data_entities || [];
    const techStack = siteModel.techStack || {};

    return {
      jobId,
      version:    2,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,

      architecture: {
        frontend: _buildFrontendSpec(snapshot, siteModel, techStack),
        backend:  _buildBackendSpec(snapshot, siteModel, apiSigs, techStack),
        auth:     _buildAuthSpec(snapshot, features, techStack),
        state:    _buildStateSpec(features, techStack),
        api:      _buildApiSpec(apiSigs, features, techStack),
        hosting:  techStack.hosting || { signals: [{ name:'Unknown', confidence:'inferred' }] }
      },

      databaseModel: {
        type:          _inferDbType(apiSigs, features, techStack),
        entities:      entities.map(e => ({ name: e.name, fields: e.fields, source: e.source || 'inferred' })),
        relationships: _buildRelationships(entities)
      },

      // Architecture flow diagram
      architectureFlow: _buildArchitectureFlow(siteModel, techStack)
    };
  }

  function _buildFrontendSpec(snapshot, siteModel, techStack) {
    const fe = techStack.frontend || {};
    const stackSignals = (fe.signals || []).map(s => `${s.name} [${s.confidence}]`);
    if (stackSignals.length === 0) stackSignals.push('Web framework (inferred)');
    return {
      stackSignals,
      cssFramework:  fe.cssFramework ? `${fe.cssFramework.name} [${fe.cssFramework.confidence}]` : 'Custom CSS [inferred]',
      ssr:           fe.ssr || false,
      pwaSignals:    fe.pwa || false,
      mobileSignals: fe.mobile || false,
      pages:         siteModel.pages.map(p => p.label),
      components:    siteModel.components.map(c => c.name)
    };
  }

  function _buildBackendSpec(snapshot, siteModel, apiSigs, techStack) {
    const be = techStack.backend || {};
    return {
      type:         (be.signals || []).map(s => `${s.name} [${s.confidence}]`).join(', ') || 'Backend (inferred)',
      queueSignals: be.queue  ? ['Async job processing inferred'] : [],
      cacheSignals: be.cache  ? ['Caching layer inferred'] : [],
      realtimeSignals: be.realtime ? ['Real-time comms inferred (WebSocket/SSE)'] : []
    };
  }

  function _buildAuthSpec(snapshot, features, techStack) {
    const auth = techStack.auth || {};
    return {
      providers:    (auth.signals || []).map(s => `${s.name} [${s.confidence}]`),
      oauth:        auth.oauth   || false,
      sso:          auth.sso     || false,
      mfa:          auth.mfa     || false,
      passkey:      auth.passkey || false,
      sessionModel: 'JWT or session cookie (inferred)'
    };
  }

  function _buildStateSpec(features, techStack) {
    const state = techStack.state || {};
    return {
      signals: (state.signals || []).map(s => `${s.name} [${s.confidence}]`),
      type:    (state.signals || [])[0]?.name || 'Component-local state (inferred)'
    };
  }

  function _buildApiSpec(apiSigs, features, techStack) {
    const api = techStack.api || {};
    return {
      style:       (api.style || []).map(s => `${s.name} [${s.confidence}]`),
      publicApi:   api.hasPublicApi || false,
      sdk:         api.hasSDK      || false,
      webhooks:    (api.style || []).some(s => /webhook/i.test(s.name))
    };
  }

  function _inferDbType(apiSigs, features, techStack) {
    const db = techStack.database;
    if (db?.signals?.length > 0) return db.signals.map(s => `${s.name} [${s.confidence}]`).join(', ');
    if (/supabase|postgres/i.test(apiSigs.join(' ')))  return 'PostgreSQL (Supabase inferred)';
    if (/firebase|firestore/i.test(apiSigs.join(' '))) return 'NoSQL (Firebase/Firestore inferred)';
    return 'Relational SQL database (inferred)';
  }

  function _buildRelationships(entities) {
    const rels = [];
    const names = entities.map(e => e.name);
    if (names.includes('users') && names.includes('sessions'))      rels.push('users → sessions (1:many)');
    if (names.includes('users') && names.includes('projects'))      rels.push('users → projects (1:many)');
    if (names.includes('projects') && names.includes('tasks'))      rels.push('projects → tasks (1:many)');
    if (names.includes('users') && names.includes('payments'))      rels.push('users → payments (1:many)');
    if (names.includes('users') && names.includes('subscriptions')) rels.push('users → subscriptions (1:1)');
    if (names.includes('users') && names.includes('files'))         rels.push('users → files (1:many)');
    if (names.includes('users') && names.includes('notifications')) rels.push('users → notifications (1:many)');
    if (names.includes('users') && names.includes('audit_logs'))    rels.push('users → audit_logs (1:many)');
    if (names.includes('agent_runs'))                               rels.push('users → agent_runs (1:many)');
    return rels;
  }

  function _buildArchitectureFlow(siteModel, techStack) {
    const fe = (techStack.frontend?.signals || [{ name:'Frontend' }])[0].name;
    const be = (techStack.backend?.signals  || [{ name:'Backend'  }])[0].name;
    const db = (techStack.database?.signals || [{ name:'Database' }])[0].name;
    const ho = (techStack.hosting?.signals  || [{ name:'Hosting'  }])[0].name;
    const auth = (techStack.auth?.signals   || [{ name:'Auth'     }])[0].name;

    const lines = [
      '[ ARCHITECTURE FLOW ]',
      '',
      `  USER BROWSER / DEVICE`,
      `    ↓ HTTPS`,
      `  [${ho}] — CDN / Edge`,
      `    ↓`,
      `  [${fe}] — Frontend`,
      `    ↓ API calls`,
      `  [${be}] — Backend / API`,
      `    ↓                  ↘`,
      `  [${db}]           [${auth}]`,
      `  Database           Auth Provider`,
    ];
    if (techStack.backend?.realtime) {
      lines.push('    ↕ WebSocket');
      lines.push('  Real-time sync');
    }
    if (siteModel.aiAgentModel?.detected) {
      lines.push('    ↓');
      lines.push(`  [AI Layer — ${siteModel.aiAgentModel.systemType}]`);
    }
    return lines.join('\n');
  }

  // ──────────────────────────────────────────────────────────
  // 4C: UI STRUCTURE + LOGIC FLOW
  // ──────────────────────────────────────────────────────────
  function compileUI(snapshot, siteModel, jobId) {
    return {
      jobId,
      version:    2,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,
      uiStructure: {
        pages:          siteModel.pages,
        navigation:     snapshot.navigation.slice(0, 15),
        dashboardLayout:_inferDashboardLayout(siteModel),
        componentTree:  siteModel.components,
        forms:          snapshot.forms.map(f => ({
          action: f.action,
          inputs: f.inputs
        }))
      },
      logicFlow: {
        stateTransitions:    _inferStateTransitions(siteModel),
        featureInteractions: _inferFeatureInteractions(siteModel),
        systemBehaviours:    _inferSystemBehaviours(snapshot, siteModel)
      }
    };
  }

  function _inferDashboardLayout(siteModel) {
    const hasDash  = siteModel.features.some(f => /dashboard/i.test(f.name));
    const hasChart = siteModel.components.some(c => /chart|graph/i.test(c.name));
    const hasTable = siteModel.components.some(c => /table|grid/i.test(c.name));
    const hasSide  = siteModel.components.some(c => /sidebar/i.test(c.name));

    if (!hasDash) return { layout: 'Marketing/content layout', panels: [] };

    const panels = [];
    if (hasChart) panels.push('Charts / Analytics panels');
    if (hasTable) panels.push('Data table / grid');
    if (hasSide)  panels.push('Sidebar navigation');
    panels.push('Header with user controls');

    return { layout: hasSide ? 'Sidebar + main content' : 'Top nav + content area', panels };
  }

  function _inferStateTransitions(siteModel) {
    const transitions = [];
    for (const flow of siteModel.userFlows) {
      for (let i = 0; i < flow.steps.length - 1; i++) {
        transitions.push(`${flow.steps[i]} → ${flow.steps[i+1]}`);
      }
    }
    if (transitions.length === 0) {
      transitions.push('Unauthenticated → Login → Authenticated');
      transitions.push('Landing → Signup → Onboarding → Dashboard');
    }
    return transitions.slice(0, 12);
  }

  function _inferFeatureInteractions(siteModel) {
    const interactions = [];
    const features = siteModel.features;
    const hasAuth    = features.some(f => f.type === 'auth');
    const hasBilling = features.some(f => f.type === 'billing');
    const hasApi     = features.some(f => f.type === 'api');
    const hasNotif   = features.some(f => f.type === 'comm');

    if (hasAuth && hasBilling) interactions.push('Auth gate → Plan check → Feature access control');
    if (hasApi)                interactions.push('API event → Webhook → Third-party sync');
    if (hasNotif)              interactions.push('System event → Notification → User alert');
    if (hasBilling)            interactions.push('Usage threshold → Billing event → Upgrade prompt');
    return interactions;
  }

  function _inferSystemBehaviours(snapshot, siteModel) {
    const behaviours = [];
    const text = snapshot.text.toLowerCase();
    if (/real.?time|live/i.test(text))    behaviours.push('Real-time data updates inferred');
    if (/automat|schedule/i.test(text))   behaviours.push('Background automation / scheduled jobs');
    if (/email|notif/i.test(text))        behaviours.push('Transactional email / notification dispatch');
    if (/audit|log/i.test(text))          behaviours.push('Audit logging on user actions');
    if (/export/i.test(text))             behaviours.push('Data export pipeline');
    if (/import|ingest/i.test(text))      behaviours.push('Data ingestion pipeline');
    if (siteModel.aiAgentModel?.detected) behaviours.push('AI agent orchestration layer active');
    return behaviours;
  }

  // ──────────────────────────────────────────────────────────
  // 4D: COMMERCIAL MODEL ANALYSIS (Layer 5)
  // ──────────────────────────────────────────────────────────
  function compileCommercialModel(snapshot, siteModel, jobId) {
    const text    = snapshot.text.toLowerCase();
    const pricing = snapshot.pricingSignals || [];

    // Business model detection
    const models = [];
    if (/subscription|monthly|annual/i.test(text))       models.push({ model:'SaaS Subscription',           confidence:'likely' });
    if (/marketplace|transaction.?fee|take.?rate/i.test(text)) models.push({ model:'Marketplace / Transaction', confidence:'inferred' });
    if (/freemium|free.*pro|free.?tier/i.test(text))     models.push({ model:'Freemium → Paid',             confidence:'likely' });
    if (/enterprise.*plan|custom.*pricing|contact.*sales/i.test(text)) models.push({ model:'Enterprise / Custom pricing', confidence:'likely' });
    if (/usage.?based|pay.as.you.go|per.?api.?call/i.test(text)) models.push({ model:'Usage-based pricing',   confidence:'likely' });
    if (/one.?time|perpetual|lifetime/i.test(text))      models.push({ model:'One-time purchase',           confidence:'inferred' });
    if (/open.?source/i.test(text))                      models.push({ model:'Open-source (support/hosting revenue)', confidence:'inferred' });
    if (models.length === 0) models.push({ model:'Business model not detected', confidence:'inferred' });

    // Monetisation signals
    const monetisation = {
      hasPricingPage:    /pricing|plans|upgrade/i.test(text),
      pricingSignals:    pricing.slice(0, 10),
      freeTrial:         /free.?trial|try.?free/i.test(text),
      freemium:          /freemium|free.?tier/i.test(text),
      enterpriseSales:   /enterprise|book.?demo|contact.?sales/i.test(text),
      selfServe:         /sign.?up.?free|get.?started|no.?credit.?card/i.test(text),
      annualDiscount:    /annual|yearly.*save|save.*annual/i.test(text)
    };

    // User acquisition strategy
    const acquisition = [];
    if (/seo|blog|content/i.test(text))              acquisition.push({ channel:'Content / SEO',      confidence:'inferred' });
    if (/product.?led|plg|sign.?up.?free/i.test(text)) acquisition.push({ channel:'Product-led growth (PLG)', confidence:'likely' });
    if (/sales.?led|demo|book.?call/i.test(text))    acquisition.push({ channel:'Sales-led / demo motion', confidence:'likely' });
    if (/open.?source|github/i.test(text))           acquisition.push({ channel:'Open-source community', confidence:'inferred' });
    if (/partner|affiliate|referral/i.test(text))    acquisition.push({ channel:'Partnership / referral', confidence:'inferred' });
    if (/ads|paid.*channel/i.test(text))             acquisition.push({ channel:'Paid acquisition',     confidence:'inferred' });
    if (acquisition.length === 0) acquisition.push({ channel:'Acquisition channel (not detectable)', confidence:'inferred' });

    // Scaling approach
    const scaling = [];
    if (/api.?first|developer/i.test(text))          scaling.push('API-first platform expansion');
    if (/marketplace|ecosystem/i.test(text))         scaling.push('Marketplace / ecosystem play');
    if (/enterprise|compliance/i.test(text))         scaling.push('Enterprise upmarket motion');
    if (/international|global|multi.?language/i.test(text)) scaling.push('International expansion signals');
    if (/white.?label|embed|resell/i.test(text))     scaling.push('White-label / embedded product');
    if (scaling.length === 0) scaling.push('Scaling approach not directly observable');

    return {
      jobId,
      version:    2,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,
      models,
      monetisation,
      acquisition,
      scaling,
      revenueHypothesis: _buildRevenueHypothesis(models, monetisation, siteModel)
    };
  }

  function _buildRevenueHypothesis(models, monetisation, siteModel) {
    const primary = models[0]?.model || 'Unknown';
    const trial   = monetisation.freeTrial ? 'free trial' : monetisation.freemium ? 'freemium' : 'direct signup';
    const upsell  = monetisation.enterpriseSales ? ' with enterprise upsell' : '';
    return `${primary} via ${trial}${upsell} (inferred)`;
  }

  // ──────────────────────────────────────────────────────────
  // 4E: MATURITY SCORES (Layer 6)
  // ──────────────────────────────────────────────────────────
  function compileMaturityScores(snapshot, siteModel, jobId) {
    const features  = siteModel.features;
    const tech      = siteModel.techStack || {};
    const ai        = siteModel.aiAgentModel || {};
    const dataFlow  = siteModel.dataFlowModel || {};
    const text      = snapshot.text.toLowerCase();

    // 1. Architecture maturity (1–10)
    let archScore = 2; // baseline
    if ((tech.backend?.signals || []).some(s => s.confidence === 'likely'))  archScore += 1;
    if (tech.auth?.signals?.length > 0)                                       archScore += 1;
    if (tech.database?.signals?.length > 0)                                  archScore += 1;
    if (tech.api?.hasPublicApi)                                               archScore += 1;
    if (tech.backend?.cache)                                                  archScore += 1;
    if (tech.backend?.queue)                                                  archScore += 1;
    if (tech.frontend?.ssr)                                                   archScore += 1;
    if (tech.backend?.realtime)                                               archScore += 1;
    archScore = Math.min(10, archScore);

    // 2. AI sophistication (1–10)
    let aiScore = 0;
    if (ai.detected)                                                          aiScore += 2;
    if (ai.agentRoles?.length >= 2)                                           aiScore += 2;
    if (ai.capabilities?.rag)                                                 aiScore += 2;
    if (ai.capabilities?.toolUse)                                             aiScore += 1;
    if (ai.capabilities?.memory)                                              aiScore += 1;
    if (ai.llmProviders?.length > 0)                                          aiScore += 1;
    if (ai.capabilities?.fineTuning)                                          aiScore += 1;
    aiScore = Math.min(10, Math.max(1, aiScore));

    // 3. Data intelligence depth (1–10)
    let dataScore = 2;
    if (dataFlow.feedbackLoops?.length > 0)                                   dataScore += 2;
    if (dataFlow.telemetry?.length > 0)                                       dataScore += 2;
    if (dataFlow.isRealtime)                                                  dataScore += 1;
    if ((dataFlow.inputs || []).length > 2)                                   dataScore += 1;
    if ((dataFlow.processing || []).length > 2)                               dataScore += 1;
    if (/ml|model|predict|recommend/i.test(text))                            dataScore += 1;
    dataScore = Math.min(10, dataScore);

    // 4. Scalability readiness (1–10)
    let scaleScore = 2;
    if (tech.hosting?.cdn)                                                    scaleScore += 1;
    if (tech.backend?.cache)                                                  scaleScore += 1;
    if (tech.backend?.queue)                                                  scaleScore += 2;
    if (tech.api?.hasPublicApi)                                               scaleScore += 1;
    if (/microservice|distributed|k8s|kubernetes/i.test(text))               scaleScore += 2;
    if (tech.backend?.realtime)                                               scaleScore += 1;
    scaleScore = Math.min(10, scaleScore);

    // 5. Product-market clarity (1–10)
    let pmScore = 2;
    if (snapshot.pricingSignals?.length > 0)                                  pmScore += 2;
    if (features.some(f => f.type === 'billing'))                             pmScore += 1;
    if (/testimonial|case.?study|customer|review/i.test(text))               pmScore += 2;
    if (/sign.?up.?free|get.?started|free.?trial/i.test(text))               pmScore += 1;
    if ((snapshot.headings.h1 || []).length > 0)                             pmScore += 1;
    if (/award|trusted|leader|best/i.test(text))                             pmScore += 1;
    pmScore = Math.min(10, pmScore);

    const overall = Math.round((archScore + aiScore + dataScore + scaleScore + pmScore) / 5);

    const label = overall >= 8 ? 'Enterprise-grade system'
                : overall >= 6 ? 'Growth-stage product'
                : overall >= 4 ? 'MVP+ with clear direction'
                : 'Early-stage / MVP';

    return {
      jobId,
      version:    2,
      compiledAt: new Date().toISOString(),
      scores: {
        architectureMaturity:  { score: archScore,  label: _scoreLabel(archScore),  note: 'Tech stack signals, API, cache, queue, SSR' },
        aiSophistication:      { score: aiScore,    label: _scoreLabel(aiScore),    note: 'Agent roles, RAG, tool use, LLM providers' },
        dataIntelligenceDepth: { score: dataScore,  label: _scoreLabel(dataScore),  note: 'Feedback loops, telemetry, processing layers' },
        scalabilityReadiness:  { score: scaleScore, label: _scoreLabel(scaleScore), note: 'CDN, cache, queue, microservices signals' },
        productMarketClarity:  { score: pmScore,    label: _scoreLabel(pmScore),    note: 'Pricing, testimonials, CTA clarity' }
      },
      overall: { score: overall, label },
      disclaimer: 'Scores are inferred from public page signals only. Internal architecture details are not directly observable.'
    };
  }

  function _scoreLabel(score) {
    if (score >= 9) return 'Exceptional';
    if (score >= 7) return 'Strong';
    if (score >= 5) return 'Developing';
    if (score >= 3) return 'Early';
    return 'Minimal signals';
  }

  // ──────────────────────────────────────────────────────────
  // 4F: REPLICATION BLUEPRINT (Layer 7)
  // ──────────────────────────────────────────────────────────
  function compileReplicationBlueprint(snapshot, siteModel, jobId) {
    const tech     = siteModel.techStack || {};
    const features = siteModel.features;
    const ai       = siteModel.aiAgentModel || {};
    const entities = siteModel.inferred_data_entities || [];

    // Required components
    const components = _buildRequiredComponents(siteModel, tech, ai);

    // System architecture overview
    const architectureOverview = _buildReplicationArchitecture(tech, ai, siteModel);

    // MVC clone structure
    const mvpStructure = _buildMVPStructure(siteModel, tech, features, ai, entities);

    // Effort estimate
    const effort = _estimateEffort(siteModel, tech, ai, features);

    // Recommended stack
    const recommendedStack = _recommendStack(tech, ai, features);

    return {
      jobId,
      version:    2,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,
      productName: siteModel.productName,
      howToRebuild: `To rebuild ${siteModel.productName}: ${_buildHowToRebuild(siteModel, tech, ai)}`,
      components,
      architectureOverview,
      mvpStructure,
      effort,
      recommendedStack,
      disclaimer: 'Blueprint is inferred from public signals. Internal implementation details are not directly observable. All recommendations are independent engineering judgments.'
    };
  }

  function _buildHowToRebuild(siteModel, tech, ai) {
    const fe = (tech.frontend?.signals || [])[0]?.name || 'a modern frontend framework';
    const be = (tech.backend?.signals  || [])[0]?.name || 'a serverless backend';
    const db = (tech.database?.signals || [])[0]?.name || 'a relational database';
    const aiNote = ai.detected ? ` with ${ai.systemType} using ${(ai.llmProviders||[]).map(l=>l.name).join(' or ') || 'an LLM provider'}` : '';
    return `start with ${fe} for the frontend, ${be} for the API layer, and ${db} for persistence${aiNote}. Build the core ${siteModel.features.slice(0,3).map(f=>f.name).join(', ')} features first, then layer in auth, billing, and analytics.`;
  }

  function _buildRequiredComponents(siteModel, tech, ai) {
    const components = [];

    // Frontend
    const fe = (tech.frontend?.signals || [])[0]?.name || 'React/Next.js';
    components.push({ layer:'Frontend', component: fe, priority:'critical', notes:'Core UI layer' });

    if (tech.frontend?.pwa) {
      components.push({ layer:'Frontend', component:'PWA / Service Worker', priority:'medium', notes:'Offline support' });
    }

    // Backend
    const be = (tech.backend?.signals || [])[0]?.name || 'Node.js / Serverless';
    components.push({ layer:'Backend', component: be, priority:'critical', notes:'API and business logic' });

    if (tech.backend?.queue) {
      components.push({ layer:'Backend', component:'Job queue (BullMQ/Celery)', priority:'high', notes:'Async task processing' });
    }
    if (tech.backend?.realtime) {
      components.push({ layer:'Backend', component:'WebSocket server (Socket.io/Pusher)', priority:'medium', notes:'Real-time comms' });
    }

    // Database
    const db = (tech.database?.signals || [])[0]?.name || 'PostgreSQL';
    components.push({ layer:'Database', component: db, priority:'critical', notes:'Primary data store' });
    if (tech.backend?.cache) {
      components.push({ layer:'Database', component:'Redis', priority:'medium', notes:'Cache / session store' });
    }

    // Auth
    const auth = (tech.auth?.signals || [])[0]?.name || 'NextAuth.js / Supabase Auth';
    components.push({ layer:'Auth', component: auth, priority:'critical', notes:'User authentication' });

    // AI
    if (ai.detected) {
      const llm = (ai.llmProviders || [])[0]?.name || 'OpenAI API';
      components.push({ layer:'AI', component: llm, priority:'high', notes:`${ai.systemType} integration` });
      if (ai.capabilities?.rag)    components.push({ layer:'AI', component:'Vector DB (Pinecone/Supabase pgvector)', priority:'high', notes:'RAG knowledge base' });
      if (ai.capabilities?.toolUse)components.push({ layer:'AI', component:'Tool/function calling layer', priority:'medium', notes:'Agent tool execution' });
    }

    // Payments
    if (siteModel.features.some(f => f.type === 'billing')) {
      components.push({ layer:'Payments', component:'Stripe', priority:'high', notes:'Subscriptions / billing' });
    }

    // Email
    if (siteModel.features.some(f => f.type === 'comm')) {
      components.push({ layer:'Email/Comms', component:'Resend / SendGrid', priority:'medium', notes:'Transactional email' });
    }

    // Analytics
    components.push({ layer:'Analytics', component:'PostHog / Mixpanel', priority:'low', notes:'Product analytics' });
    components.push({ layer:'Monitoring', component:'Sentry / Datadog',   priority:'medium', notes:'Error tracking & observability' });

    return components;
  }

  function _buildReplicationArchitecture(tech, ai, siteModel) {
    const lines = ['[ REPLICATION ARCHITECTURE ]', ''];
    const fe  = (tech.frontend?.signals || [])[0]?.name || 'Next.js';
    const be  = (tech.backend?.signals  || [])[0]?.name || 'Node.js API';
    const db  = (tech.database?.signals || [])[0]?.name || 'PostgreSQL';
    const auth= (tech.auth?.signals     || [])[0]?.name || 'NextAuth.js';

    lines.push(`  ┌─────────────────────────────────────┐`);
    lines.push(`  │  ${fe.padEnd(35)}│  ← Frontend`);
    lines.push(`  └──────────────┬──────────────────────┘`);
    lines.push(`                 │ REST/GraphQL API`);
    lines.push(`  ┌──────────────▼──────────────────────┐`);
    lines.push(`  │  ${be.padEnd(35)}│  ← API Layer`);
    lines.push(`  └──────┬───────────────┬──────────────┘`);
    lines.push(`         │               │`);
    lines.push(`  ┌──────▼──────┐  ┌────▼────────┐`);
    lines.push(`  │  ${db.padEnd(11)}│  │  ${auth.padEnd(9)}│`);
    lines.push(`  │  Database   │  │  Auth       │`);
    lines.push(`  └─────────────┘  └─────────────┘`);
    if (ai.detected) {
      const llm = (ai.llmProviders || [])[0]?.name || 'LLM Provider';
      lines.push(`         │`);
      lines.push(`  ┌──────▼──────────────────────────────┐`);
      lines.push(`  │  AI Layer: ${(ai.systemType||'').padEnd(26)}│`);
      lines.push(`  │  ${llm.padEnd(35)}│`);
      lines.push(`  └─────────────────────────────────────┘`);
    }
    return lines.join('\n');
  }

  function _buildMVPStructure(siteModel, tech, features, ai, entities) {
    const phase1 = [
      'Project scaffolding + repo setup',
      'Database schema (' + entities.slice(0,3).map(e=>e.name).join(', ') + ')',
      'Authentication (signup, login, session)',
    ];

    const coreFeatures = features
      .filter(f => ['ui','auth','data'].includes(f.type))
      .slice(0,3)
      .map(f => f.name);

    const phase2 = [
      ...coreFeatures.map(f => `Core feature: ${f}`),
      'Basic dashboard / main view',
    ];

    const phase3 = [];
    if (features.some(f => f.type === 'billing')) phase3.push('Billing & subscription (Stripe)');
    if (features.some(f => f.type === 'api'))     phase3.push('API layer + webhooks');
    if (features.some(f => f.type === 'comm'))    phase3.push('Email notifications');
    if (ai.detected)                              phase3.push(`AI layer: ${ai.systemType}`);
    if (phase3.length === 0) phase3.push('Additional features per roadmap');

    return {
      phase1: { name:'Foundation', items: phase1 },
      phase2: { name:'Core Product', items: phase2 },
      phase3: { name:'Scale & Monetise', items: phase3 }
    };
  }

  function _estimateEffort(siteModel, tech, ai, features) {
    let baseWeeks = 4;
    if (features.length > 10)          baseWeeks += 4;
    if (features.some(f=>f.type==='billing')) baseWeeks += 2;
    if (ai.detected)                   baseWeeks += ai.agentRoles?.length >= 2 ? 6 : 3;
    if (tech.backend?.queue)           baseWeeks += 2;
    if (tech.backend?.realtime)        baseWeeks += 2;

    const soloWeeks   = baseWeeks;
    const teamWeeks   = Math.ceil(baseWeeks / 3);
    const complexity  = baseWeeks > 16 ? 'High' : baseWeeks > 8 ? 'Medium' : 'Low';

    return {
      solo:   `${soloWeeks}–${soloWeeks + 4} weeks (1 developer)`,
      team:   `${teamWeeks}–${teamWeeks + 2} weeks (3-person team)`,
      complexity,
      notes:  'Estimates assume experienced full-stack engineer. AI layer adds significant complexity.'
    };
  }

  function _recommendStack(tech, ai, features) {
    const fe   = (tech.frontend?.signals || [])[0]?.name;
    const be   = (tech.backend?.signals  || [])[0]?.name;
    const db   = (tech.database?.signals || [])[0]?.name;
    const auth = (tech.auth?.signals     || [])[0]?.name;

    return {
      frontend:  fe  || 'Next.js 14 (App Router)',
      backend:   be  || 'Node.js + tRPC / FastAPI',
      database:  db  || 'PostgreSQL (via Supabase)',
      auth:      auth|| 'Clerk or NextAuth.js',
      payments:  features.some(f=>f.type==='billing') ? 'Stripe' : 'N/A',
      ai:        ai.detected ? ((ai.llmProviders||[])[0]?.name || 'OpenAI API') : 'N/A',
      hosting:   'Vercel (frontend) + Railway/Fly.io (backend)',
      monitoring:'Sentry + PostHog'
    };
  }

  return {
    compileSpec,
    compileBlueprint,
    compileUI,
    compileCommercialModel,
    compileMaturityScores,
    compileReplicationBlueprint
  };
})();

window.ProjectCompiler = ProjectCompiler;
