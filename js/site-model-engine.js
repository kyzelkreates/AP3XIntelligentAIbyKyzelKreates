// ============================================================
// AP3X — MODULE 3: SITE MODEL ENGINE v2.0
// SYSTEM INTELLIGENCE REVERSE-ENGINEERING ENGINE
// Layers: Surface · Tech Stack · AI Detection · Data Flow
// ============================================================

const SiteModelEngine = (() => {

  function buildModel(snapshot, jobId) {
    const text = snapshot.text || '';

    const pages        = inferPages(snapshot);
    const features     = inferFeatures(snapshot);
    const userFlows    = inferUserFlows(snapshot, features);
    const components   = inferComponents(snapshot);
    const actions      = _dedupeStrings([
      ...snapshot.buttons.filter(b => b.length > 1),
      ...snapshot.forms.map(f => f.action).filter(Boolean)
    ]);
    const dataEntities   = inferDataEntities(snapshot, features);
    const techStack      = inferTechStack(snapshot);
    const aiAgentModel   = inferAIAgentModel(snapshot);
    const dataFlowModel  = inferDataFlowModel(snapshot, features);

    const productName = snapshot.meta?.title?.split('|')[0]?.split('-')[0]?.trim()
      || snapshot.headings?.h1?.[0]
      || (() => { try { return new URL(snapshot.url).hostname.replace('www.',''); } catch { return 'Unknown'; } })();

    const category = inferCategory(snapshot);

    return {
      jobId,
      version:   2,
      builtAt:   new Date().toISOString(),
      url:       snapshot.url,
      productName,
      category,
      pages,
      features,
      userFlows,
      components,
      actions,
      inferred_data_entities: dataEntities,
      // NEW v2 layers
      techStack,
      aiAgentModel,
      dataFlowModel
    };
  }

  // ── PAGES ─────────────────────────────────────────────────
  function inferPages(snapshot) {
    const pageMap = {};
    const addPage = (path, label) => {
      if (!path || path.length > 80) return;
      if (pageMap[path]) return;
      pageMap[path] = { path, label: label || _pathToLabel(path), inferred: true };
    };
    for (const n of snapshot.navigation || []) {
      addPage('/' + n.toLowerCase().replace(/\s+/g,'-'), n);
    }
    try {
      const base = new URL(snapshot.url);
      for (const link of snapshot.links || []) {
        try {
          const u = new URL(link);
          if (u.hostname === base.hostname) addPage(u.pathname, _pathToLabel(u.pathname));
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    pageMap['/'] = pageMap['/'] || { path: '/', label: 'Home', inferred: false };
    return Object.values(pageMap).slice(0, 25);
  }

  function _pathToLabel(path) {
    return path.replace(/\//g,' ').replace(/-/g,' ').replace(/_/g,' ')
      .trim().split(' ').filter(w=>w.length>1)
      .map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ') || 'Page';
  }

  // ── FEATURES ──────────────────────────────────────────────
  function inferFeatures(snapshot) {
    const features = [];
    const text = snapshot.text.toLowerCase();
    const headings = [
      ...snapshot.headings.h1,
      ...snapshot.headings.h2,
      ...snapshot.headings.h3
    ];

    const featureSignals = [
      { pattern: /dashboard/i,                name:'Dashboard',              type:'ui' },
      { pattern: /analytics|insights|report/i, name:'Analytics',             type:'data' },
      { pattern: /authentication|sign.?in|log.?in|oauth/i, name:'Authentication', type:'auth' },
      { pattern: /team|collaborat|workspace/i, name:'Team Collaboration',    type:'collab' },
      { pattern: /api|integration|webhook/i,   name:'API & Integrations',    type:'api' },
      { pattern: /payment|billing|subscription|stripe/i, name:'Payments & Billing', type:'billing' },
      { pattern: /notification|alert|email/i,  name:'Notifications',         type:'comm' },
      { pattern: /search/i,                    name:'Search',                type:'ui' },
      { pattern: /upload|file|media|storage/i, name:'File Management',       type:'storage' },
      { pattern: /automat|workflow|pipeline/i, name:'Automation',            type:'workflow' },
      { pattern: /ai|machine learning|model/i, name:'AI\/ML Features',       type:'ai' },
      { pattern: /mobile|ios|android|app/i,    name:'Mobile Support',        type:'platform' },
      { pattern: /sso|saml|ldap/i,             name:'Enterprise Auth (SSO)', type:'auth' },
      { pattern: /audit|compliance|gdpr/i,     name:'Compliance & Audit',    type:'compliance' },
      { pattern: /export|import|csv|json/i,    name:'Data Export\/Import',   type:'data' },
      { pattern: /chat|messaging|inbox/i,      name:'Messaging',             type:'comm' },
      { pattern: /pricing|plan|tier/i,         name:'Tiered Pricing',        type:'billing' },
      { pattern: /docs|documentation|guide/i,  name:'Documentation',         type:'support' },
    ];

    const allText = text + headings.join(' ').toLowerCase();
    const seen    = new Set();
    for (const sig of featureSignals) {
      if (sig.pattern.test(allText) && !seen.has(sig.name)) {
        seen.add(sig.name);
        features.push({ name: sig.name, type: sig.type, confidence: 'inferred' });
      }
    }
    for (const h of [...snapshot.headings.h2, ...snapshot.headings.h3].slice(0,20)) {
      if (h.length > 5 && h.length < 60 && !seen.has(h)) {
        seen.add(h);
        features.push({ name: h, type: 'content', confidence: 'direct' });
      }
    }
    return features.slice(0, 30);
  }

  // ── USER FLOWS ────────────────────────────────────────────
  function inferUserFlows(snapshot, features) {
    const flows = [];
    const text  = snapshot.text.toLowerCase();
    const flowPatterns = [
      { trigger: /sign.?up|register|get started|create account/i,
        name: 'Signup / Onboarding',
        flow: ['Landing page','Sign up form','Email verification','Onboarding','Dashboard'] },
      { trigger: /sign.?in|log.?in/i,
        name: 'Login',
        flow: ['Login page','Credential input','Authentication','Dashboard redirect'] },
      { trigger: /payment|checkout|subscribe/i,
        name: 'Purchase / Subscribe',
        flow: ['Pricing page','Plan selection','Payment form','Confirmation','Access granted'] },
      { trigger: /upload|import/i,
        name: 'Data Import',
        flow: ['Select data source','Upload/import','Processing','Review output'] },
      { trigger: /search/i,
        name: 'Search',
        flow: ['Search input','Results list','Item detail','Action'] },
      { trigger: /onboard/i,
        name: 'Onboarding',
        flow: ['Welcome screen','Profile setup','Configuration','Feature tour','First action'] }
    ];
    for (const fp of flowPatterns) {
      if (fp.trigger.test(text)) {
        flows.push({ name: fp.name, steps: fp.flow });
      }
    }
    return flows;
  }

  // ── COMPONENTS ────────────────────────────────────────────
  function inferComponents(snapshot) {
    const components = [];
    const compSignals = [
      { pattern: /nav|menu|header/i,         name:'Navigation Bar' },
      { pattern: /hero|banner/i,             name:'Hero Section' },
      { pattern: /card|tile/i,               name:'Card Components' },
      { pattern: /modal|dialog|popup/i,      name:'Modal/Dialog' },
      { pattern: /table|grid|list/i,         name:'Data Table/Grid' },
      { pattern: /form|input|field/i,        name:'Form Components' },
      { pattern: /chart|graph|visuali/i,     name:'Charts/Visualisations' },
      { pattern: /sidebar|drawer/i,          name:'Sidebar/Drawer' },
      { pattern: /footer/i,                  name:'Footer' },
      { pattern: /toast|snackbar|notif/i,    name:'Notification Toast' },
      { pattern: /dropdown|select/i,         name:'Dropdown/Select' },
      { pattern: /tab|switch/i,              name:'Tabs/Switches' },
      { pattern: /badge|tag|chip/i,          name:'Badges/Tags' },
      { pattern: /avatar|profile/i,          name:'Avatar/Profile' },
      { pattern: /progress|loader|spinner/i, name:'Progress/Loader' },
    ];
    const allText = (snapshot.text + (snapshot.navigation||[]).join(' ')).toLowerCase();
    for (const sig of compSignals) {
      if (sig.pattern.test(allText)) components.push({ name: sig.name, source: 'inferred' });
    }
    if (snapshot.forms?.length > 0) {
      components.push({ name: `${snapshot.forms.length} Form(s) detected`, source: 'direct' });
    }
    return components;
  }

  // ── DATA ENTITIES ─────────────────────────────────────────
  function inferDataEntities(snapshot, features) {
    const entities = [];
    const seen     = new Set(['users','sessions']);
    entities.push({ name:'users',    fields:['id','email','name','created_at','role'], source:'core' });
    entities.push({ name:'sessions', fields:['id','user_id','token','created_at','expires_at'], source:'core' });

    const text = snapshot.text.toLowerCase();
    const entitySignals = [
      { pattern:/project|workspace/i,     name:'projects',          fields:['id','name','user_id','status','created_at'] },
      { pattern:/team|member|collaborat/i, name:'team_members',     fields:['id','team_id','user_id','role'] },
      { pattern:/task|todo|issue|ticket/i, name:'tasks',            fields:['id','title','status','assignee_id','due_date'] },
      { pattern:/payment|billing|invoice/i,name:'payments',         fields:['id','user_id','amount','status','created_at'] },
      { pattern:/subscription|plan/i,      name:'subscriptions',    fields:['id','user_id','plan','status','renews_at'] },
      { pattern:/report|analytics/i,       name:'analytics_events', fields:['id','user_id','event','properties','timestamp'] },
      { pattern:/file|upload|media/i,      name:'files',            fields:['id','user_id','filename','url','size','created_at'] },
      { pattern:/audit|log/i,              name:'audit_logs',       fields:['id','user_id','action','resource','timestamp'] },
      { pattern:/notification/i,           name:'notifications',    fields:['id','user_id','type','message','read','created_at'] },
      { pattern:/product|inventory/i,      name:'products',         fields:['id','name','price','sku','stock'] },
      { pattern:/order/i,                  name:'orders',           fields:['id','user_id','total','status','created_at'] },
      { pattern:/chat|message/i,           name:'messages',         fields:['id','sender_id','recipient_id','content','timestamp'] },
      { pattern:/agent|bot|workflow/i,     name:'agent_runs',       fields:['id','agent_id','status','input','output','started_at'] },
    ];

    for (const sig of entitySignals) {
      if (sig.pattern.test(text) && !seen.has(sig.name)) {
        seen.add(sig.name);
        entities.push({ name: sig.name, fields: sig.fields, source: 'inferred' });
      }
    }
    return entities;
  }

  // ── LAYER 2: TECHNICAL STACK ANALYSIS ─────────────────────
  function inferTechStack(snapshot) {
    const html    = snapshot.text || '';
    const text    = html.toLowerCase();
    const apiSigs = snapshot.apiSignals || [];
    const allSigs = [...apiSigs].join(' ').toLowerCase();

    // Frontend framework
    const frontend = _detectFrontend(html, text, snapshot);

    // Backend + hosting
    const backend  = _detectBackend(text, allSigs, snapshot);

    // Database
    const database = _detectDatabase(text, allSigs);

    // Auth
    const auth     = _detectAuth(html, text, snapshot.features);

    // State management
    const state    = _detectState(text, frontend);

    // API structure
    const api      = _detectApiStructure(text, allSigs, snapshot);

    // Hosting / CDN
    const hosting  = _detectHosting(text, allSigs, snapshot);

    return {
      frontend,
      backend,
      database,
      auth,
      state,
      api,
      hosting,
      stackSummary: _buildStackSummary(frontend, backend, database, hosting)
    };
  }

  function _detectFrontend(html, text, snapshot) {
    const signals = [];

    if (/__next|_next\/|nextjs|next\.js/i.test(html))           signals.push({ name:'Next.js',   confidence:'likely' });
    else if (/react|reactdom|__react/i.test(html))              signals.push({ name:'React',     confidence:'likely' });
    if (/nuxt|vue\.js|vuex/i.test(html))                        signals.push({ name:'Vue/Nuxt',  confidence:'likely' });
    if (/angular|ng-app|ng-version/i.test(html))                signals.push({ name:'Angular',   confidence:'likely' });
    if (/svelte/i.test(html))                                    signals.push({ name:'Svelte',    confidence:'likely' });
    if (/remix\.run|__remixContext/i.test(html))                 signals.push({ name:'Remix',     confidence:'likely' });
    if (/gatsby/i.test(html))                                    signals.push({ name:'Gatsby',    confidence:'likely' });
    if (/astro/i.test(html))                                     signals.push({ name:'Astro',     confidence:'likely' });
    if (/wordpress|wp-content|wp-includes/i.test(html))         signals.push({ name:'WordPress', confidence:'confirmed' });
    if (/shopify/i.test(html))                                   signals.push({ name:'Shopify',   confidence:'confirmed' });
    if (/webflow/i.test(html))                                   signals.push({ name:'Webflow',   confidence:'confirmed' });
    if (/wix\.com|wixsite/i.test(html))                         signals.push({ name:'Wix',       confidence:'confirmed' });

    if (signals.length === 0) {
      // Infer from page structure
      const hasSPA = !snapshot.links || snapshot.links.length < 3;
      signals.push({ name: hasSPA ? 'SPA (framework inferred)' : 'Static/SSR HTML', confidence:'inferred' });
    }

    const pwa     = /service.?worker|manifest\.json|pwa/i.test(html);
    const mobile  = /viewport.*width=device|mobile|responsive/i.test(html);
    const ssr     = /__NEXT_DATA__|__NUXT__|window\.__INITIAL_STATE__/i.test(html);
    const cssFramework = _detectCSSFramework(html, text);

    return { signals, pwa, mobile, ssr, cssFramework };
  }

  function _detectCSSFramework(html, text) {
    if (/tailwind|tw-/i.test(html))        return { name:'Tailwind CSS', confidence:'likely' };
    if (/bootstrap/i.test(html))           return { name:'Bootstrap',    confidence:'likely' };
    if (/material.?ui|mui/i.test(html))    return { name:'Material UI',  confidence:'likely' };
    if (/chakra.?ui/i.test(html))          return { name:'Chakra UI',    confidence:'likely' };
    if (/styled.?components|emotion/i.test(html)) return { name:'CSS-in-JS', confidence:'inferred' };
    return { name:'Custom CSS', confidence:'inferred' };
  }

  function _detectBackend(text, allSigs, snapshot) {
    const signals = [];

    if (/vercel/i.test(allSigs + text))         signals.push({ name:'Vercel (serverless)',     confidence:'likely' });
    if (/netlify/i.test(allSigs + text))        signals.push({ name:'Netlify Functions',       confidence:'likely' });
    if (/cloudflare.?workers|cf-ray/i.test(text)) signals.push({ name:'Cloudflare Workers',   confidence:'likely' });
    if (/aws.lambda|amazonaws\.com/i.test(allSigs + text)) signals.push({ name:'AWS Lambda',  confidence:'likely' });
    if (/node\.js|express|fastify/i.test(text)) signals.push({ name:'Node.js',                confidence:'inferred' });
    if (/django|flask|fastapi/i.test(text))     signals.push({ name:'Python backend',          confidence:'inferred' });
    if (/rails|ruby/i.test(text))               signals.push({ name:'Ruby on Rails',           confidence:'inferred' });
    if (/supabase/i.test(allSigs + text))       signals.push({ name:'Supabase (BaaS)',         confidence:'likely' });
    if (/firebase/i.test(allSigs + text))       signals.push({ name:'Firebase (BaaS)',         confidence:'likely' });
    if (/graphql/i.test(allSigs))               signals.push({ name:'GraphQL API',             confidence:'likely' });

    if (signals.length === 0) signals.push({ name:'Backend (not directly observable)', confidence:'inferred' });

    const queue = /queue|worker|job|async|celery|bull|sidekiq/i.test(text);
    const cache = /redis|cdn|cache|edge/i.test(text);
    const realtime = /websocket|socket\.io|pusher|ably|realtime/i.test(text);

    return { signals, queue, cache, realtime };
  }

  function _detectDatabase(text, allSigs) {
    const combined = text + allSigs;
    const signals  = [];

    if (/supabase|postgresql|postgres/i.test(combined))   signals.push({ name:'PostgreSQL',    confidence:'likely' });
    if (/firebase|firestore/i.test(combined))             signals.push({ name:'Firestore (NoSQL)', confidence:'likely' });
    if (/mongodb|mongoose/i.test(combined))               signals.push({ name:'MongoDB',       confidence:'likely' });
    if (/mysql|mariadb/i.test(combined))                  signals.push({ name:'MySQL',         confidence:'inferred' });
    if (/redis/i.test(combined))                          signals.push({ name:'Redis (cache/queue)', confidence:'inferred' });
    if (/sqlite/i.test(combined))                         signals.push({ name:'SQLite',        confidence:'inferred' });
    if (/planetscale/i.test(combined))                    signals.push({ name:'PlanetScale',   confidence:'likely' });
    if (/dynamo|dynamodb/i.test(combined))                signals.push({ name:'DynamoDB',      confidence:'likely' });
    if (/neon\.tech/i.test(combined))                     signals.push({ name:'Neon (Postgres)', confidence:'likely' });

    if (signals.length === 0) signals.push({ name:'Relational DB (inferred)', confidence:'inferred' });
    return { signals };
  }

  function _detectAuth(html, text, features) {
    const signals = [];

    if (/auth0/i.test(html + text))                  signals.push({ name:'Auth0',         confidence:'likely' });
    if (/clerk\.dev|clerk/i.test(html + text))       signals.push({ name:'Clerk',         confidence:'likely' });
    if (/supabase.*auth|@supabase\/auth/i.test(html))signals.push({ name:'Supabase Auth', confidence:'likely' });
    if (/firebase.*auth/i.test(html + text))         signals.push({ name:'Firebase Auth', confidence:'likely' });
    if (/magic\.link|magic-link/i.test(html + text)) signals.push({ name:'Magic Link',    confidence:'likely' });
    if (/next.?auth/i.test(html + text))             signals.push({ name:'NextAuth.js',   confidence:'likely' });
    if (/okta/i.test(html + text))                   signals.push({ name:'Okta',          confidence:'likely' });
    if (/workos/i.test(html + text))                 signals.push({ name:'WorkOS',        confidence:'likely' });

    const oauth   = /google.*sign|github.*sign|oauth/i.test(html + text);
    const sso     = /sso|saml|ldap/i.test(text);
    const mfa     = /2fa|mfa|two.factor|totp/i.test(text);
    const passkey = /passkey|webauthn/i.test(text);

    if (signals.length === 0) signals.push({ name:'Custom or inferred auth', confidence:'inferred' });
    return { signals, oauth, sso, mfa, passkey };
  }

  function _detectState(text, frontend) {
    const signals = [];
    if (/redux|zustand|recoil/i.test(text))     signals.push({ name:'Redux/Zustand (inferred)', confidence:'inferred' });
    if (/pinia|vuex/i.test(text))               signals.push({ name:'Pinia/Vuex',               confidence:'inferred' });
    if (/react.?query|swr|tanstack/i.test(text))signals.push({ name:'Server state (React Query/SWR)', confidence:'inferred' });
    if (/localstorage|indexeddb/i.test(text))   signals.push({ name:'LocalStorage/IndexedDB',   confidence:'inferred' });

    const ssr = frontend?.ssr;
    if (signals.length === 0) {
      signals.push({ name: ssr ? 'SSR state (inferred)' : 'Component-local state (inferred)', confidence:'inferred' });
    }
    return { signals };
  }

  function _detectApiStructure(text, allSigs, snapshot) {
    const style    = [];
    if (/graphql/i.test(allSigs + text))    style.push({ name:'GraphQL',    confidence:'likely' });
    if (/rest|restful/i.test(allSigs))      style.push({ name:'REST API',   confidence:'likely' });
    if (/grpc/i.test(allSigs + text))       style.push({ name:'gRPC',       confidence:'inferred' });
    if (/websocket|socket\.io/i.test(text)) style.push({ name:'WebSocket',  confidence:'inferred' });
    if (/webhook/i.test(allSigs + text))    style.push({ name:'Webhooks',   confidence:'inferred' });

    const hasPublicApi = /api.?docs|swagger|openapi|postman|developer/i.test(text);
    const hasSDK       = /sdk|npm install|pip install|gem install/i.test(text);
    if (style.length === 0) style.push({ name:'REST API (inferred)', confidence:'inferred' });

    return { style, hasPublicApi, hasSDK };
  }

  function _detectHosting(text, allSigs, snapshot) {
    const signals = [];
    const combined = text + allSigs;
    if (/vercel\.app|vercel\.com/i.test(combined))          signals.push({ name:'Vercel',         confidence:'likely' });
    if (/netlify\.app|netlify\.com/i.test(combined))        signals.push({ name:'Netlify',         confidence:'likely' });
    if (/amazonaws\.com|aws\.amazon/i.test(combined))       signals.push({ name:'AWS',             confidence:'likely' });
    if (/googleapis\.com|gcp|appengine/i.test(combined))    signals.push({ name:'Google Cloud',    confidence:'likely' });
    if (/azure\.com|azurewebsites/i.test(combined))         signals.push({ name:'Azure',           confidence:'likely' });
    if (/cloudflare/i.test(combined))                       signals.push({ name:'Cloudflare',      confidence:'likely' });
    if (/fly\.io/i.test(combined))                          signals.push({ name:'Fly.io',          confidence:'likely' });
    if (/railway\.app/i.test(combined))                     signals.push({ name:'Railway',         confidence:'likely' });
    if (/render\.com/i.test(combined))                      signals.push({ name:'Render',          confidence:'likely' });
    if (signals.length === 0) signals.push({ name:'Hosting provider (not detectable)', confidence:'inferred' });

    const cdn = /cdn|cloudfront|fastly|imgix/i.test(combined);
    return { signals, cdn };
  }

  function _buildStackSummary(frontend, backend, database, hosting) {
    const fe = frontend.signals[0]?.name || 'Unknown frontend';
    const be = backend.signals[0]?.name  || 'Unknown backend';
    const db = database.signals[0]?.name || 'Unknown DB';
    const ho = hosting.signals[0]?.name  || 'Unknown hosting';
    return `${fe} → ${be} → ${db} (${ho})`;
  }

  // ── LAYER 3: AI AGENT DETECTION ───────────────────────────
  function inferAIAgentModel(snapshot) {
    const text    = snapshot.text.toLowerCase();
    const html    = snapshot.text;

    const hasAI        = /\bai\b|artificial intelligence|machine learning|large language|llm|gpt|claude|gemini|openai|anthropic|llama/i.test(html);
    const hasAgents    = /agent|multi.?agent|agentic|autonomous|orchestrat/i.test(text);
    const hasWorkflow  = /workflow|pipeline|chain|automation|orchestrat/i.test(text);
    const hasLLM       = /openai|anthropic|gpt-|claude|gemini|mistral|llama|cohere|hugging.face/i.test(text);
    const hasRAG       = /rag|retrieval|vector|embedding|semantic.search|pinecone|weaviate|chroma/i.test(text);
    const hasFineTune  = /fine.?tun|train|dataset|finetun/i.test(text);
    const hasTriggers  = /webhook|event.?driven|trigger|schedule|cron/i.test(text);
    const hasTools     = /tool.?use|function.?call|plugin|action|tool/i.test(text);
    const hasMemory    = /memory|context.?window|long.?term|persist.*context/i.test(text);

    if (!hasAI && !hasAgents) {
      return { detected: false, confidence: 'inferred', summary: 'No AI/agent signals detected on this page' };
    }

    // Detect agent count / roles
    const agentRoles  = [];
    if (/planner|planning.?agent/i.test(text))   agentRoles.push({ role:'Planner',   type:'orchestrator', confidence:'inferred' });
    if (/executor|execution.?agent/i.test(text)) agentRoles.push({ role:'Executor',  type:'worker',       confidence:'inferred' });
    if (/validator|review.?agent|critic/i.test(text)) agentRoles.push({ role:'Validator', type:'quality', confidence:'inferred' });
    if (/monitor|observer|watch/i.test(text))    agentRoles.push({ role:'Monitor',   type:'observability',confidence:'inferred' });
    if (/retriev|search.?agent/i.test(text))     agentRoles.push({ role:'Retrieval', type:'knowledge',    confidence:'inferred' });
    if (/coder|code.?gen/i.test(text))           agentRoles.push({ role:'Coder',     type:'generator',    confidence:'inferred' });

    // If no specific roles found but agents mentioned, add generic
    if (agentRoles.length === 0 && hasAgents) {
      agentRoles.push({ role:'AI Agent', type:'general', confidence:'inferred' });
    }

    // Trigger types
    const triggerTypes = [];
    if (/user.?input|chat|prompt/i.test(text))   triggerTypes.push('User input / chat prompt');
    if (/event.?driven|webhook/i.test(text))     triggerTypes.push('Event-driven trigger');
    if (/schedule|cron|background/i.test(text))  triggerTypes.push('Scheduled / background process');
    if (/api.?call|request/i.test(text))         triggerTypes.push('API request trigger');
    if (triggerTypes.length === 0)               triggerTypes.push('Trigger type (inferred)');

    // LLM providers
    const llmProviders = [];
    if (/openai|gpt/i.test(text))          llmProviders.push({ name:'OpenAI / GPT',    confidence:'likely' });
    if (/anthropic|claude/i.test(text))    llmProviders.push({ name:'Anthropic / Claude', confidence:'likely' });
    if (/gemini|google.?ai/i.test(text))   llmProviders.push({ name:'Google Gemini',   confidence:'likely' });
    if (/llama|meta.?ai/i.test(text))      llmProviders.push({ name:'Meta / Llama',    confidence:'likely' });
    if (/mistral/i.test(text))             llmProviders.push({ name:'Mistral AI',       confidence:'likely' });
    if (/cohere/i.test(text))              llmProviders.push({ name:'Cohere',           confidence:'likely' });
    if (llmProviders.length === 0 && hasLLM) llmProviders.push({ name:'LLM provider (unspecified)', confidence:'inferred' });

    // System type
    const systemType = agentRoles.length >= 2 ? 'Multi-agent system'
                     : agentRoles.length === 1 ? 'Single-agent system'
                     : hasWorkflow ? 'AI-powered workflow'
                     : 'AI feature integration';

    // Interaction flow (text-based diagram)
    const interactionFlow = _buildAgentFlow(agentRoles, triggerTypes, hasRAG, hasTools, hasMemory);

    return {
      detected:       true,
      systemType,
      confidence:     hasLLM ? 'likely' : 'inferred',
      agentCount:     agentRoles.length,
      agentRoles,
      llmProviders,
      triggerTypes,
      capabilities: {
        rag:       hasRAG,
        fineTuning:hasFineTune,
        toolUse:   hasTools,
        memory:    hasMemory,
        streaming: /stream|server.?sent.?event/i.test(text)
      },
      interactionFlow,
      summary: `${systemType} — ${agentRoles.length} role(s) detected — ${llmProviders.map(l=>l.name).join(', ') || 'LLM inferred'}`
    };
  }

  function _buildAgentFlow(roles, triggers, hasRAG, hasTools, hasMemory) {
    const lines = [];
    lines.push('[ INTERACTION FLOW ]');
    lines.push('');
    const trigger = triggers[0] || 'User Input';
    lines.push(`  INPUT: ${trigger}`);
    lines.push('    ↓');
    if (hasMemory)  { lines.push('  MEMORY RETRIEVAL'); lines.push('    ↓'); }
    if (hasRAG)     { lines.push('  KNOWLEDGE RETRIEVAL (RAG/Vector)'); lines.push('    ↓'); }
    for (const r of roles) {
      lines.push(`  [AGENT: ${r.role.toUpperCase()} — ${r.type.toUpperCase()}]`);
      lines.push('    ↓');
    }
    if (hasTools)   { lines.push('  TOOL EXECUTION'); lines.push('    ↓'); }
    lines.push('  OUTPUT / RESPONSE');
    if (roles.length > 1) {
      lines.push('');
      lines.push('  * Multi-agent coordination inferred');
    }
    return lines.join('\n');
  }

  // ── LAYER 4: DATA FLOW MODEL ──────────────────────────────
  function inferDataFlowModel(snapshot, features) {
    const text = snapshot.text.toLowerCase();

    // Data inputs
    const inputs = [];
    if (/form|input|signup|submit/i.test(text))      inputs.push({ type:'User input', detail:'Form/signup data', confidence:'inferred' });
    if (/upload|file|import/i.test(text))            inputs.push({ type:'File/data upload', detail:'File or dataset ingestion', confidence:'inferred' });
    if (/api|webhook|integration/i.test(text))       inputs.push({ type:'External API', detail:'Third-party data ingest', confidence:'inferred' });
    if (/event|tracking|analytics/i.test(text))      inputs.push({ type:'Event tracking', detail:'User behaviour telemetry', confidence:'inferred' });
    if (/schedule|cron|batch/i.test(text))           inputs.push({ type:'Scheduled job', detail:'Automated background ingest', confidence:'inferred' });
    if (inputs.length === 0) inputs.push({ type:'User input (inferred)', detail:'Primary data entry via UI', confidence:'inferred' });

    // Storage behaviour
    const storage = [];
    if (/localStorage|indexeddb|client.?side/i.test(text)) storage.push({ type:'Client-side', detail:'localStorage/IndexedDB', confidence:'inferred' });
    if (/database|supabase|firebase|postgres|mongo/i.test(text + snapshot.apiSignals?.join(' '))) storage.push({ type:'Server database', detail:'Persistent server-side storage', confidence:'inferred' });
    if (/cache|redis|cdn/i.test(text)) storage.push({ type:'Cache layer', detail:'Redis/CDN caching', confidence:'inferred' });
    if (/s3|blob|storage|bucket/i.test(text)) storage.push({ type:'Object storage', detail:'S3/Blob file storage', confidence:'inferred' });
    if (storage.length === 0) storage.push({ type:'Standard DB (inferred)', detail:'Server-side persistence inferred', confidence:'inferred' });

    // Processing
    const processing = [];
    if (/ai|ml|model|infer/i.test(text))             processing.push('AI/ML inference layer');
    if (/transform|normaliz|clean/i.test(text))      processing.push('Data transformation');
    if (/queue|worker|async|job/i.test(text))        processing.push('Async job processing');
    if (/aggregat|rollup|report/i.test(text))        processing.push('Data aggregation / reporting');
    if (/webhook|trigger|event/i.test(text))         processing.push('Event-driven processing');
    if (processing.length === 0) processing.push('Standard CRUD processing (inferred)');

    // Feedback loops
    const feedbackLoops = [];
    if (/learn|improve|retrain|feedback/i.test(text)) feedbackLoops.push({ type:'Learning loop', detail:'System improves from usage data', confidence:'inferred' });
    if (/a\/b.?test|experiment/i.test(text))          feedbackLoops.push({ type:'A/B experimentation', detail:'Feature experimentation inferred', confidence:'inferred' });
    if (/recommend|personali/i.test(text))            feedbackLoops.push({ type:'Personalisation', detail:'User behaviour → content adaptation', confidence:'inferred' });
    if (/analytics|metrics|dashb/i.test(text))        feedbackLoops.push({ type:'Business intelligence', detail:'Metrics → product decisions', confidence:'inferred' });

    // Telemetry
    const telemetry = [];
    if (/google.?analytics|ga\.js|gtag/i.test(snapshot.text)) telemetry.push({ name:'Google Analytics', confidence:'confirmed' });
    if (/segment\.com|analytics\.js/i.test(snapshot.text))    telemetry.push({ name:'Segment',          confidence:'likely' });
    if (/mixpanel/i.test(snapshot.text))                       telemetry.push({ name:'Mixpanel',         confidence:'likely' });
    if (/amplitude/i.test(snapshot.text))                      telemetry.push({ name:'Amplitude',        confidence:'likely' });
    if (/hotjar/i.test(snapshot.text))                         telemetry.push({ name:'Hotjar',           confidence:'likely' });
    if (/sentry|datadog|newrelic/i.test(snapshot.text))        telemetry.push({ name:'Error monitoring', confidence:'likely' });
    if (/intercom/i.test(snapshot.text))                       telemetry.push({ name:'Intercom',         confidence:'likely' });

    const isRealtime = /websocket|socket\.io|pusher|realtime|live/i.test(text);

    // Build text-based data flow diagram
    const flowDiagram = _buildDataFlowDiagram(inputs, processing, storage, feedbackLoops, isRealtime);

    return {
      inputs,
      storage,
      processing,
      feedbackLoops,
      telemetry,
      isRealtime,
      flowDiagram
    };
  }

  function _buildDataFlowDiagram(inputs, processing, storage, feedback, isRealtime) {
    const lines = ['[ DATA FLOW DIAGRAM ]', ''];
    lines.push('  INPUTS:');
    for (const i of inputs) lines.push(`    • ${i.type} [${i.confidence}]`);
    lines.push('    ↓');
    lines.push('  PROCESSING:');
    for (const p of processing) lines.push(`    • ${p}`);
    lines.push('    ↓');
    lines.push('  STORAGE:');
    for (const s of storage) lines.push(`    • ${s.type} [${s.confidence}]`);
    if (feedback.length > 0) {
      lines.push('    ↓');
      lines.push('  FEEDBACK LOOPS:');
      for (const f of feedback) lines.push(`    ↺ ${f.type} [${f.confidence}]`);
    }
    if (isRealtime) {
      lines.push('');
      lines.push('  * Real-time data sync inferred (WebSocket/Pusher/SSE)');
    }
    return lines.join('\n');
  }

  // ── CATEGORY INFERENCE ────────────────────────────────────
  function inferCategory(snapshot) {
    const text = snapshot.text.toLowerCase();
    const title = (snapshot.meta?.title || '').toLowerCase();
    const all   = text + title;

    const cats = [
      [/stripe|payment.?gateway|billing.?platform|fintech/i, 'Fintech / Payments'],
      [/developer.?tool|devtool|github|gitlab|ci\/cd|deploy/i,'Developer Tools'],
      [/ecommerce|e-commerce|shopify|woocommerce/i,          'E-Commerce'],
      [/health|medical|clinic|patient|ehr|emr/i,            'HealthTech'],
      [/edu|learning|course|lms|school|student/i,           'EdTech'],
      [/hr|human.resource|payroll|talent|recruit/i,         'HR Tech'],
      [/marketing|email.?campaign|crm|lead.?gen/i,          'MarTech / CRM'],
      [/analytics|business.?intelligence|dashboard|bi\b/i,  'Analytics / BI'],
      [/logistics|fleet|delivery|shipping|transport/i,      'Logistics Tech'],
      [/ai.?platform|llm|gpt|agent|ml.?platform/i,         'AI / ML Platform'],
      [/social|community|network|feed|post/i,               'Social / Community'],
      [/security|cybersec|soc|siem|vulnerability/i,         'Cybersecurity'],
      [/iot|device|sensor|embedded/i,                       'IoT / Hardware'],
      [/legal|contract|compliance|regtech/i,                'LegalTech / RegTech'],
      [/real.?estate|property|mortgage/i,                   'PropTech'],
    ];

    for (const [p, cat] of cats) {
      if (p.test(all)) return cat;
    }

    if (/saas|software/i.test(all)) return 'SaaS Platform';
    if (/api|integration|platform/i.test(all)) return 'API / Integration Platform';
    return 'Digital Product / Web App';
  }

  // ── UTILITY ───────────────────────────────────────────────
  function _dedupeStrings(arr) {
    return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
  }

  return { buildModel };
})();

window.SiteModelEngine = SiteModelEngine;
