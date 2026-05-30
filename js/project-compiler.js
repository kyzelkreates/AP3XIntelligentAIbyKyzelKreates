// ============================================================
// AP3X — MODULE 4: AI PROJECT COMPILER
// Generates Product Spec, Architecture, DB Model, UI Blueprint, Logic Flow
// ============================================================

const ProjectCompiler = (() => {

  // ──────────────────────────────────────────────────────────
  // 4A: PRODUCT SPECIFICATION
  // ──────────────────────────────────────────────────────────
  function compileSpec(snapshot, siteModel, jobId) {
    const meta    = snapshot.meta || {};
    const text    = snapshot.text || '';
    const name    = siteModel.productName;
    const desc    = meta.description || meta['og:description'] || '';

    return {
      jobId,
      version:   1,
      compiledAt:new Date().toISOString(),
      url:       snapshot.url,

      // A. What the product does
      productName:     name,
      tagline:         meta['og:title'] || meta.title || name,
      whatItDoes:      desc || _inferDescription(snapshot, siteModel),
      problemItSolves: _inferProblem(snapshot, siteModel),

      // B. Target users
      targetUsers: _inferTargetUsers(snapshot, siteModel),

      // C. Core features
      coreFeatures: siteModel.features
        .filter(f => f.confidence === 'inferred' || f.type !== 'content')
        .slice(0, 12)
        .map(f => ({ name: f.name, type: f.type })),

      // D. User journey
      userJourneys: siteModel.userFlows,

      // E. Category
      category:    siteModel.category,
      domain:      _inferDomain(siteModel.category)
    };
  }

  function _inferDescription(snapshot, siteModel) {
    const h1 = snapshot.headings.h1[0] || '';
    const h2 = snapshot.headings.h2[0] || '';
    const features = siteModel.features.slice(0,3).map(f=>f.name).join(', ');
    return `${siteModel.productName} is a ${siteModel.category} product${h1 ? ` — "${h1}"` : ''}${features ? `. Key capabilities include: ${features}` : ''}.`;
  }

  function _inferProblem(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const painPoints = [
      [/manual|tedious|time-consuming/i,   'Reduces manual, time-consuming processes'],
      [/complex|complicated|difficult/i,   'Simplifies complex workflows'],
      [/slow|inefficient/i,                'Addresses slow or inefficient systems'],
      [/disconnected|silos|fragmented/i,   'Connects fragmented data or teams'],
      [/expensive|cost/i,                  'Reduces operational costs'],
      [/scale|growing|growing pains/i,     'Helps businesses scale without growing pains'],
    ];
    for (const [pattern, statement] of painPoints) {
      if (pattern.test(text)) return statement;
    }
    return `Provides streamlined ${siteModel.category} capabilities for modern businesses`;
  }

  function _inferTargetUsers(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const users = [];
    const signals = [
      [/developer|engineer|technical team/i, 'Developers / Engineers'],
      [/startup|founder|entrepreneur/i,      'Startup founders'],
      [/enterprise|large team|organisation/i,'Enterprise teams'],
      [/small business|smb/i,               'Small & medium businesses'],
      [/marketing team|marketer/i,           'Marketing teams'],
      [/designer/i,                          'Product designers'],
      [/data team|analyst/i,                 'Data analysts'],
      [/finance|accounting/i,                'Finance teams'],
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
  // 4B + 4C: SYSTEM ARCHITECTURE BLUEPRINT + DATABASE MODEL
  // ──────────────────────────────────────────────────────────
  function compileBlueprint(snapshot, siteModel, jobId) {
    const features  = siteModel.features;
    const apiSigs   = snapshot.apiSignals || [];
    const entities  = siteModel.inferred_data_entities || [];

    return {
      jobId,
      version:    1,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,

      // B. System Architecture
      architecture: {
        frontend: _buildFrontendSpec(snapshot, siteModel),
        backend:  _buildBackendSpec(snapshot, siteModel, apiSigs),
        auth:     _buildAuthSpec(snapshot, features),
        state:    _buildStateSpec(features),
        api:      _buildApiSpec(apiSigs, features)
      },

      // C. Database model
      databaseModel: {
        type:     _inferDbType(apiSigs, features),
        entities: entities.map(e => ({
          name:   e.name,
          fields: e.fields,
          source: e.source || 'inferred'
        })),
        relationships: _buildRelationships(entities)
      }
    };
  }

  function _buildFrontendSpec(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const stack = [];
    if (/react|next\.?js/i.test(snapshot.text))   stack.push('React / Next.js');
    if (/vue|nuxt/i.test(snapshot.text))           stack.push('Vue / Nuxt');
    if (/angular/i.test(snapshot.text))            stack.push('Angular');
    if (stack.length === 0)                        stack.push('Web framework (inferred)');

    return {
      stackSignals:  stack,
      pages:         siteModel.pages.map(p => p.label),
      components:    siteModel.components.map(c => c.name),
      pwaSignals:    /service.worker|manifest|pwa|offline/i.test(snapshot.text),
      mobileSignals: /mobile|ios|android|responsive/i.test(snapshot.text)
    };
  }

  function _buildBackendSpec(snapshot, siteModel, apiSigs) {
    const hasSrv = apiSigs.some(s => /(AWS|GCP|Azure|Supabase|Firebase)/i.test(s));
    const text   = snapshot.text;
    return {
      type:        hasSrv ? 'Cloud-hosted backend' : 'Backend inferred from signals',
      cloudSignals:apiSigs.filter(s => /(AWS|GCP|Azure|Supabase|Firebase)/i.test(s)),
      serverSignals:apiSigs.filter(s => /(REST|GraphQL|gRPC|WebSocket)/i.test(s)),
      queueSignals: /queue|job|worker|async/i.test(text) ? ['Async job processing inferred'] : [],
      cacheSignals: /cache|redis|cdn/i.test(text)        ? ['Caching layer inferred'] : []
    };
  }

  function _buildAuthSpec(snapshot, features) {
    const authFeature = features.find(f => f.type === 'auth');
    const text = snapshot.text;
    return {
      type:         authFeature?.name || 'Standard auth inferred',
      oauth:        /oauth|google.*sign|github.*sign/i.test(text),
      sso:          /sso|saml|ldap/i.test(text),
      mfa:          /2fa|mfa|two.factor/i.test(text),
      sessionModel: 'JWT or cookie-based session (inferred)'
    };
  }

  function _buildStateSpec(features) {
    const hasComplex = features.some(f => ['Analytics','Dashboard','Team Collaboration'].includes(f.name));
    return {
      type:    hasComplex ? 'Complex state management (Redux/Zustand/Pinia inferred)' : 'Local component state likely sufficient',
      realtime:/realtime|live|websocket/i.test(features.map(f=>f.name).join(' ')) ? 'Real-time state sync inferred' : null
    };
  }

  function _buildApiSpec(apiSigs, features) {
    const types  = apiSigs.filter(s => /(REST|GraphQL|gRPC|WebSocket|webhook)/i.test(s));
    const hasApi = features.some(f => f.type === 'api');
    return {
      style:       types.length > 0 ? types : ['REST API (inferred)'],
      publicApi:   hasApi,
      webhooks:    /webhook/i.test(apiSigs.join(' ')),
      keyAuth:     /api.?key|token/i.test(apiSigs.join(' ')),
      sdkSignals:  /sdk|library|npm|package/i.test(apiSigs.join(' '))
    };
  }

  function _inferDbType(apiSigs, features) {
    if (/supabase|postgres/i.test(apiSigs.join(' '))) return 'PostgreSQL (Supabase inferred)';
    if (/firebase|firestore/i.test(apiSigs.join(' ')))return 'NoSQL (Firebase/Firestore inferred)';
    if (/mongodb/i.test(apiSigs.join(' ')))           return 'MongoDB (inferred)';
    return 'Relational SQL database (inferred)';
  }

  function _buildRelationships(entities) {
    const rels = [];
    const names = entities.map(e => e.name);
    if (names.includes('users') && names.includes('sessions'))     rels.push('users → sessions (1:many)');
    if (names.includes('users') && names.includes('projects'))     rels.push('users → projects (1:many)');
    if (names.includes('users') && names.includes('tasks'))        rels.push('projects → tasks (1:many)');
    if (names.includes('users') && names.includes('payments'))     rels.push('users → payments (1:many)');
    if (names.includes('users') && names.includes('subscriptions'))rels.push('users → subscriptions (1:1)');
    if (names.includes('users') && names.includes('files'))        rels.push('users → files (1:many)');
    if (names.includes('users') && names.includes('notifications'))rels.push('users → notifications (1:many)');
    if (names.includes('users') && names.includes('audit_logs'))   rels.push('users → audit_logs (1:many)');
    return rels;
  }

  // ──────────────────────────────────────────────────────────
  // 4D + 4E: UI STRUCTURE + LOGIC FLOW
  // ──────────────────────────────────────────────────────────
  function compileUI(snapshot, siteModel, jobId) {
    return {
      jobId,
      version:    1,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,

      // D. UI/UX Structure
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

      // E. Logic Flow
      logicFlow: {
        userJourneys:    siteModel.userFlows,
        stateTransitions:_inferStateTransitions(siteModel),
        featureInteractions:_inferFeatureInteractions(siteModel),
        systemBehaviours:_inferSystemBehaviours(snapshot, siteModel)
      }
    };
  }

  function _inferDashboardLayout(siteModel) {
    const hasDash = siteModel.features.some(f => /dashboard/i.test(f.name));
    if (!hasDash) return 'Standard page layout (no dashboard inferred)';
    return {
      layout: 'Sidebar + Main Content Area',
      panels: ['Navigation sidebar', 'Main content', 'Header bar', 'Settings panel'],
      widgets: siteModel.features.filter(f=>['Analytics','Dashboard','Notifications'].includes(f.name)).map(f=>f.name)
    };
  }

  function _inferStateTransitions(siteModel) {
    const transitions = [];
    for (const flow of siteModel.userFlows) {
      for (let i = 0; i < flow.steps.length - 1; i++) {
        transitions.push(`${flow.steps[i]} → ${flow.steps[i+1]}`);
      }
    }
    return transitions.slice(0, 20);
  }

  function _inferFeatureInteractions(siteModel) {
    const interactions = [];
    const names = siteModel.features.map(f=>f.name);
    if (names.includes('Authentication') && names.includes('Dashboard'))
      interactions.push('Authentication → unlocks Dashboard');
    if (names.includes('Payments & Billing') && names.includes('API & Integrations'))
      interactions.push('Billing plan tier → controls API access level');
    if (names.includes('Team Collaboration') && names.includes('Notifications'))
      interactions.push('Team activity → triggers Notifications');
    if (names.includes('File Management') && names.includes('Analytics'))
      interactions.push('File uploads → feed into Analytics pipeline');
    return interactions;
  }

  function _inferSystemBehaviours(snapshot, siteModel) {
    const behaviours = [];
    if (/rate.?limit/i.test(snapshot.text))     behaviours.push('Rate limiting on API endpoints');
    if (/webhook/i.test(snapshot.text))         behaviours.push('Webhook event dispatch on state change');
    if (/queue|async/i.test(snapshot.text))     behaviours.push('Async job queue for background processing');
    if (/cache/i.test(snapshot.text))           behaviours.push('Response caching layer');
    if (/audit/i.test(snapshot.text))           behaviours.push('Audit trail logging on user actions');
    if (/rollback|undo/i.test(snapshot.text))   behaviours.push('State rollback / undo capability');
    if (behaviours.length === 0)
      behaviours.push('Standard request/response lifecycle', 'CRUD operations on core entities');
    return behaviours;
  }

  return { compileSpec, compileBlueprint, compileUI };
})();

window.ProjectCompiler = ProjectCompiler;
