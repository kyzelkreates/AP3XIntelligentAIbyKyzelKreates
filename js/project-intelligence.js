// ============================================================
// AP3X VER5E — PROJECT INTELLIGENCE ENGINE v1.0
// Generates DEEP investor, grant & build packs for YOUR projects
// Works from structured project records stored in storage.js
// SSOT: AP3X_Storage — no external APIs required
// ============================================================

const ProjectIntelligence = (() => {

  // ══════════════════════════════════════════════════════════
  // CORE: Generate complete intelligence pack for a project
  // ══════════════════════════════════════════════════════════
  function generatePack(project) {
    if (!project) return null;

    return {
      projectId:    project.id,
      projectName:  project.name,
      generatedAt:  new Date().toISOString(),
      version:      1,

      // 1. Executive Summary
      executive:    _buildExecutive(project),

      // 2. Build Structure
      buildStructure: _buildStructure(project),

      // 3. Product Analysis
      productAnalysis: _buildProductAnalysis(project),

      // 4. Investor Pack
      investorPack: _buildInvestorPack(project),

      // 5. Grant Intelligence
      grantIntelligence: _buildGrantIntelligence(project),

      // 6. Entity Map
      entityMap:    _buildEntityMap(project),

      // 7. Technical Architecture
      technicalArch: _buildTechnicalArch(project),

      // 8. Market Position
      marketPosition: _buildMarketPosition(project),

      // 9. Q&A Seed (for project AI)
      qaSeed:       _buildQASeed(project)
    };
  }

  // ══════════════════════════════════════════════════════════
  // 1. EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════════
  function _buildExecutive(p) {
    const desc    = p.description || p.summary || '';
    const name    = p.name || 'Unnamed Project';
    const type    = _inferProjectType(p);
    const stage   = p.meta?.stage || _inferStage(p);
    const tags    = p.tags || [];

    return {
      oneLiner:       _generateOneLiner(name, type, desc),
      stage,
      type,
      problemSolved:  p.meta?.problem || _inferProblem(desc),
      solution:       p.meta?.solution || _inferSolution(name, desc, tags),
      targetAudience: p.meta?.audience || _inferAudience(desc, tags),
      uniqueValue:    p.meta?.uniqueValue || _inferUVP(desc, tags),
      currentStatus:  _describeStatus(p),
      keyOutcomes:    _inferOutcomes(p)
    };
  }

  function _generateOneLiner(name, type, desc) {
    const core = desc.slice(0, 200).split(/[.!?\n]/)[0].trim();
    return name + ' is a ' + type + (core ? ' that ' + core.toLowerCase().replace(/^it\s+/, '') : '.');
  }

  function _inferProjectType(p) {
    const text = ((p.description || '') + ' ' + (p.architecture || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
    if (/pwa|progressive.?web/i.test(text))      return 'Progressive Web App (PWA)';
    if (/mobile|ios|android|react.?native/i.test(text)) return 'Mobile Application';
    if (/ai|machine.?learning|llm|gpt/i.test(text)) return 'AI-Powered System';
    if (/api|sdk|library|framework/i.test(text)) return 'Developer Platform / API';
    if (/dashboard|analytics|bi\b/i.test(text))  return 'Analytics & Intelligence Platform';
    if (/saas|subscription|multi.?tenant/i.test(text)) return 'SaaS Platform';
    if (/os|operating.?system|ecosystem/i.test(text)) return 'Intelligent OS Ecosystem';
    if (/e.?commerce|marketplace|shop/i.test(text)) return 'E-Commerce Platform';
    if (p.meta?.type) return p.meta.type;
    return 'Digital Product';
  }

  function _inferStage(p) {
    const text = ((p.description || '') + ' ' + (p.meta?.notes || '')).toLowerCase();
    if (/production|live|deployed|launched/i.test(text)) return 'Production / Live';
    if (/beta|pilot|early.?access/i.test(text))          return 'Beta / Pilot';
    if (/mvp|working.?demo|prototype/i.test(text))       return 'MVP / Working Demo';
    if (/concept|ideation|planning/i.test(text))          return 'Concept / Planning';
    return p.status === 'active' ? 'Active Development' : 'In Development';
  }

  function _inferProblem(desc) {
    const sentences = desc.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 20);
    const problemSentence = sentences.find(s => /problem|issue|challenge|difficult|lack|gap|need|struggle/i.test(s));
    return problemSentence || 'Addresses a key inefficiency in its target domain (expand in project description).';
  }

  function _inferSolution(name, desc, tags) {
    const sentences = desc.split(/[.!?\n]/).map(s => s.trim()).filter(s => s.length > 20);
    const sol = sentences.find(s => /solution|solve|enable|allow|provide|deliver|built/i.test(s));
    return sol || name + ' delivers a ' + (tags.slice(0,3).join(', ') || 'focused') + ' solution.';
  }

  function _inferAudience(desc, tags) {
    const text = (desc + ' ' + tags.join(' ')).toLowerCase();
    const audiences = [];
    if (/enterprise|corporate|business/i.test(text))   audiences.push('Enterprise businesses');
    if (/startup|sme|small.?business/i.test(text))     audiences.push('Startups & SMEs');
    if (/developer|engineer|technical/i.test(text))    audiences.push('Developers & technical teams');
    if (/consumer|user|individual|person/i.test(text)) audiences.push('End consumers');
    if (/agency|creative|studio/i.test(text))          audiences.push('Creative agencies');
    if (/health|medical|clinic/i.test(text))           audiences.push('Healthcare professionals');
    if (/education|student|school/i.test(text))        audiences.push('Educational institutions');
    return audiences.length > 0 ? audiences.join(', ') : 'Broad market (define target in project notes)';
  }

  function _inferUVP(desc, tags) {
    const text = (desc + ' ' + tags.join(' ')).toLowerCase();
    const props = [];
    if (/local.?first|offline|no.?backend/i.test(text)) props.push('Local-first, fully offline capable');
    if (/ai|intelligent|smart/i.test(text))              props.push('AI-native intelligence layer');
    if (/real.?time|live/i.test(text))                   props.push('Real-time processing and updates');
    if (/open.?source/i.test(text))                      props.push('Open-source with community model');
    if (/pwa|installable/i.test(text))                   props.push('Installable PWA — no app store needed');
    if (/privacy|secure|local/i.test(text))              props.push('Privacy-first, data stays local');
    if (/modular|extensible|plugin/i.test(text))         props.push('Modular and extensible architecture');
    return props.length > 0 ? props.join(' · ') : 'Unique value proposition — detail in project description';
  }

  function _describeStatus(p) {
    const age = p.createdAt ? Math.floor((Date.now() - new Date(p.createdAt).getTime()) / 86400000) : 0;
    return p.status + ' · ' + (age > 0 ? age + ' days in development' : 'newly created') + (p.meta?.version ? ' · v' + p.meta.version : '');
  }

  function _inferOutcomes(p) {
    const text = ((p.description || '') + ' ' + (p.meta?.notes || '')).toLowerCase();
    const outcomes = [];
    if (/revenue|monetis|earn|income/i.test(text))       outcomes.push('Revenue generation pathway identified');
    if (/save|efficien|automate|reduc/i.test(text))      outcomes.push('Efficiency / cost reduction potential');
    if (/scale|grow|expand/i.test(text))                 outcomes.push('Scalable architecture and growth model');
    if (/impact|community|social/i.test(text))           outcomes.push('Positive social or community impact');
    if (/data|insight|intelligence|analytics/i.test(text)) outcomes.push('Data and intelligence value creation');
    if (outcomes.length === 0) outcomes.push('Outcomes to be defined — add detail to project notes');
    return outcomes;
  }

  // ══════════════════════════════════════════════════════════
  // 2. BUILD STRUCTURE
  // ══════════════════════════════════════════════════════════
  function _buildStructure(p) {
    const arch = p.architecture || '';
    const desc = p.description  || '';
    const tags = p.tags || [];
    const text = (arch + ' ' + desc + ' ' + tags.join(' ')).toLowerCase();

    return {
      projectType:    _inferProjectType(p),
      architecture:   _parseArchitecture(arch, text),
      techStack:      _parseTechStack(arch, desc, tags),
      storageModel:   _inferStorageModel(text),
      deploymentModel:_inferDeploymentModel(text),
      offlineCapable: /offline|local.?first|pwa|service.?worker/i.test(text),
      openSource:     /open.?source|github|public.?repo/i.test(text),
      apiSurface:     _inferAPISurface(text),
      fileStructure:  p.meta?.fileStructure || _generateFileStructure(p),
      modules:        _inferModules(p)
    };
  }

  function _parseArchitecture(arch, text) {
    if (arch && arch.length > 10) return arch;
    const patterns = [];
    if (/local.?first|offline/i.test(text))      patterns.push('Local-first architecture');
    if (/ssot|single.?source/i.test(text))        patterns.push('SSOT (Single Source of Truth) pattern');
    if (/microservice/i.test(text))               patterns.push('Microservices');
    if (/monolith/i.test(text))                   patterns.push('Monolithic architecture');
    if (/serverless|edge.?function|lambda/i.test(text)) patterns.push('Serverless / Edge functions');
    if (/event.?driven|event.?bus/i.test(text))   patterns.push('Event-driven architecture');
    if (/modular|module.?based/i.test(text))      patterns.push('Modular design system');
    if (/pwa|progressive/i.test(text))            patterns.push('Progressive Web App shell');
    return patterns.length > 0 ? patterns.join(' · ') : 'Architecture details — add to project description';
  }

  function _parseTechStack(arch, desc, tags) {
    const text = (arch + ' ' + desc + ' ' + tags.join(' ')).toLowerCase();
    const stack = { frontend: [], backend: [], database: [], devops: [], ai: [] };

    // Frontend
    if (/react|next\.js/i.test(text))   stack.frontend.push('React / Next.js');
    if (/vue/i.test(text))              stack.frontend.push('Vue.js');
    if (/svelte/i.test(text))           stack.frontend.push('Svelte');
    if (/angular/i.test(text))          stack.frontend.push('Angular');
    if (/vanilla.?js|plain.?js/i.test(text)) stack.frontend.push('Vanilla JavaScript');
    if (/tailwind/i.test(text))         stack.frontend.push('Tailwind CSS');
    if (/html|css/i.test(text) && stack.frontend.length === 0) stack.frontend.push('HTML5 / CSS3 / JS');

    // Backend
    if (/node|express/i.test(text))     stack.backend.push('Node.js / Express');
    if (/deno/i.test(text))             stack.backend.push('Deno');
    if (/python|django|flask|fastapi/i.test(text)) stack.backend.push('Python');
    if (/go\b|golang/i.test(text))      stack.backend.push('Go');
    if (/rust/i.test(text))             stack.backend.push('Rust');
    if (/typescript/i.test(text))       stack.backend.push('TypeScript');
    if (/serverless|vercel|netlify/i.test(text)) stack.backend.push('Serverless functions');

    // Database
    if (/localstorage|indexeddb/i.test(text)) stack.database.push('localStorage / IndexedDB (local)');
    if (/postgres|supabase/i.test(text))      stack.database.push('PostgreSQL');
    if (/mongo/i.test(text))                  stack.database.push('MongoDB');
    if (/firebase|firestore/i.test(text))     stack.database.push('Firebase / Firestore');
    if (/sqlite/i.test(text))                 stack.database.push('SQLite');
    if (/redis/i.test(text))                  stack.database.push('Redis');
    if (/storage\.js|ssot/i.test(text) && stack.database.length === 0) stack.database.push('SSOT storage.js (local-first)');

    // DevOps
    if (/vercel/i.test(text))           stack.devops.push('Vercel');
    if (/netlify/i.test(text))          stack.devops.push('Netlify');
    if (/docker/i.test(text))           stack.devops.push('Docker');
    if (/github.?actions|ci.?cd/i.test(text)) stack.devops.push('CI/CD (GitHub Actions)');
    if (/aws|gcp|azure/i.test(text))    stack.devops.push('Cloud (AWS/GCP/Azure)');

    // AI
    if (/openai|gpt|chatgpt/i.test(text))    stack.ai.push('OpenAI / GPT');
    if (/claude|anthropic/i.test(text))      stack.ai.push('Claude / Anthropic');
    if (/gemini|google.?ai/i.test(text))     stack.ai.push('Google Gemini');
    if (/local.?llm|ollama|llama/i.test(text)) stack.ai.push('Local LLM (Ollama / Llama)');
    if (/hugging.?face/i.test(text))         stack.ai.push('Hugging Face');

    return stack;
  }

  function _inferStorageModel(text) {
    if (/ssot|single.?source/i.test(text)) return 'SSOT — storage.js single source of truth';
    if (/local.?first|localstorage/i.test(text)) return 'Local-first (localStorage / IndexedDB)';
    if (/supabase|postgres/i.test(text)) return 'Cloud-hosted relational DB (PostgreSQL)';
    if (/firebase/i.test(text)) return 'Firebase / Firestore (NoSQL cloud)';
    if (/mongo/i.test(text)) return 'MongoDB (document store)';
    return 'Storage model — specify in project description';
  }

  function _inferDeploymentModel(text) {
    if (/pwa|installable/i.test(text)) return 'PWA — installable, offline-first, no app store';
    if (/vercel/i.test(text)) return 'Vercel edge deployment';
    if (/netlify/i.test(text)) return 'Netlify static/serverless';
    if (/docker|container/i.test(text)) return 'Containerised deployment';
    if (/aws|gcp|azure/i.test(text)) return 'Cloud-hosted (major provider)';
    if (/self.?host/i.test(text)) return 'Self-hosted / on-premise';
    return 'Deployment model — specify in project description';
  }

  function _inferAPISurface(text) {
    if (/api.?first|public.?api/i.test(text)) return 'Full public API with documentation';
    if (/rest.?api|graphql/i.test(text)) return 'REST / GraphQL API layer';
    if (/sdk|library/i.test(text)) return 'SDK + library distribution';
    if (/webhook/i.test(text)) return 'Webhook-based integration';
    if (/no.*api|internal.?only/i.test(text)) return 'Internal use — no public API';
    return 'API surface — specify in project description';
  }

  function _generateFileStructure(p) {
    const type = _inferProjectType(p).toLowerCase();
    if (/pwa/i.test(type)) {
      return '/index.html\n/manifest.json\n/service-worker.js\n/css/styles.css\n/js/storage.js (SSOT)\n/js/app.js\n/icons/';
    }
    if (/api|platform/i.test(type)) {
      return '/src/\n  index.ts\n  routes/\n  services/\n  models/\n/tests/\n/README.md\npackage.json';
    }
    return 'Add file structure to project notes';
  }

  function _inferModules(p) {
    const entities = p.entities || [];
    const tags     = p.tags || [];
    const text     = ((p.description || '') + ' ' + (p.architecture || '')).toLowerCase();
    const modules  = [];

    // From entities
    for (const e of entities) {
      const name = typeof e === 'string' ? e : e.value;
      if (name && name.length > 2) modules.push({ name, source: 'entity' });
    }

    // From tags
    for (const t of tags) {
      if (!modules.some(m => m.name.toLowerCase() === t.toLowerCase())) {
        modules.push({ name: t, source: 'tag' });
      }
    }

    // From text signals
    const modPatterns = [
      { re: /auth(?:entication)?/i, name: 'Authentication Module' },
      { re: /dashboard/i,           name: 'Dashboard Module' },
      { re: /analytics/i,           name: 'Analytics Module' },
      { re: /notification/i,        name: 'Notification System' },
      { re: /payment|billing/i,     name: 'Billing Module' },
      { re: /api/i,                 name: 'API Layer' },
      { re: /storage|database/i,    name: 'Data Layer' },
      { re: /ai|intelligence/i,     name: 'AI Intelligence Module' },
      { re: /graph/i,               name: 'Knowledge Graph' },
      { re: /search/i,              name: 'Search Engine' },
      { re: /report|export/i,       name: 'Reporting Module' }
    ];

    for (const { re, name } of modPatterns) {
      if (re.test(text) && !modules.some(m => m.name === name)) {
        modules.push({ name, source: 'inferred' });
      }
    }

    return modules.slice(0, 15);
  }

  // ══════════════════════════════════════════════════════════
  // 3. PRODUCT ANALYSIS
  // ══════════════════════════════════════════════════════════
  function _buildProductAnalysis(p) {
    const text = ((p.description || '') + ' ' + (p.architecture || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
    return {
      category:         _inferProjectType(p),
      stage:            _inferStage(p),
      completeness:     _scoreCompleteness(p),
      featureSet:       _inferFeatures(text),
      differentiators:  _inferDifferentiators(text),
      limitations:      _inferLimitations(p, text),
      readiness:        _inferReadiness(p, text)
    };
  }

  function _scoreCompleteness(p) {
    let score = 0;
    const checks = [
      { pass: !!(p.name && p.name.length > 3),               weight: 10, label: 'Has name' },
      { pass: !!(p.description && p.description.length > 50), weight: 15, label: 'Has description' },
      { pass: !!(p.architecture && p.architecture.length > 20),weight: 15, label: 'Has architecture' },
      { pass: !!(p.tags && p.tags.length >= 3),              weight: 10, label: 'Has tags' },
      { pass: !!(p.entities && p.entities.length >= 2),      weight: 10, label: 'Has entities' },
      { pass: !!(p.meta?.problem),                           weight: 10, label: 'Problem defined' },
      { pass: !!(p.meta?.solution),                          weight: 10, label: 'Solution defined' },
      { pass: !!(p.meta?.audience),                          weight: 10, label: 'Audience defined' },
      { pass: !!(p.meta?.stage),                             weight: 5,  label: 'Stage defined' },
      { pass: !!(p.meta?.revenue || p.meta?.businessModel),  weight: 5,  label: 'Business model noted' }
    ];
    const results = checks.map(c => ({ ...c, scored: c.pass ? c.weight : 0 }));
    for (const r of results) score += r.scored;
    return { score, checks: results };
  }

  function _inferFeatures(text) {
    const features = [];
    const patterns = [
      { re: /dashboard/i,         name: 'Dashboard & Analytics',      type: 'core' },
      { re: /auth|login|signup/i, name: 'User Authentication',        type: 'core' },
      { re: /ai|intelligence|ml/i,name: 'AI/ML Intelligence',         type: 'core' },
      { re: /search/i,            name: 'Search & Discovery',         type: 'core' },
      { re: /notification/i,      name: 'Notifications',              type: 'ux' },
      { re: /real.?time|live/i,   name: 'Real-time Updates',          type: 'core' },
      { re: /offline|local.?first/i, name: 'Offline-first Mode',      type: 'arch' },
      { re: /export|report/i,     name: 'Export & Reporting',         type: 'core' },
      { re: /graph|network/i,     name: 'Knowledge Graph',            type: 'core' },
      { re: /api/i,               name: 'API Integration Layer',      type: 'tech' },
      { re: /payment|billing/i,   name: 'Billing & Payments',         type: 'business' },
      { re: /install|pwa/i,       name: 'PWA Install / Home Screen',  type: 'ux' },
      { re: /security|scan|audit/i, name: 'Security Audit Tools',     type: 'core' },
      { re: /clone|reverse.?engin/i, name: 'Reverse Engineering Tools', type: 'core' },
      { re: /ingestion|ingest/i,  name: 'Intelligence Ingestion',     type: 'core' }
    ];
    for (const { re, name, type } of patterns) {
      if (re.test(text)) features.push({ name, type });
    }
    return features;
  }

  function _inferDifferentiators(text) {
    const diffs = [];
    if (/local.?first|offline/i.test(text))    diffs.push('Local-first / offline-capable — no backend dependency');
    if (/ssot/i.test(text))                    diffs.push('SSOT architecture — single source of truth');
    if (/ai.*local|local.*ai/i.test(text))     diffs.push('AI runs client-side — privacy preserving');
    if (/no.*backend|no.*server/i.test(text))  diffs.push('No backend required — dramatically lowers cost to run');
    if (/pwa/i.test(text))                     diffs.push('PWA — cross-platform install, no app store');
    if (/modular/i.test(text))                 diffs.push('Fully modular — composable feature set');
    if (/open.?source/i.test(text))            diffs.push('Open-source — community-driven development');
    if (diffs.length === 0) diffs.push('Unique differentiators — add to project description');
    return diffs;
  }

  function _inferLimitations(p, text) {
    const limits = [];
    const comp = _scoreCompleteness(p);
    if (comp.score < 40) limits.push('Project record incomplete — richer data = better intelligence');
    if (!/auth/i.test(text)) limits.push('No authentication system described');
    if (!/test|spec/i.test(text)) limits.push('No testing strategy documented');
    if (!/monetis|revenue|business.?model/i.test(text)) limits.push('Business/monetisation model not defined');
    if (!/scale|scalab/i.test(text)) limits.push('Scaling strategy not documented');
    return limits.slice(0, 5);
  }

  function _inferReadiness(p, text) {
    const comp = _scoreCompleteness(p);
    if (comp.score >= 80) return { level: 'INVESTOR READY', colour: '#00FF88', note: 'Strong project record — ready for deck' };
    if (comp.score >= 55) return { level: 'NEAR READY', colour: '#F5A623', note: 'Add business model and audience details' };
    if (comp.score >= 30) return { level: 'IN PROGRESS', colour: '#D4AF37', note: 'Expand description and architecture docs' };
    return { level: 'EARLY STAGE', colour: '#FF5050', note: 'Add more project details to improve intelligence' };
  }

  // ══════════════════════════════════════════════════════════
  // 4. INVESTOR PACK
  // ══════════════════════════════════════════════════════════
  function _buildInvestorPack(p) {
    const text = ((p.description || '') + ' ' + (p.architecture || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();

    return {
      elevatorPitch:    _generateElevatorPitch(p, text),
      problemStatement: _generateProblemStatement(p, text),
      solutionStatement:_generateSolutionStatement(p, text),
      traction:         _generateTraction(p, text),
      businessModel:    _generateBusinessModel(p, text),
      marketOpportunity:_generateMarketOpp(p, text),
      competitiveAdvantage: _generateCompetitiveAdv(p, text),
      roadmap:          _generateRoadmap(p, text),
      teamSignals:      _generateTeamSignals(p),
      askSuggestion:    _generateAsk(p, text),
      fullPitchScript:  _generatePitchScript(p, text)
    };
  }

  function _generateElevatorPitch(p, text) {
    const name     = p.name;
    const type     = _inferProjectType(p);
    const audience = p.meta?.audience || _inferAudience(p.description || '', p.tags || []);
    const problem  = p.meta?.problem || _inferProblem(p.description || '');
    const uvp      = p.meta?.uniqueValue || _inferUVP(p.description || '', p.tags || []);
    const stage    = _inferStage(p);
    return name + ' is a ' + type + ' built for ' + audience + '. It solves: ' + problem.slice(0,120) + '. What makes it unique: ' + uvp.split('·')[0].trim() + '. Currently at ' + stage + ' stage.';
  }

  function _generateProblemStatement(p, text) {
    return p.meta?.problem ||
      'The problem ' + p.name + ' addresses is currently underdocumented. ' +
      'Add a clear problem statement to project notes: what pain does this solve? ' +
      'Who suffers from it? What is the cost of the problem? What are existing broken solutions?';
  }

  function _generateSolutionStatement(p, text) {
    const desc = p.description || '';
    return p.meta?.solution || desc.slice(0, 300) || 'Add solution statement to project notes.';
  }

  function _generateTraction(p, text) {
    const items = [];
    if (p.meta?.users)     items.push('Users / signups: ' + p.meta.users);
    if (p.meta?.revenue)   items.push('Revenue: ' + p.meta.revenue);
    if (p.meta?.github)    items.push('GitHub: ' + p.meta.github);
    if (p.meta?.demos)     items.push('Demos completed: ' + p.meta.demos);
    if (p.meta?.traction)  items.push(p.meta.traction);
    if (/live|production|deployed/i.test(text)) items.push('Live / deployed product');
    if (/mvp|demo/i.test(text))                 items.push('Working MVP / demo available');
    if (items.length === 0) items.push('Add traction metrics to project meta (users, revenue, signups, demos)');
    return items;
  }

  function _generateBusinessModel(p, text) {
    const models = [];
    if (p.meta?.businessModel) return { detected: [p.meta.businessModel], hypothesis: p.meta.businessModel };
    if (/subscription|monthly|annual/i.test(text)) models.push('SaaS Subscription');
    if (/freemium/i.test(text))                    models.push('Freemium → Paid');
    if (/marketplace/i.test(text))                 models.push('Marketplace / Commission');
    if (/open.?source.*pro|community.*enterprise/i.test(text)) models.push('Open-core');
    if (/grant|funding|non.?profit/i.test(text))   models.push('Grant / Public funding');
    if (/api.*pay|usage.?based/i.test(text))       models.push('Usage-based API pricing');
    if (models.length === 0) models.push('Business model not defined — add to project meta');
    const hypothesis = models[0] === 'SaaS Subscription'
      ? 'Monthly per-user or per-seat subscription with annual discount'
      : models[0] === 'Freemium → Paid'
      ? 'Free tier for adoption, paid tier for advanced features'
      : models[0];
    return { detected: models, hypothesis };
  }

  function _generateMarketOpp(p, text) {
    const type = _inferProjectType(p).toLowerCase();
    const sizing = {
      'ai': { tam: '$1.8T by 2030 (AI market)', sam: 'Intelligence tooling segment', som: 'Local-first AI tools niche' },
      'pwa': { tam: '$10B+ mobile + web tools market', sam: 'Cross-platform app development', som: 'Privacy-first installable apps' },
      'saas': { tam: '$1T+ global SaaS market by 2030', sam: 'Relevant vertical SaaS segment', som: 'Addressable buyer segment' },
      'developer': { tam: '$700B+ developer tools market', sam: 'API / SDK tooling', som: 'Target developer community' },
      'analytics': { tam: '$550B+ analytics & BI market', sam: 'Intelligence platform segment', som: 'Target use case' },
      'security': { tam: '$400B+ cybersecurity market', sam: 'Web security audit tools', som: 'SMB / indie developer market' }
    };
    const match = Object.entries(sizing).find(([k]) => type.includes(k)) || [null, sizing['saas']];
    return {
      ...match[1],
      note: 'Market sizing is illustrative — replace with primary research for investor decks',
      growthDriver: p.meta?.marketGrowth || 'Add market growth driver to project meta'
    };
  }

  function _generateCompetitiveAdv(p, text) {
    return {
      moat: _inferDifferentiators(text),
      defensibility: [
        /local.?first/i.test(text) ? 'Data locality creates switching cost' : null,
        /ai/i.test(text) ? 'AI models improve with use — data flywheel' : null,
        /open.?source/i.test(text) ? 'Community moat — contributors and ecosystem' : null,
        /modular/i.test(text) ? 'Modular architecture enables fast feature expansion' : null
      ].filter(Boolean)
    };
  }

  function _generateRoadmap(p, text) {
    return {
      current:  p.meta?.currentMilestone || _inferStage(p),
      next3months: p.meta?.roadmapNext || 'Define next milestone in project meta',
      next12months: p.meta?.roadmap12m || 'Define 12-month vision in project meta',
      longTerm: p.meta?.vision || 'Define long-term vision in project meta'
    };
  }

  function _generateTeamSignals(p) {
    return {
      creator: p.meta?.creator || 'Kyzel Kreates',
      roles:   p.meta?.team    || 'Solo founder / Add team details to project meta',
      note:    'Add LinkedIn, GitHub, and team bios to project meta for investor packs'
    };
  }

  function _generateAsk(p, text) {
    const stage = _inferStage(p).toLowerCase();
    if (/production|live/i.test(stage)) return { amount: 'Series A+ / Growth funding', use: 'Scale go-to-market, hire team, expand infrastructure' };
    if (/mvp|beta/i.test(stage))        return { amount: 'Seed round ($250K–$2M typical)', use: 'Complete product, acquire first customers, build team' };
    return { amount: 'Pre-seed / Accelerator / Grant', use: 'Reach MVP and validate market fit' };
  }

  function _generatePitchScript(p, text) {
    const exec = _buildExecutive(p);
    const inv  = _generateBusinessModel(p, text);
    return [
      '=== 60-SECOND PITCH SCRIPT ===',
      '',
      'HOOK: "Imagine ' + (exec.targetAudience.split(',')[0] || 'businesses') + ' being able to [core value] — without [current friction]."',
      '',
      'PROBLEM: ' + exec.problemSolved,
      '',
      'SOLUTION: ' + p.name + ' — ' + exec.oneLiner,
      '',
      'TRACTION: ' + (p.meta?.traction || 'Working prototype / demo available'),
      '',
      'BUSINESS MODEL: ' + inv.hypothesis,
      '',
      'THE ASK: ' + _generateAsk(p, text).amount,
      '',
      'USE OF FUNDS: ' + _generateAsk(p, text).use,
      '',
      '=== END SCRIPT ==='
    ].join('\n');
  }

  // ══════════════════════════════════════════════════════════
  // 5. GRANT INTELLIGENCE
  // ══════════════════════════════════════════════════════════
  function _buildGrantIntelligence(p) {
    const text = ((p.description || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
    const type = _inferProjectType(p).toLowerCase();

    const grantTypes = [];
    const eligibility = [];
    const tips = [];

    // UK / International grant signals
    if (/ai|machine.?learning|intelligence/i.test(text)) {
      grantTypes.push({ name: 'Innovate UK — AI & Data Programme', fit: 'HIGH', region: 'UK', notes: 'Specifically funds AI tools and platforms. Apply via Innovation Funding Service.' });
      grantTypes.push({ name: 'AI & Future of Digital Economy (UKRI)', fit: 'HIGH', region: 'UK', notes: 'UKRI funds AI research with commercial application.' });
    }
    if (/pwa|offline|local.?first|privacy/i.test(text)) {
      grantTypes.push({ name: 'Privacy-preserving technology grants (NGI)', fit: 'MEDIUM', region: 'EU/International', notes: 'Next Generation Internet programme funds privacy-first tech.' });
    }
    if (/open.?source/i.test(text)) {
      grantTypes.push({ name: 'Sovereign Tech Fund', fit: 'MEDIUM', region: 'EU', notes: 'Funds open-source digital infrastructure projects.' });
      grantTypes.push({ name: 'Mozilla Foundation grants', fit: 'MEDIUM', region: 'International', notes: 'Funds open-source, privacy and web freedom projects.' });
    }
    if (/health|medical|wellness/i.test(text)) {
      grantTypes.push({ name: 'NIHR (National Institute for Health Research)', fit: 'HIGH', region: 'UK', notes: 'UK health tech innovation funding.' });
      grantTypes.push({ name: 'Innovate UK — Health & Life Sciences', fit: 'HIGH', region: 'UK', notes: 'Competitive grants for health technology.' });
    }
    if (/education|learn|school|student/i.test(text)) {
      grantTypes.push({ name: 'Ufi VocTech Trust', fit: 'HIGH', region: 'UK', notes: 'Funds digital vocational learning tools.' });
      grantTypes.push({ name: 'Education Endowment Foundation', fit: 'MEDIUM', region: 'UK', notes: 'Funds EdTech with evidence-based impact.' });
    }
    if (/security|cyber|audit/i.test(text)) {
      grantTypes.push({ name: 'NCSC Cyber Accelerator', fit: 'HIGH', region: 'UK', notes: 'National Cyber Security Centre supports cyber tooling startups.' });
      grantTypes.push({ name: 'Innovate UK — Cyber Security', fit: 'HIGH', region: 'UK', notes: 'R&D funding for security tools.' });
    }

    // Always applicable
    grantTypes.push({ name: 'Innovate UK Smart Grant', fit: 'MEDIUM', region: 'UK', notes: 'Open R&D funding for innovative UK businesses. Multiple rounds per year.' });
    grantTypes.push({ name: 'Startup Loans (British Business Bank)', fit: 'MEDIUM', region: 'UK', notes: 'Government-backed loans £500–£25K for UK startups. Not a grant but favourable terms.' });
    grantTypes.push({ name: 'R&D Tax Credits (HMRC)', fit: 'HIGH', region: 'UK', notes: 'Claim back 33% of qualifying R&D costs as a startup. Not a grant but equivalent impact.' });

    // Eligibility signals
    if (p.status === 'active') eligibility.push('Active project — eligible for most innovation grants');
    if (p.meta?.creator === 'Kyzel Kreates' || !p.meta?.teamSize || p.meta.teamSize < 5) {
      eligibility.push('Solo / micro-team — eligible for early-stage and founder grants');
    }
    if (/uk|london|britain/i.test(text)) eligibility.push('UK-based project — eligible for Innovate UK programmes');
    if (/open.?source/i.test(text)) eligibility.push('Open-source — eligible for tech sovereignty grants');

    // Tips
    tips.push('Document your R&D activity weekly — essential for HMRC R&D tax credit claims');
    tips.push('Frame the project around "innovation" and "technical uncertainty" for Innovate UK eligibility');
    tips.push('Build a clear impact narrative (jobs, economic value, social benefit) before applying');
    tips.push('Register on the Innovation Funding Service (IFS): apply.ukri.org');
    if (/ai/i.test(text)) tips.push('Join the AI UK community and Innovate UK AI network for early grant alerts');

    return {
      grantTypes: grantTypes.slice(0, 8),
      eligibility,
      tips,
      disclaimer: 'Grant information is indicative — always verify current rounds and eligibility at gov.uk/innovate-uk and ukri.org'
    };
  }

  // ══════════════════════════════════════════════════════════
  // 6. ENTITY MAP
  // ══════════════════════════════════════════════════════════
  function _buildEntityMap(p) {
    const raw     = p.entities || [];
    const entities = raw.map(e => ({
      value:      typeof e === 'string' ? e : (e.value || ''),
      type:       typeof e === 'string' ? 'concept' : (e.type || 'concept'),
      confidence: typeof e === 'string' ? 0.7 : (e.confidence || 0.7),
      role:       _inferEntityRole(typeof e === 'string' ? e : e.value)
    }));

    const systemEntities = entities.filter(e => e.type === 'system');
    const conceptEntities = entities.filter(e => e.type === 'concept');
    const metricEntities  = entities.filter(e => e.type === 'metric');
    const funcEntities    = entities.filter(e => e.type === 'function');

    return {
      total: entities.length,
      all:   entities,
      byType: { system: systemEntities, concept: conceptEntities, metric: metricEntities, function: funcEntities },
      relationships: _inferEntityRelationships(entities, p.name),
      searchable: entities.map(e => e.value)
    };
  }

  function _inferEntityRole(name) {
    if (!name) return 'concept';
    const n = name.toLowerCase();
    if (/engine|processor|manager|controller|handler/i.test(n)) return 'system component';
    if (/module|layer|service|api/i.test(n)) return 'architectural element';
    if (/user|customer|client|patient/i.test(n)) return 'actor';
    if (/data|record|event|log/i.test(n)) return 'data entity';
    if (/flow|process|workflow|pipeline/i.test(n)) return 'process';
    return 'concept';
  }

  function _inferEntityRelationships(entities, projectName) {
    const rels = [];
    for (let i = 0; i < entities.length && i < 8; i++) {
      for (let j = i + 1; j < entities.length && j < 8; j++) {
        const a = entities[i].value;
        const b = entities[j].value;
        if (a && b) rels.push({ from: a, to: b, rel: 'related-to', project: projectName });
      }
    }
    return rels.slice(0, 20);
  }

  // ══════════════════════════════════════════════════════════
  // 7. TECHNICAL ARCHITECTURE
  // ══════════════════════════════════════════════════════════
  function _buildTechnicalArch(p) {
    const text = ((p.description || '') + ' ' + (p.architecture || '')).toLowerCase();
    const stack = _parseTechStack(p.architecture || '', p.description || '', p.tags || []);

    return {
      stack,
      patterns:   _parseArchitecture(p.architecture || '', text).split(' · ').filter(Boolean),
      dataFlow:   _inferDataFlow(text),
      securityNotes: _inferSecurityNotes(text),
      scalabilityNotes: _inferScalabilityNotes(text),
      integrations: _inferIntegrations(text)
    };
  }

  function _inferDataFlow(text) {
    if (/ssot|single.?source/i.test(text)) return 'All data flows through SSOT (storage.js) — no fragmented state';
    if (/event.?driven/i.test(text)) return 'Event-driven: actions emit events → handlers update state';
    if (/api.*backend/i.test(text)) return 'Client → REST API → Backend → DB → Response';
    return 'Data flow — document in project architecture notes';
  }

  function _inferSecurityNotes(text) {
    const notes = [];
    if (/local.?first|no.?backend/i.test(text)) notes.push('No server-side data — eliminates data breach attack surface');
    if (/auth|authentication/i.test(text))       notes.push('Authentication layer implemented');
    if (/csrf|xss|csp/i.test(text))              notes.push('Frontend security hardening considered');
    if (notes.length === 0) notes.push('Document security considerations in project notes');
    return notes;
  }

  function _inferScalabilityNotes(text) {
    const notes = [];
    if (/local.?first/i.test(text)) notes.push('Local-first = infinitely scalable (no server cost per user)');
    if (/serverless|edge/i.test(text)) notes.push('Serverless scales automatically with demand');
    if (/cache|cdn/i.test(text)) notes.push('CDN / caching for performance at scale');
    if (notes.length === 0) notes.push('Add scalability strategy to project architecture docs');
    return notes;
  }

  function _inferIntegrations(text) {
    const integrations = [];
    if (/stripe/i.test(text))     integrations.push('Stripe (payments)');
    if (/openai/i.test(text))     integrations.push('OpenAI API');
    if (/github/i.test(text))     integrations.push('GitHub');
    if (/google/i.test(text))     integrations.push('Google APIs');
    if (/supabase/i.test(text))   integrations.push('Supabase');
    if (/vercel/i.test(text))     integrations.push('Vercel');
    if (integrations.length === 0) integrations.push('No external integrations detected in description');
    return integrations;
  }

  // ══════════════════════════════════════════════════════════
  // 8. MARKET POSITION
  // ══════════════════════════════════════════════════════════
  function _buildMarketPosition(p) {
    const text = ((p.description || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();
    return {
      positioning:    _inferPositioning(text),
      buyerJourney:   _inferBuyerJourney(text),
      competitors:    _inferCompetitors(p, text),
      pricingModel:   p.meta?.pricing || _inferPricingModel(text),
      goToMarket:     _inferGTM(text)
    };
  }

  function _inferPositioning(text) {
    if (/enterprise/i.test(text)) return 'Enterprise — top-down sales, compliance-focused';
    if (/developer|api.?first/i.test(text)) return 'Developer-led PLG (product-led growth)';
    if (/no.?code|simple.*tool/i.test(text)) return 'No-code / prosumer tool — self-serve';
    if (/local.?first|privacy/i.test(text)) return 'Privacy-first / local-first — anti-SaaS positioning';
    return 'General market — positioning to be refined';
  }

  function _inferBuyerJourney(text) {
    if (/free.*trial|freemium/i.test(text)) return 'Free signup → activation → convert to paid';
    if (/demo|sales/i.test(text)) return 'Discovery → demo request → sales conversation → close';
    if (/open.?source/i.test(text)) return 'OSS discovery → community → enterprise upsell';
    return 'Define buyer journey in project notes';
  }

  function _inferCompetitors(p, text) {
    const type = _inferProjectType(p).toLowerCase();
    if (/ai/i.test(type))       return ['OpenAI tools', 'Hugging Face', 'Relevance AI', 'Claude Projects'];
    if (/security/i.test(type)) return ['VirusTotal', 'Snyk', 'Detectify', 'SecurityHeaders.com'];
    if (/analytics/i.test(type))return ['Mixpanel', 'Amplitude', 'PostHog', 'Datadog'];
    if (/saas/i.test(type))     return ['Notion', 'Monday.com', 'Airtable', 'Linear'];
    return ['Identify direct competitors and add to project meta'];
  }

  function _inferPricingModel(text) {
    if (/free/i.test(text) && /pro|paid|premium/i.test(text)) return 'Freemium (free tier + paid upgrades)';
    if (/subscription/i.test(text)) return 'Subscription (monthly/annual)';
    if (/one.?time|lifetime/i.test(text)) return 'One-time purchase / lifetime deal';
    if (/open.?source/i.test(text)) return 'Open-source + commercial licence / enterprise plan';
    return 'Pricing model — add to project meta';
  }

  function _inferGTM(text) {
    const channels = [];
    if (/github/i.test(text))         channels.push('GitHub (developer discovery)');
    if (/product.?hunt/i.test(text))  channels.push('Product Hunt launch');
    if (/twitter|x\.com/i.test(text)) channels.push('Twitter / X (social growth)');
    if (/content|blog|seo/i.test(text)) channels.push('Content marketing / SEO');
    if (/community/i.test(text))      channels.push('Community-led growth');
    if (channels.length === 0)        channels.push('Define GTM channels in project meta');
    return channels;
  }

  // ══════════════════════════════════════════════════════════
  // 9. Q&A SEED (for ProjectAI)
  // ══════════════════════════════════════════════════════════
  function _buildQASeed(p) {
    const exec = _buildExecutive(p);
    const inv  = _buildInvestorPack(p);
    const pairs = [
      { q: 'What is ' + p.name + '?',                    a: exec.oneLiner },
      { q: 'What problem does ' + p.name + ' solve?',    a: exec.problemSolved },
      { q: 'Who is the target audience?',                a: exec.targetAudience },
      { q: 'What stage is ' + p.name + ' at?',           a: exec.stage },
      { q: 'What makes ' + p.name + ' unique?',          a: exec.uniqueValue },
      { q: 'What is the business model?',                a: inv.businessModel.hypothesis },
      { q: 'What is the tech stack?',                    a: _techStackSummary(_buildStructure(p).techStack) },
      { q: 'Is this open source?',                       a: _buildStructure(p).openSource ? 'Yes — open source.' : 'Not currently open source.' },
      { q: 'Can it work offline?',                       a: _buildStructure(p).offlineCapable ? 'Yes — built local-first, works fully offline.' : 'Requires internet connection.' },
      { q: 'What is the current status?',                a: exec.currentStatus },
      { q: 'How was this built?',                        a: p.architecture || 'See technical architecture in project notes.' },
      { q: 'What grants might this qualify for?',        a: 'See grant intelligence tab for specific programmes.' },
      { q: 'What is the elevator pitch?',                a: inv.elevatorPitch }
    ];
    return pairs.filter(pair => pair.a && pair.a.length > 5);
  }

  function _techStackSummary(stack) {
    const parts = [];
    if (stack.frontend.length) parts.push('Frontend: ' + stack.frontend.join(', '));
    if (stack.backend.length)  parts.push('Backend: ' + stack.backend.join(', '));
    if (stack.database.length) parts.push('Database: ' + stack.database.join(', '));
    if (stack.ai.length)       parts.push('AI: ' + stack.ai.join(', '));
    return parts.join(' · ') || 'Tech stack — add to project description';
  }

  // ── SSOT: save/load packs ─────────────────────────────────
  function savePack(pack) {
    const db = AP3X_Storage.getDB();
    if (!Array.isArray(db.project_intelligence_packs)) db.project_intelligence_packs = [];
    const idx = db.project_intelligence_packs.findIndex(p => p.projectId === pack.projectId);
    if (idx >= 0) db.project_intelligence_packs[idx] = pack;
    else db.project_intelligence_packs.push(pack);
    AP3X_Storage.saveDB(db);
    return pack;
  }

  function getPack(projectId) {
    const db = AP3X_Storage.getDB();
    return (db.project_intelligence_packs || []).find(p => p.projectId === projectId) || null;
  }

  function getAllPacks() {
    const db = AP3X_Storage.getDB();
    return db.project_intelligence_packs || [];
  }

  function generateAndSave(project) {
    const pack = generatePack(project);
    if (pack) savePack(pack);
    return pack;
  }

  return {
    generatePack,
    generateAndSave,
    savePack,
    getPack,
    getAllPacks
  };
})();

window.ProjectIntelligence = ProjectIntelligence;
