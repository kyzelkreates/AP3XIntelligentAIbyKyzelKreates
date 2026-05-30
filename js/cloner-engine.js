// ============================================================
// AP3X VER5E — SITE → SYSTEM CLONER INTELLIGENT AGENT v1.0
// Module 6: DOM Analysis · Structural Interpretation ·
//           System Architecture · Clone Prompt · PWA Scaffold
// SSOT: storage.js — all output via AP3X_Storage.saveRecord()
// ============================================================

const ClonerEngine = (() => {

  // ══════════════════════════════════════════════════════════
  // STAGE 1 — DOM STRUCTURE EXTRACTOR
  // Input: raw snapshot from crawler
  // Output: structured DOM map with hierarchy + interaction pts
  // ══════════════════════════════════════════════════════════
  function extractDOMStructure(snapshot, jobId) {
    const html = snapshot.rawHtml || '';
    const text = snapshot.text  || '';

    // ── Page hierarchy tree ──────────────────────────────────
    const pageTree = _buildPageTree(snapshot);

    // ── Component graph ──────────────────────────────────────
    const componentGraph = _buildComponentGraph(html, snapshot);

    // ── Interaction points ───────────────────────────────────
    const interactionPoints = _extractInteractionPoints(html, snapshot);

    // ── Content blocks ───────────────────────────────────────
    const contentBlocks = _extractContentBlocks(html, snapshot);

    // ── DOM signals ──────────────────────────────────────────
    const domSignals = _extractDOMSignals(html);

    return {
      jobId,
      stage: 'dom_structure',
      extractedAt: new Date().toISOString(),
      pageTree,
      componentGraph,
      interactionPoints,
      contentBlocks,
      domSignals
    };
  }

  function _buildPageTree(snapshot) {
    const pages = {};
    const base  = (() => { try { return new URL(snapshot.url).hostname; } catch { return ''; } })();

    // Root
    pages['/'] = { path: '/', label: 'Home', depth: 0, children: [], type: 'page' };

    // From navigation
    for (const nav of (snapshot.navigation || [])) {
      const path = '/' + nav.toLowerCase().replace(/\s+/g, '-');
      pages[path] = { path, label: nav, depth: 1, children: [], type: 'nav-page', parent: '/' };
      pages['/'].children.push(path);
    }

    // From links
    try {
      for (const link of (snapshot.links || [])) {
        try {
          const u = new URL(link);
          if (u.hostname.includes(base)) {
            const p = u.pathname;
            if (!pages[p] && p !== '/') {
              const depth = p.split('/').filter(Boolean).length;
              const label = p.split('/').pop()?.replace(/-/g,' ').replace(/_/g,' ') || p;
              const parent = '/' + p.split('/').filter(Boolean).slice(0,-1).join('/');
              pages[p] = { path: p, label: _titleCase(label), depth, children: [], type: 'inferred-page', parent };
              if (pages[parent]) pages[parent].children.push(p);
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    return {
      root: '/',
      nodes: Object.values(pages).slice(0, 30),
      totalPages: Object.keys(pages).length
    };
  }

  function _buildComponentGraph(html, snapshot) {
    const components = [];
    const seen = new Set();

    const add = (name, type, source, props = {}) => {
      if (seen.has(name)) return;
      seen.add(name);
      components.push({ name, type, source, ...props });
    };

    // Layout components
    if (/<header/i.test(html))                         add('Header',           'layout',    'dom');
    if (/<nav/i.test(html))                            add('Navigation',       'layout',    'dom');
    if (/<footer/i.test(html))                         add('Footer',           'layout',    'dom');
    if (/<aside|sidebar/i.test(html))                  add('Sidebar',          'layout',    'dom');
    if (/<main/i.test(html))                           add('Main Content',     'layout',    'dom');

    // Interactive
    const formCount = (snapshot.forms || []).length;
    if (formCount > 0)                                 add(`Forms (${formCount})`, 'interactive', 'dom', { count: formCount });
    const btnCount = (snapshot.buttons || []).length;
    if (btnCount > 0)                                  add(`Buttons (${btnCount})`, 'interactive', 'dom', { count: btnCount });
    if (/<input/i.test(html))                          add('Input Fields',     'interactive', 'dom');
    if (/<select/i.test(html))                         add('Dropdowns',        'interactive', 'dom');
    if (/<textarea/i.test(html))                       add('Text Areas',       'interactive', 'dom');
    if (/<dialog|modal|overlay/i.test(html))           add('Modal/Dialog',     'interactive', 'inferred');

    // Data display
    if (/<table/i.test(html))                          add('Data Table',       'display',   'dom');
    if (/<ul|<ol/i.test(html))                         add('List Component',   'display',   'dom');
    if (/<canvas/i.test(html))                         add('Canvas Element',   'display',   'dom');
    if (/chart|graph|recharts|d3|plotly/i.test(html))  add('Chart Component',  'display',   'inferred');
    if (/<img|<video|<audio/i.test(html))              add('Media Component',  'display',   'dom');
    if (/<svg/i.test(html))                            add('SVG/Icons',        'display',   'dom');

    // Content
    const h1s = (snapshot.headings?.h1 || []).length;
    const h2s = (snapshot.headings?.h2 || []).length;
    if (h1s > 0) add(`Hero/H1 Block (${h1s})`,        'content',   'dom', { headings: h1s });
    if (h2s > 0) add(`Section Headings (${h2s})`,     'content',   'dom', { headings: h2s });
    if (/pricing|plan|tier/i.test(snapshot.text))      add('Pricing Cards',    'content',   'inferred');
    if (/testimonial|review|quote/i.test(snapshot.text)) add('Testimonial Block','content', 'inferred');
    if (/faq|frequently asked/i.test(snapshot.text))   add('FAQ Section',      'content',   'inferred');
    if (/blog|article|post/i.test(snapshot.text))      add('Blog/Article Feed','content',   'inferred');
    if (/newsletter|subscribe/i.test(snapshot.text))   add('Email Capture',    'content',   'inferred');

    // Relationship edges
    const edges = [];
    if (seen.has('Navigation') && seen.has('Header'))    edges.push({ from: 'Header', to: 'Navigation', rel: 'contains' });
    if (seen.has('Forms (1)') || formCount > 0)          edges.push({ from: 'Main Content', to: `Forms (${formCount})`, rel: 'contains' });
    if (seen.has('Sidebar') && seen.has('Main Content')) edges.push({ from: 'Sidebar', to: 'Main Content', rel: 'sibling' });

    return { nodes: components, edges };
  }

  function _extractInteractionPoints(html, snapshot) {
    const points = [];

    // Form interactions
    for (const form of (snapshot.forms || [])) {
      points.push({
        type:    'form-submit',
        element: 'FORM',
        action:  form.action || 'inferred-endpoint',
        inputs:  form.inputs || [],
        trigger: 'submit',
        result:  _inferFormResult(form)
      });
    }

    // Button interactions
    for (const btn of (snapshot.buttons || []).slice(0, 15)) {
      if (btn.length < 2) continue;
      points.push({
        type:    'button-click',
        element: 'BUTTON',
        label:   btn,
        trigger: 'click',
        result:  _inferButtonResult(btn)
      });
    }

    // Navigation
    for (const nav of (snapshot.navigation || []).slice(0, 10)) {
      points.push({
        type:    'navigation',
        element: 'LINK',
        label:   nav,
        trigger: 'click',
        result:  `Navigate to ${nav} page`
      });
    }

    return points.slice(0, 40);
  }

  function _inferFormResult(form) {
    const inputs = (form.inputs || []).join(' ').toLowerCase();
    if (/email|password|signin|login/i.test(inputs + form.action)) return 'Authenticate user → redirect to dashboard';
    if (/email|name|signup|register/i.test(inputs + form.action))  return 'Create account → send verification email';
    if (/search|query/i.test(inputs + form.action))                 return 'Execute search → display results';
    if (/message|contact|subject/i.test(inputs + form.action))      return 'Send message → confirmation';
    return 'Submit data → process and respond';
  }

  function _inferButtonResult(label) {
    const l = label.toLowerCase();
    if (/sign.?up|register|get.?started|create/i.test(l)) return 'Open signup flow';
    if (/sign.?in|log.?in/i.test(l))                      return 'Open login modal/page';
    if (/demo|book/i.test(l))                              return 'Open demo booking flow';
    if (/download|install/i.test(l))                       return 'Trigger download';
    if (/upgrade|buy|purchase|subscribe/i.test(l))         return 'Open payment/upgrade flow';
    if (/learn.?more|read.?more/i.test(l))                 return 'Navigate to detail page';
    return 'Trigger UI action or navigation';
  }

  function _extractContentBlocks(html, snapshot) {
    const blocks = [];
    const headings = snapshot.headings || { h1: [], h2: [], h3: [] };

    for (const h of (headings.h1 || []).slice(0, 3)) {
      blocks.push({ type: 'hero',    heading: h, role: 'Primary value proposition' });
    }
    for (const h of (headings.h2 || []).slice(0, 8)) {
      blocks.push({ type: 'section', heading: h, role: _inferSectionRole(h) });
    }
    for (const h of (headings.h3 || []).slice(0, 8)) {
      blocks.push({ type: 'subsection', heading: h, role: 'Feature or content detail' });
    }
    return blocks;
  }

  function _inferSectionRole(heading) {
    const h = heading.toLowerCase();
    if (/feature|capability|what.?we/i.test(h)) return 'Feature showcase section';
    if (/pricing|plan|cost/i.test(h))           return 'Pricing section';
    if (/how.?it.?work|getting.?start/i.test(h))return 'Onboarding/process section';
    if (/testimonial|trust|customer/i.test(h))  return 'Social proof section';
    if (/faq|question/i.test(h))                return 'FAQ section';
    if (/about|team|who/i.test(h))              return 'About/team section';
    if (/contact|reach/i.test(h))               return 'Contact section';
    return 'Content section';
  }

  function _extractDOMSignals(html) {
    return {
      hasServiceWorker: /service.?worker|sw\.js/i.test(html),
      hasManifest:      /manifest\.json|rel=["']manifest/i.test(html),
      hasLazyLoad:      /loading=["']lazy|IntersectionObserver|lazy.?load/i.test(html),
      hasInfiniteScroll:/infinite.?scroll|loadMore|load.?more/i.test(html),
      hasModalSystem:   /dialog|modal|overlay|backdrop/i.test(html),
      hasDarkMode:      /dark.?mode|prefers-color-scheme|theme-toggle/i.test(html),
      hasI18n:          /i18n|locale|lang=|translation/i.test(html),
      hasAccessibility: /aria-|role=|sr-only|screen.?reader/i.test(html),
      hasAnimations:    /animation|transition|keyframe|framer/i.test(html),
      dataAttributes:   (html.match(/data-[a-z]+-[a-z]+/g) || []).slice(0, 10)
    };
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 2 — STRUCTURAL INTERPRETER
  // Input: DOM structure
  // Output: page hierarchy, component graph, user flow map,
  //         interaction mapping (click → action → result)
  // ══════════════════════════════════════════════════════════
  function interpretStructure(domStructure, snapshot, siteModel, jobId) {
    const userFlowMap     = _buildUserFlowMap(snapshot, siteModel, domStructure);
    const interactionMap  = _buildInteractionMap(domStructure.interactionPoints);
    const featureMap      = _buildFeatureInferenceMap(snapshot, siteModel, domStructure);
    const logicSeparation = _separateLogicLayers(snapshot, siteModel, domStructure);

    return {
      jobId,
      stage:           'structural_interpretation',
      interpretedAt:   new Date().toISOString(),
      pageHierarchy:   domStructure.pageTree,
      componentGraph:  domStructure.componentGraph,
      userFlowMap,
      interactionMap,
      featureMap,
      logicSeparation
    };
  }

  function _buildUserFlowMap(snapshot, siteModel, domStructure) {
    const flows = [];
    const text  = snapshot.text.toLowerCase();

    // Core flows based on interaction signals
    const hasAuth    = /sign.?up|sign.?in|log.?in|register/i.test(text);
    const hasPayment = /payment|checkout|subscribe|upgrade/i.test(text);
    const hasSearch  = /search/i.test(text);
    const hasUpload  = /upload|import/i.test(text);
    const hasOnboard = /onboard|getting.?start|welcome/i.test(text);

    if (hasAuth) {
      flows.push({
        name:  'User Authentication',
        entry: 'Landing page',
        steps: [
          { step: 1, action: 'User visits landing page',        result: 'Landing page renders',           element: 'Page' },
          { step: 2, action: 'Click CTA (Sign up / Log in)',    result: 'Auth modal or page opens',       element: 'Button' },
          { step: 3, action: 'User fills credentials/email',    result: 'Form validates inputs',          element: 'Form' },
          { step: 4, action: 'Submit form',                     result: 'Auth request sent to backend',   element: 'Submit' },
          { step: 5, action: 'Backend validates + issues token',result: 'Session established',            element: 'System' },
          { step: 6, action: 'Redirect to dashboard',           result: 'Authenticated app state',        element: 'Router' }
        ]
      });
    }

    if (hasPayment) {
      flows.push({
        name:  'Purchase / Subscription',
        entry: 'Pricing page',
        steps: [
          { step: 1, action: 'View pricing page',               result: 'Plans rendered',                 element: 'Page' },
          { step: 2, action: 'Select plan',                     result: 'Plan highlighted, CTA enabled',  element: 'Button' },
          { step: 3, action: 'Click upgrade/purchase',          result: 'Payment form / Stripe checkout', element: 'Button' },
          { step: 4, action: 'Enter payment details',           result: 'Payment validated',              element: 'Form' },
          { step: 5, action: 'Confirm purchase',                result: 'Webhook fired → plan activated', element: 'Submit' },
          { step: 6, action: 'Redirect to confirmed state',     result: 'Feature access granted',         element: 'Router' }
        ]
      });
    }

    if (hasSearch) {
      flows.push({
        name:  'Search & Discovery',
        entry: 'Any page with search input',
        steps: [
          { step: 1, action: 'User types query',                result: 'Debounced search triggered',     element: 'Input' },
          { step: 2, action: 'API request with query param',    result: 'Results returned',               element: 'System' },
          { step: 3, action: 'Results rendered',                result: 'Result list/grid displayed',     element: 'Component' },
          { step: 4, action: 'Click result item',               result: 'Detail view opens',              element: 'Link' }
        ]
      });
    }

    if (hasUpload) {
      flows.push({
        name:  'Data Upload / Import',
        entry: 'Upload section',
        steps: [
          { step: 1, action: 'User selects file or data source',result: 'File picker opens',             element: 'Input[file]' },
          { step: 2, action: 'File selected/dropped',           result: 'Upload progress begins',        element: 'Form' },
          { step: 3, action: 'Backend processes upload',        result: 'Processing indicator shown',    element: 'System' },
          { step: 4, action: 'Processing complete',             result: 'Data available in app',         element: 'System' }
        ]
      });
    }

    if (hasOnboard) {
      flows.push({
        name:  'Onboarding',
        entry: 'Post-signup',
        steps: [
          { step: 1, action: 'Account created',                 result: 'Onboarding wizard starts',      element: 'System' },
          { step: 2, action: 'Complete profile steps',          result: 'Progress tracked',              element: 'Form' },
          { step: 3, action: 'Configure initial settings',      result: 'Preferences saved to SSOT',     element: 'Form' },
          { step: 4, action: 'Onboarding complete',             result: 'Full dashboard access granted', element: 'Router' }
        ]
      });
    }

    // Fallback
    if (flows.length === 0) {
      flows.push({
        name:  'Primary User Flow',
        entry: 'Landing page',
        steps: [
          { step: 1, action: 'Arrive at site',    result: 'Content renders',           element: 'Page' },
          { step: 2, action: 'Engage with CTA',   result: 'Action triggered',          element: 'Button' },
          { step: 3, action: 'Complete action',   result: 'System responds',           element: 'System' }
        ]
      });
    }

    return flows;
  }

  function _buildInteractionMap(interactionPoints) {
    // Group by type and build click→action→result chains
    return interactionPoints.map(pt => ({
      element:  pt.element,
      trigger:  pt.trigger,
      label:    pt.label || pt.action || '',
      action:   `${pt.trigger.toUpperCase()} on ${pt.element}`,
      result:   pt.result,
      type:     pt.type
    }));
  }

  function _buildFeatureInferenceMap(snapshot, siteModel, domStructure) {
    const features = siteModel?.features || [];
    const mapped   = features.map(f => {
      const uiComponents = _mapFeatureToComponents(f, domStructure.componentGraph.nodes);
      const userFlows    = _mapFeatureToFlows(f, domStructure.interactionPoints);
      return {
        feature:    f.name,
        type:       f.type,
        confidence: f.confidence,
        uiComponents,
        userFlows,
        stateNeeds: _inferStateNeeds(f),
        apiNeeds:   _inferApiNeeds(f)
      };
    });
    return mapped.slice(0, 20);
  }

  function _mapFeatureToComponents(feature, components) {
    const f = feature.name.toLowerCase();
    return components
      .filter(c => {
        const cn = c.name.toLowerCase();
        if (/auth|login|signup/i.test(f))   return /form|button|input|modal/i.test(cn);
        if (/dashboard/i.test(f))           return /table|chart|card|header|sidebar/i.test(cn);
        if (/search/i.test(f))             return /input|list|table/i.test(cn);
        if (/payment|billing/i.test(f))    return /form|button|modal/i.test(cn);
        if (/notification/i.test(f))       return /header|toast|badge/i.test(cn);
        return false;
      })
      .map(c => c.name)
      .slice(0, 4);
  }

  function _mapFeatureToFlows(feature, interactions) {
    return interactions
      .filter(i => {
        const label = (i.label || '').toLowerCase();
        const f     = feature.name.toLowerCase();
        if (/auth/i.test(f))    return /sign|log|register/i.test(label);
        if (/search/i.test(f)) return /search|find/i.test(label);
        if (/pay/i.test(f))    return /pay|buy|upgrade|subscribe/i.test(label);
        return false;
      })
      .map(i => `${i.trigger} → ${i.result}`)
      .slice(0, 3);
  }

  function _inferStateNeeds(feature) {
    const f = feature.name.toLowerCase();
    if (/auth/i.test(f))          return ['currentUser', 'authToken', 'sessionExpiry'];
    if (/dashboard/i.test(f))     return ['dashboardData', 'filters', 'selectedRange'];
    if (/search/i.test(f))        return ['searchQuery', 'searchResults', 'isLoading'];
    if (/payment|billing/i.test(f))return ['selectedPlan', 'paymentIntent', 'subscriptionStatus'];
    if (/notification/i.test(f))  return ['notifications', 'unreadCount', 'preferences'];
    if (/upload|file/i.test(f))   return ['uploadProgress', 'uploadedFiles', 'processingStatus'];
    return ['featureData', 'loadingState', 'errorState'];
  }

  function _inferApiNeeds(feature) {
    const f = feature.name.toLowerCase();
    if (/auth/i.test(f))          return ['POST /auth/signup', 'POST /auth/login', 'POST /auth/logout', 'GET /auth/me'];
    if (/dashboard/i.test(f))     return ['GET /dashboard/stats', 'GET /dashboard/data'];
    if (/search/i.test(f))        return ['GET /search?q={query}'];
    if (/payment|billing/i.test(f))return ['POST /billing/checkout', 'POST /billing/webhook', 'GET /billing/plans'];
    if (/notification/i.test(f))  return ['GET /notifications', 'POST /notifications/read'];
    if (/upload|file/i.test(f))   return ['POST /upload', 'GET /files', 'DELETE /files/:id'];
    return ['GET /api/resource', 'POST /api/resource'];
  }

  function _separateLogicLayers(snapshot, siteModel, domStructure) {
    const features  = siteModel?.features || [];
    const text      = snapshot.text.toLowerCase();

    // UI Logic: what the browser handles
    const uiLogic = [
      'Route/page rendering and navigation',
      'Form validation (client-side)',
      'Component state (loading, error, empty states)',
      'Real-time UI updates from state changes',
      ...(domStructure.domSignals?.hasModalSystem ? ['Modal open/close state management'] : []),
      ...(domStructure.domSignals?.hasDarkMode ? ['Theme toggle state (localStorage)'] : []),
      ...(domStructure.domSignals?.hasAnimations ? ['Animation and transition state'] : []),
    ];

    // Business Logic: what the backend owns
    const businessLogic = [
      'User authentication and session management',
      'Permission and role enforcement',
      'Data validation and sanitisation',
      ...(features.some(f => f.type === 'billing')    ? ['Subscription and billing lifecycle'] : []),
      ...(features.some(f => f.type === 'workflow')   ? ['Workflow automation and triggers'] : []),
      ...(features.some(f => f.type === 'compliance') ? ['Audit logging and compliance checks'] : []),
      ...(siteModel?.aiAgentModel?.detected           ? ['AI agent orchestration and LLM calls'] : []),
      'Email and notification dispatch',
      'Third-party API integrations'
    ];

    // State Logic: what the SSOT manages
    const stateLogic = [
      'Global app state (user session, preferences)',
      'Server state (cached API responses — React Query/SWR)',
      'Persistent state (localStorage/IndexedDB for offline)',
      ...(siteModel?.dataFlowModel?.isRealtime ? ['Real-time sync state (WebSocket/SSE)'] : []),
      'Optimistic UI updates with rollback',
      'Cross-component shared state (auth, notifications)'
    ];

    return { uiLogic, businessLogic, stateLogic };
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 3 — SYSTEM ARCHITECT
  // Input: structural interpretation + existing blueprints
  // Output: full system design model with all logic separated
  // ══════════════════════════════════════════════════════════
  function buildSystemDesign(interpretation, snapshot, siteModel, blueprint, jobId) {
    const systemModel = {
      productName:      siteModel?.productName || 'Unknown Product',
      category:         siteModel?.category    || 'Digital Product',
      featureCount:     (siteModel?.features   || []).length,
      pageCount:        interpretation.pageHierarchy?.totalPages || 0,
      componentCount:   (interpretation.componentGraph?.nodes   || []).length,
      interactionCount: (interpretation.interactionMap || []).length
    };

    const layeredArchitecture = _buildLayeredArchitecture(interpretation, siteModel, blueprint);
    const featureDecomposition = _decomposeFeatures(interpretation.featureMap, siteModel);
    const ssotDataModel = _buildSSOTDataModel(siteModel, interpretation);
    const apiContract   = _buildAPIContract(interpretation.featureMap);

    return {
      jobId,
      stage:           'system_design',
      designedAt:      new Date().toISOString(),
      systemModel,
      layeredArchitecture,
      featureDecomposition,
      ssotDataModel,
      apiContract,
      logicSeparation: interpretation.logicSeparation
    };
  }

  function _buildLayeredArchitecture(interpretation, siteModel, blueprint) {
    const tech  = siteModel?.techStack || {};
    const fe    = (tech.frontend?.signals  || [])[0]?.name || 'Next.js / React';
    const be    = (tech.backend?.signals   || [])[0]?.name || 'Node.js API';
    const db    = (tech.database?.signals  || [])[0]?.name || 'PostgreSQL';
    const auth  = (tech.auth?.signals      || [])[0]?.name || 'NextAuth.js';
    const host  = (tech.hosting?.signals   || [])[0]?.name || 'Vercel';

    const layers = [
      {
        layer: 'L1 — Presentation',
        technology: fe,
        responsibility: 'UI rendering, routing, component state, animations',
        components: (interpretation.componentGraph?.nodes || []).map(n => n.name).slice(0, 8)
      },
      {
        layer: 'L2 — Application Logic',
        technology: be,
        responsibility: 'Business rules, validation, orchestration, third-party calls',
        components: ['Auth middleware', 'Route handlers', 'Service layer', 'Event bus']
      },
      {
        layer: 'L3 — State / SSOT',
        technology: 'storage.js + ' + db,
        responsibility: 'Single source of truth — all app state, persistence, sync',
        components: ['SSOT store', 'Cached state', 'Offline queue', 'Sync manager']
      },
      {
        layer: 'L4 — Data',
        technology: db,
        responsibility: 'Persistent data store, queries, migrations, relationships',
        components: (siteModel?.inferred_data_entities || []).map(e => e.name).slice(0, 8)
      },
      {
        layer: 'L5 — Infrastructure',
        technology: host,
        responsibility: 'Hosting, CDN, scaling, monitoring, CI/CD',
        components: ['CDN edge', 'Serverless functions', 'Error monitoring', 'CI/CD pipeline']
      }
    ];

    if (siteModel?.aiAgentModel?.detected) {
      layers.push({
        layer: 'L6 — AI/Agent Layer',
        technology: (siteModel.aiAgentModel.llmProviders || [])[0]?.name || 'LLM Provider',
        responsibility: siteModel.aiAgentModel.systemType + ' — LLM calls, tool use, memory',
        components: (siteModel.aiAgentModel.agentRoles || []).map(r => r.role)
      });
    }

    return layers;
  }

  function _decomposeFeatures(featureMap, siteModel) {
    return (featureMap || []).map(fm => ({
      feature:    fm.feature,
      type:       fm.type,
      confidence: fm.confidence,
      breakdown: {
        ui:       fm.uiComponents.length > 0 ? fm.uiComponents : ['Component TBD'],
        state:    fm.stateNeeds,
        api:      fm.apiNeeds,
        flows:    fm.userFlows.length > 0 ? fm.userFlows : ['Flow TBD']
      }
    }));
  }

  function _buildSSOTDataModel(siteModel, interpretation) {
    // SSOT-compatible schema aligned with storage.js pattern
    const entities = siteModel?.inferred_data_entities || [];
    const stateKeys = [
      ...new Set(
        (interpretation.featureMap || []).flatMap(f => f.stateNeeds || [])
      )
    ];

    return {
      persistedEntities: entities.map(e => ({
        name:          e.name,
        fields:        e.fields,
        ssotKey:       `db.${e.name}`,
        accessPattern: `AP3X_Storage.getRecord('${e.name}', id)`
      })),
      inMemoryState: stateKeys.map(k => ({
        key:    k,
        scope:  'session',
        access: 'state.' + k
      })),
      ssotPattern: 'storage.js → getDB() → mutate → saveDB()'
    };
  }

  function _buildAPIContract(featureMap) {
    const endpoints = [];
    const seen = new Set();

    for (const fm of (featureMap || [])) {
      for (const ep of (fm.apiNeeds || [])) {
        if (!seen.has(ep)) {
          seen.add(ep);
          const method = ep.split(' ')[0];
          const path   = ep.split(' ')[1] || '/api/resource';
          endpoints.push({
            method,
            path,
            feature:  fm.feature,
            auth:     !['GET /api/health'].includes(ep),
            response: `${method === 'GET' ? 'Resource data' : 'Updated resource'} (JSON)`
          });
        }
      }
    }

    return { endpoints: endpoints.slice(0, 25), style: 'REST', authScheme: 'Bearer JWT / Session' };
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 4 — CLONE PROMPT GENERATOR
  // Output: strict AI build prompt that prevents feature loss
  // ══════════════════════════════════════════════════════════
  function generateClonePrompt(systemDesign, interpretation, snapshot, siteModel, jobId) {
    const productName = siteModel?.productName || 'the product';
    const category    = siteModel?.category    || 'digital product';
    const features    = (siteModel?.features   || []).slice(0, 12).map(f => f.name);
    const pages       = (interpretation.pageHierarchy?.nodes || []).map(n => n.label).slice(0, 15);
    const components  = (interpretation.componentGraph?.nodes || []).map(n => n.name).slice(0, 15);
    const stack       = systemDesign.layeredArchitecture || [];
    const entities    = (systemDesign.ssotDataModel?.persistedEntities || []).map(e => e.name);
    const flows       = (interpretation.userFlowMap || []).map(f => f.name);
    const tech        = siteModel?.techStack || {};

    const feList   = features.map(f => `  - ${f}`).join('\n') || '  - (inferred from source)';
    const pgList   = pages.map(p => `  - ${p}`).join('\n') || '  - Home';
    const cpList   = components.map(c => `  - ${c}`).join('\n') || '  - Core UI components';
    const enList   = entities.map(e => `  - ${e}`).join('\n') || '  - users, sessions';
    const flList   = flows.map(f => `  - ${f}`).join('\n') || '  - Primary user flow';
    const feStr    = (tech.frontend?.signals || [])[0]?.name || 'Next.js';
    const beStr    = (tech.backend?.signals  || [])[0]?.name || 'Node.js';
    const dbStr    = (tech.database?.signals || [])[0]?.name || 'PostgreSQL';
    const authStr  = (tech.auth?.signals     || [])[0]?.name || 'NextAuth.js';
    const aiStr    = siteModel?.aiAgentModel?.detected
      ? `\n  AI LAYER: ${siteModel.aiAgentModel.systemType} using ${(siteModel.aiAgentModel.llmProviders||[])[0]?.name || 'LLM provider'}`
      : '';

    const uiLogic  = (systemDesign.logicSeparation?.uiLogic     || []).map(l => `  - ${l}`).join('\n');
    const bizLogic = (systemDesign.logicSeparation?.businessLogic|| []).map(l => `  - ${l}`).join('\n');
    const stLogic  = (systemDesign.logicSeparation?.stateLogic   || []).map(l => `  - ${l}`).join('\n');

    const prompt = `================================================================
AP3X VER5E — CLONE BUILD PROMPT
Generated: ${new Date().toISOString()}
Source URL: ${snapshot.url}
Target Product: ${productName} (${category})
================================================================

YOU ARE REBUILDING: "${productName}"
This is a STRICT RECONSTRUCTION prompt. Do NOT redesign.
Do NOT remove features. Do NOT simplify. Build what is specified.

================================================================
SECTION 1 — SYSTEM OVERVIEW
================================================================
Product: ${productName}
Category: ${category}
Source: ${snapshot.url}

STACK (inferred from source signals):
  FRONTEND:   ${feStr}
  BACKEND:    ${beStr}
  DATABASE:   ${dbStr}
  AUTH:       ${authStr}${aiStr}

================================================================
SECTION 2 — REQUIRED PAGES (BUILD ALL)
================================================================
${pgList}

Each page MUST be implemented. No page may be omitted.
Navigation between pages must match source structure.

================================================================
SECTION 3 — REQUIRED FEATURES (BUILD ALL)
================================================================
${feList}

Each feature MUST be functional. No feature may be mocked,
stubbed, or deferred. All must work end-to-end.

================================================================
SECTION 4 — REQUIRED UI COMPONENTS
================================================================
${cpList}

All components must be:
  - Fully interactive (not static placeholders)
  - Connected to state (read from and write to SSOT)
  - Responsive and accessible

================================================================
SECTION 5 — DATA MODEL (SSOT ALIGNED)
================================================================
SINGLE SOURCE OF TRUTH: storage.js (or database equivalent)
No data may exist outside the SSOT.

Required entities:
${enList}

SSOT access pattern:
  READ:  getDB() → db.entityName
  WRITE: mutate → saveDB(db)
  All mutations must go through SSOT. No direct DOM state.

================================================================
SECTION 6 — USER FLOWS (IMPLEMENT ALL)
================================================================
${flList}

Each flow must be fully traversable end-to-end.
No flow may dead-end or produce an error state.

================================================================
SECTION 7 — LOGIC SEPARATION (STRICT)
================================================================

UI LOGIC (frontend only):
${uiLogic}

BUSINESS LOGIC (backend/server only):
${bizLogic}

STATE LOGIC (SSOT only):
${stLogic}

Violation of this separation is NOT permitted.

================================================================
SECTION 8 — OUTPUT REQUIREMENTS (MANDATORY)
================================================================
Deliver a complete, deployable PWA with:
  1. index.html          — full app shell
  2. app.js              — UI controller (all views/routing)
  3. storage.js          — SSOT (all data reads/writes)
  4. manifest.json       — PWA manifest
  5. service-worker.js   — offline-first caching
  6. css/styles.css      — all styles

Each file must be production-ready.
No placeholder content. No TODO comments.
No broken references. No missing features.

================================================================
SECTION 9 — HARD CONSTRAINTS
================================================================
1. DO NOT redesign the UI — match source structure
2. DO NOT remove any feature listed in Section 3
3. DO NOT create APIs not listed in Section 5
4. DO NOT violate the logic separation in Section 7
5. DO NOT use localStorage directly — all state through SSOT
6. DO NOT hallucinate backend capabilities not inferred
7. ALL inference is labelled: confirmed / likely / inferred

================================================================
SECTION 10 — QUALITY GATES (VALIDATE BEFORE DELIVERY)
================================================================
□ All pages render without errors
□ All features are functional (not mocked)
□ All user flows complete successfully
□ SSOT is the only state mutation point
□ Offline mode works (service worker caches all assets)
□ PWA installs successfully on mobile and desktop
□ No console errors in production build
□ Accessibility: keyboard navigable, ARIA labels present

================================================================
END OF CLONE BUILD PROMPT
Source: AP3X VER5E — Site → System Cloner AI
================================================================`;

    return {
      jobId,
      stage:       'clone_prompt',
      generatedAt: new Date().toISOString(),
      productName,
      sourceUrl:   snapshot.url,
      prompt,
      promptLength:prompt.length,
      sections:    10,
      featureCount:features.length,
      pageCount:   pages.length
    };
  }

  // ══════════════════════════════════════════════════════════
  // STAGE 5 — PWA SCAFFOLD GENERATOR
  // Output: full deployable file structure as code strings
  // ══════════════════════════════════════════════════════════
  function generatePWAScaffold(systemDesign, interpretation, snapshot, siteModel, jobId) {
    const productName = siteModel?.productName || 'ClonedApp';
    const safeName    = productName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const category    = siteModel?.category    || 'Web App';
    const pages       = (interpretation.pageHierarchy?.nodes || []).slice(0, 10);
    const features    = (siteModel?.features   || []).slice(0, 10);
    const entities    = (siteModel?.inferred_data_entities || []).slice(0, 8);
    const components  = (interpretation.componentGraph?.nodes || []).slice(0, 10);
    const flows       = (interpretation.userFlowMap || []).slice(0, 3);

    const indexHtml      = _generateIndexHtml(productName, safeName, pages, features, components);
    const appJs          = _generateAppJs(pages, features, flows, entities);
    const storageJs      = _generateStorageJs(entities, productName);
    const manifestJson   = _generateManifest(productName, safeName);
    const serviceWorker  = _generateServiceWorker(safeName, pages);
    const cssStyles      = _generateCSS(productName);
    const fileStructure  = _generateFileStructure(pages);

    return {
      jobId,
      stage:        'pwa_scaffold',
      generatedAt:  new Date().toISOString(),
      productName,
      safeName,
      files: {
        'index.html':          { content: indexHtml,    language: 'html',       size: indexHtml.length },
        'js/app.js':           { content: appJs,        language: 'javascript', size: appJs.length },
        'js/storage.js':       { content: storageJs,    language: 'javascript', size: storageJs.length },
        'manifest.json':       { content: manifestJson, language: 'json',       size: manifestJson.length },
        'service-worker.js':   { content: serviceWorker,language: 'javascript', size: serviceWorker.length },
        'css/styles.css':      { content: cssStyles,    language: 'css',        size: cssStyles.length }
      },
      fileStructure,
      totalFiles:   6,
      deployReady:  true
    };
  }

  function _generateIndexHtml(productName, safeName, pages, features, components) {
    const navItems = pages.slice(0, 6).map(p =>
      `        <a class="nav-link" href="#" data-view="${p.path.replace(/\//g,'-').replace(/^-/,'') || 'home'}">${p.label}</a>`
    ).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${productName}</title>
  <link rel="manifest" href="manifest.json" />
  <link rel="stylesheet" href="css/styles.css" />
  <meta name="theme-color" content="#0a0a0a" />
  <meta name="description" content="${productName} — cloned via AP3X VER5E System Cloner" />
</head>
<body>

<div id="app">

  <!-- NAVIGATION -->
  <nav id="app-nav">
    <div class="nav-brand">${productName}</div>
    <div class="nav-links">
${navItems}
    </div>
    <div class="nav-actions">
      <button id="btn-login"  onclick="App.openModal('login')">Sign In</button>
      <button id="btn-signup" onclick="App.openModal('signup')" class="btn-primary">Sign Up</button>
    </div>
  </nav>

  <!-- VIEWS -->
  <main id="app-main">
${pages.map(p => {
  const viewId = p.path.replace(/\//g,'-').replace(/^-/,'') || 'home';
  return `    <section id="view-${viewId}" class="view ${viewId === 'home' ? 'active' : 'hidden'}">
      <!-- ${p.label} view — populated by app.js -->
      <div class="view-content" id="${viewId}-content"></div>
    </section>`;
}).join('\n')}
  </main>

  <!-- MODALS -->
  <div id="modal-overlay" class="hidden" onclick="App.closeModal()">
    <div id="modal-container" onclick="event.stopPropagation()">
      <div id="modal-content"></div>
    </div>
  </div>

  <!-- NOTIFICATIONS -->
  <div id="notification-container"></div>

</div><!-- /#app -->

<script src="js/storage.js"></script>
<script src="js/app.js"></script>
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(r => console.log('[SW] Registered:', r.scope))
      .catch(e => console.warn('[SW] Failed:', e.message));
  }
</script>
</body>
</html>`;
  }

  function _generateAppJs(pages, features, flows, entities) {
    const viewCases = pages.map(p => {
      const viewId = p.path.replace(/\//g,'-').replace(/^-/,'') || 'home';
      return `    case '${viewId}': render${_toCamelCase(p.label)}(); break;`;
    }).join('\n');

    const viewFns = pages.map(p => {
      const viewId  = p.path.replace(/\//g,'-').replace(/^-/,'') || 'home';
      const fnName  = 'render' + _toCamelCase(p.label);
      return `  function ${fnName}() {
    const el = document.getElementById('${viewId}-content');
    if (!el) return;
    el.innerHTML = \`<div class="page-header"><h1>${p.label}</h1></div>
    <div class="page-body"><!-- ${p.label} content --></div>\`;
  }`;
    }).join('\n\n');

    return `// ================================================================
// ${pages[0]?.label ? pages.map(p=>p.label)[0] : 'App'} — App Controller
// Generated by AP3X VER5E Site → System Cloner
// SSOT: all state reads/writes via storage.js
// ================================================================

(function () {
  'use strict';

  let currentView = 'home';
  let currentUser = null;

  // ── Navigation ───────────────────────────────────────────
  function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    const viewEl = document.getElementById(\`view-\${view}\`);
    const navEl  = document.querySelector(\`[data-view="\${view}"]\`);
    if (viewEl) viewEl.classList.remove('hidden');
    if (navEl)  navEl.classList.add('active');

    switch (view) {
${viewCases}
      default: renderHome(); break;
    }
  }

  // ── View Renderers ───────────────────────────────────────
${viewFns}

  // ── Auth ─────────────────────────────────────────────────
  function openModal(type) {
    const overlay  = document.getElementById('modal-overlay');
    const content  = document.getElementById('modal-content');
    overlay.classList.remove('hidden');

    if (type === 'login') {
      content.innerHTML = \`
        <div class="modal-header">Sign In</div>
        <form onsubmit="App.handleLogin(event)">
          <input type="email"    name="email"    placeholder="Email address" required />
          <input type="password" name="password" placeholder="Password"      required />
          <button type="submit" class="btn-primary btn-full">Sign In</button>
        </form>
        <p class="modal-footer">No account? <a href="#" onclick="App.openModal('signup')">Sign up</a></p>\`;
    } else if (type === 'signup') {
      content.innerHTML = \`
        <div class="modal-header">Create Account</div>
        <form onsubmit="App.handleSignup(event)">
          <input type="text"     name="name"     placeholder="Full name"     required />
          <input type="email"    name="email"    placeholder="Email address" required />
          <input type="password" name="password" placeholder="Password"      required />
          <button type="submit" class="btn-primary btn-full">Create Account</button>
        </form>
        <p class="modal-footer">Have an account? <a href="#" onclick="App.openModal('login')">Sign in</a></p>\`;
    }
  }

  function closeModal() {
    document.getElementById('modal-overlay')?.classList.add('hidden');
  }

  function handleLogin(event) {
    event.preventDefault();
    const data  = new FormData(event.target);
    const email = data.get('email');
    const db    = AppStorage.getDB();
    const user  = db.users.find(u => u.email === email);
    if (user) {
      currentUser = user;
      db.meta.currentUserId = user.id;
      AppStorage.saveDB(db);
      closeModal();
      notify('Welcome back, ' + (user.name || email), 'success');
      navigateTo('home');
    } else {
      notify('Invalid credentials', 'error');
    }
  }

  function handleSignup(event) {
    event.preventDefault();
    const data  = new FormData(event.target);
    const db    = AppStorage.getDB();
    const user  = {
      id:        'usr_' + Date.now(),
      name:      data.get('name'),
      email:     data.get('email'),
      role:      'user',
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    currentUser = user;
    db.meta.currentUserId = user.id;
    AppStorage.saveDB(db);
    closeModal();
    notify('Account created — welcome!', 'success');
    navigateTo('home');
  }

  // ── Notifications ─────────────────────────────────────────
  function notify(msg, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const n = document.createElement('div');
    n.className = \`notification notification-\${type}\`;
    n.textContent = msg;
    container.appendChild(n);
    setTimeout(() => n.remove(), 4000);
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    // Wire nav
    document.querySelectorAll('.nav-link').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); navigateTo(el.dataset.view); });
    });
    // Restore session
    const db = AppStorage.getDB();
    if (db.meta?.currentUserId) {
      currentUser = db.users?.find(u => u.id === db.meta.currentUserId) || null;
    }
    navigateTo('home');
  }

  // ── Public API ────────────────────────────────────────────
  window.App = { navigateTo, openModal, closeModal, handleLogin, handleSignup, notify };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
  }

  function _generateStorageJs(entities, productName) {
    const entityInit = entities.map(e => `  ${e.name}: [],`).join('\n') || '  records: [],';
    return `// ================================================================
// ${productName} — SSOT Storage Module
// Generated by AP3X VER5E Site → System Cloner
// RULE: ALL state reads/writes MUST go through this module.
//       No direct localStorage access anywhere else.
// ================================================================

const AppStorage = (() => {
  const KEY = '${productName.replace(/\s+/g,'-').toLowerCase()}-ssot-v1';

  const DEFAULT_DB = {
    // ── Entities ─────────────────────────────────────────────
${entityInit}
    // ── User state ───────────────────────────────────────────
    users: [],
    sessions: [],
    // ── Meta ─────────────────────────────────────────────────
    meta: {
      version:        1,
      createdAt:      new Date().toISOString(),
      currentUserId:  null,
      lastActivity:   null
    }
  };

  function _deepMerge(target, source) {
    const out = Object.assign({}, target);
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = _deepMerge(target[key] || {}, source[key]);
      } else if (!(key in target)) {
        out[key] = source[key];
      } else {
        out[key] = target[key];
      }
    }
    return out;
  }

  function getDB() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DB));
      return _deepMerge(JSON.parse(JSON.stringify(DEFAULT_DB)), JSON.parse(raw));
    } catch(e) {
      console.error('[SSOT] Read error:', e);
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
  }

  function saveDB(db) {
    try {
      db.meta.lastActivity = new Date().toISOString();
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch(e) {
      console.error('[SSOT] Write error:', e);
      return false;
    }
  }

  function getRecord(collection, id) {
    const db = getDB();
    return (db[collection] || []).find(r => r.id === id) || null;
  }

  function saveRecord(collection, record) {
    const db = getDB();
    if (!Array.isArray(db[collection])) db[collection] = [];
    const idx = db[collection].findIndex(r => r.id === record.id);
    if (idx >= 0) db[collection][idx] = { ...db[collection][idx], ...record, updatedAt: new Date().toISOString() };
    else          db[collection].push({ ...record, createdAt: new Date().toISOString() });
    saveDB(db);
  }

  function deleteRecord(collection, id) {
    const db = getDB();
    db[collection] = (db[collection] || []).filter(r => r.id !== id);
    saveDB(db);
  }

  function resetDB() {
    localStorage.removeItem(KEY);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }

  return { getDB, saveDB, getRecord, saveRecord, deleteRecord, resetDB };
})();

window.AppStorage = AppStorage;`;
  }

  function _generateManifest(productName, safeName) {
    return JSON.stringify({
      name:             productName,
      short_name:       productName.split(' ')[0],
      description:      `${productName} — cloned via AP3X VER5E`,
      start_url:        '/',
      scope:            '/',
      display:          'standalone',
      orientation:      'any',
      background_color: '#0a0a0a',
      theme_color:      '#0a0a0a',
      lang:             'en',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ]
    }, null, 2);
  }

  function _generateServiceWorker(safeName, pages) {
    const cacheUrls = [
      '/','/index.html','/manifest.json','/css/styles.css',
      '/js/storage.js','/js/app.js','/service-worker.js'
    ].map(u => `  '${u}'`).join(',\n');

    return `// ${safeName} — Service Worker (Offline-first)
// Generated by AP3X VER5E Site → System Cloner

const CACHE = '${safeName}-v1';
const OFFLINE = '/index.html';
const PRECACHE = [
${cacheUrls}
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(url =>
        c.add(new Request(url, { cache: 'reload' })).catch(() => {})
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(r => {
          if (r && r.status === 200 && r.type === 'basic') {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        })
        .catch(() => e.request.mode === 'navigate' ? caches.match(OFFLINE) : undefined);
    })
  );
});`;
  }

  function _generateCSS(productName) {
    return `/* ${productName} — Styles (Generated by AP3X VER5E) */
:root {
  --bg:      #0a0a0a;
  --surface: #111111;
  --border:  rgba(255,255,255,0.1);
  --text:    #e0e0e0;
  --muted:   #888;
  --accent:  #D4AF37;
  --green:   #00FF88;
  --radius:  6px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; min-height: 100vh; }
/* Nav */
#app-nav { display: flex; align-items: center; gap: 16px; padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--surface); position: sticky; top: 0; z-index: 100; }
.nav-brand { font-weight: bold; color: var(--accent); letter-spacing: 2px; font-size: 14px; }
.nav-links  { display: flex; gap: 8px; flex: 1; }
.nav-link   { color: var(--muted); text-decoration: none; font-size: 12px; padding: 5px 10px; border-radius: var(--radius); transition: all 0.15s; }
.nav-link:hover, .nav-link.active { color: var(--text); background: rgba(255,255,255,0.06); }
.nav-actions { display: flex; gap: 8px; }
/* Buttons */
button { cursor: pointer; border: none; background: rgba(255,255,255,0.08); color: var(--text); padding: 7px 16px; border-radius: var(--radius); font-size: 12px; transition: all 0.15s; }
button:hover { background: rgba(255,255,255,0.14); }
.btn-primary { background: var(--accent); color: #000; font-weight: bold; }
.btn-primary:hover { opacity: 0.88; }
.btn-full { width: 100%; margin-top: 12px; padding: 10px; font-size: 13px; }
/* Main */
#app-main { max-width: 1100px; margin: 0 auto; padding: 32px 24px; }
.view.hidden { display: none; }
.view-content { }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 22px; color: var(--accent); }
/* Modal */
#modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
#modal-overlay.hidden { display: none; }
#modal-container { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 28px; min-width: 340px; max-width: 440px; width: 100%; }
.modal-header { font-size: 16px; font-weight: bold; margin-bottom: 20px; color: var(--accent); }
.modal-footer { font-size: 11px; color: var(--muted); margin-top: 14px; text-align: center; }
.modal-footer a { color: var(--accent); text-decoration: none; }
#modal-container input { display: block; width: 100%; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: var(--radius); padding: 9px 12px; color: var(--text); font-size: 13px; margin-bottom: 10px; }
#modal-container input:focus { outline: none; border-color: var(--accent); }
/* Notifications */
#notification-container { position: fixed; bottom: 20px; right: 20px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
.notification { padding: 10px 16px; border-radius: var(--radius); font-size: 12px; animation: slideIn 0.2s ease; }
.notification-success { background: rgba(0,255,136,0.15); color: var(--green); border: 1px solid rgba(0,255,136,0.3); }
.notification-error   { background: rgba(255,80,80,0.15); color: #FF5050; border: 1px solid rgba(255,80,80,0.3); }
.notification-info    { background: rgba(212,175,55,0.15); color: var(--accent); border: 1px solid rgba(212,175,55,0.3); }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }`;
  }

  function _generateFileStructure(pages) {
    const pageFiles = pages.slice(0, 8).map(p => {
      const viewId = p.path.replace(/\//g,'-').replace(/^-/,'') || 'home';
      return `  │   └── view-${viewId}.js   (optional split)`;
    });
    return `Project Structure:
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── styles.css
├── js/
│   ├── storage.js     ← SSOT (single source of truth)
│   ├── app.js         ← UI controller
${pageFiles.join('\n')}
└── icons/
    ├── icon-192.png
    └── icon-512.png`;
  }

  // ── UTILITY ──────────────────────────────────────────────
  function _titleCase(s) {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  function _toCamelCase(s) {
    return s.split(/\s+/).map((w, i) => i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  // ── PUBLIC API ────────────────────────────────────────────
  return {
    extractDOMStructure,
    interpretStructure,
    buildSystemDesign,
    generateClonePrompt,
    generatePWAScaffold
  };
})();

window.ClonerEngine = ClonerEngine;
