// ============================================================
// AP3X — MODULE 3: SITE MODEL ENGINE
// Normalises raw snapshot into structured SITE_MODEL
// ============================================================

const SiteModelEngine = (() => {

  function buildModel(snapshot, jobId) {
    const text = snapshot.text || '';
    const all  = text.toLowerCase();

    // ── Pages ─────────────────────────────────────────────────
    const pages = inferPages(snapshot);

    // ── Features ─────────────────────────────────────────────
    const features = inferFeatures(snapshot);

    // ── User flows ────────────────────────────────────────────
    const userFlows = inferUserFlows(snapshot, features);

    // ── Components ────────────────────────────────────────────
    const components = inferComponents(snapshot);

    // ── Actions ──────────────────────────────────────────────
    const actions = dedupeStrings([
      ...snapshot.buttons.filter(b => b.length > 1),
      ...snapshot.forms.map(f => f.action).filter(Boolean)
    ]);

    // ── Inferred data entities ────────────────────────────────
    const dataEntities = inferDataEntities(snapshot, features);

    // ── Product name ─────────────────────────────────────────
    const productName = snapshot.meta?.title?.split('|')[0]?.split('-')[0]?.trim()
      || snapshot.headings?.h1?.[0]
      || new URL(snapshot.url).hostname.replace('www.', '');

    // ── Product category ─────────────────────────────────────
    const category = inferCategory(snapshot);

    return {
      jobId,
      version:    1,
      builtAt:    new Date().toISOString(),
      url:        snapshot.url,
      productName,
      category,
      pages,
      features,
      userFlows,
      components,
      actions,
      inferred_data_entities: dataEntities
    };
  }

  // ── Infer pages from links + nav ──────────────────────────
  function inferPages(snapshot) {
    const pageMap = {};

    const addPage = (path, label) => {
      if (!path || path.length > 80) return;
      if (pageMap[path]) return;
      pageMap[path] = { path, label: label || pathToLabel(path), inferred: true };
    };

    // From navigation
    for (const n of snapshot.navigation || []) {
      addPage('/' + n.toLowerCase().replace(/\s+/g, '-'), n);
    }

    // From links
    try {
      const base = new URL(snapshot.url);
      for (const link of snapshot.links || []) {
        try {
          const u  = new URL(link);
          if (u.hostname === base.hostname) {
            addPage(u.pathname, pathToLabel(u.pathname));
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }

    // Always add home
    pageMap['/'] = pageMap['/'] || { path: '/', label: 'Home', inferred: false };

    return Object.values(pageMap).slice(0, 25);
  }

  function pathToLabel(path) {
    return path.replace(/\//g, ' ').replace(/-/g, ' ').replace(/_/g, ' ')
      .trim()
      .split(' ')
      .filter(w => w.length > 1)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      || 'Page';
  }

  // ── Infer features ────────────────────────────────────────
  function inferFeatures(snapshot) {
    const features = [];
    const text = snapshot.text.toLowerCase();
    const headings = [
      ...snapshot.headings.h1,
      ...snapshot.headings.h2,
      ...snapshot.headings.h3
    ];

    const featureSignals = [
      { pattern: /dashboard/i,               name: 'Dashboard',         type: 'ui' },
      { pattern: /analytics|insights|report/i,name: 'Analytics',         type: 'data' },
      { pattern: /authentication|sign.?in|log.?in|oauth/i, name: 'Authentication', type: 'auth' },
      { pattern: /team|collaborat|workspace/i,name: 'Team Collaboration', type: 'collab' },
      { pattern: /api|integration|webhook/i,  name: 'API & Integrations', type: 'api' },
      { pattern: /payment|billing|subscription|stripe/i, name: 'Payments & Billing', type: 'billing' },
      { pattern: /notification|alert|email/i, name: 'Notifications',     type: 'comm' },
      { pattern: /search/i,                   name: 'Search',            type: 'ui' },
      { pattern: /upload|file|media|storage/i,name: 'File Management',   type: 'storage' },
      { pattern: /automat|workflow|pipeline/i, name: 'Automation',       type: 'workflow' },
      { pattern: /ai|machine learning|model/i, name: 'AI/ML Features',   type: 'ai' },
      { pattern: /mobile|ios|android|app/i,    name: 'Mobile Support',   type: 'platform' },
      { pattern: /sso|saml|ldap/i,             name: 'Enterprise Auth (SSO)', type: 'auth' },
      { pattern: /audit|compliance|gdpr/i,     name: 'Compliance & Audit', type: 'compliance' },
      { pattern: /export|import|csv|json/i,    name: 'Data Export/Import', type: 'data' },
      { pattern: /chat|messaging|inbox/i,      name: 'Messaging',         type: 'comm' },
      { pattern: /pricing|plan|tier/i,         name: 'Tiered Pricing',    type: 'billing' },
      { pattern: /docs|documentation|guide/i,  name: 'Documentation',     type: 'support' },
    ];

    const allText = text + headings.join(' ').toLowerCase();
    const seen = new Set();

    for (const sig of featureSignals) {
      if (sig.pattern.test(allText) && !seen.has(sig.name)) {
        seen.add(sig.name);
        features.push({ name: sig.name, type: sig.type, confidence: 'inferred' });
      }
    }

    // Also extract h2/h3 as feature hints
    for (const h of [...snapshot.headings.h2, ...snapshot.headings.h3].slice(0, 20)) {
      if (h.length > 5 && h.length < 60 && !seen.has(h)) {
        seen.add(h);
        features.push({ name: h, type: 'content', confidence: 'direct' });
      }
    }

    return features.slice(0, 30);
  }

  // ── Infer user flows ──────────────────────────────────────
  function inferUserFlows(snapshot, features) {
    const flows = [];
    const text  = snapshot.text.toLowerCase();

    const flowPatterns = [
      { trigger: /sign.?up|register|get started|create account/i,
        flow: ['Landing page', 'Sign up form', 'Email verification', 'Onboarding', 'Dashboard'] },
      { trigger: /sign.?in|log.?in/i,
        flow: ['Login page', 'Credential input', 'Authentication', 'Dashboard redirect'] },
      { trigger: /payment|checkout|subscribe/i,
        flow: ['Pricing page', 'Plan selection', 'Payment form', 'Confirmation', 'Access granted'] },
      { trigger: /upload|import/i,
        flow: ['Select data source', 'Upload/import', 'Processing', 'Review output'] },
      { trigger: /search/i,
        flow: ['Search input', 'Results list', 'Item detail', 'Action'] },
      { trigger: /onboard/i,
        flow: ['Welcome screen', 'Profile setup', 'Configuration', 'Feature tour', 'First action'] }
    ];

    for (const fp of flowPatterns) {
      if (fp.trigger.test(text)) {
        flows.push({ name: fp.trigger.source.replace(/[\/\\^$*+?.()|[\]{}]/g,'').replace(/\|/g,' / ').slice(0,30), steps: fp.flow });
      }
    }

    return flows;
  }

  // ── Infer UI components ───────────────────────────────────
  function inferComponents(snapshot) {
    const components = [];
    const text = snapshot.text.toLowerCase();

    const compSignals = [
      { pattern: /nav|menu|header/i,         name: 'Navigation Bar' },
      { pattern: /hero|banner/i,             name: 'Hero Section' },
      { pattern: /card|tile/i,               name: 'Card Components' },
      { pattern: /modal|dialog|popup/i,      name: 'Modal/Dialog' },
      { pattern: /table|grid|list/i,         name: 'Data Table/Grid' },
      { pattern: /form|input|field/i,        name: 'Form Components' },
      { pattern: /chart|graph|visuali/i,     name: 'Charts/Visualisations' },
      { pattern: /sidebar|drawer/i,          name: 'Sidebar/Drawer' },
      { pattern: /footer/i,                  name: 'Footer' },
      { pattern: /toast|snackbar|notif/i,    name: 'Notification Toast' },
      { pattern: /dropdown|select/i,         name: 'Dropdown/Select' },
      { pattern: /tab|switch/i,              name: 'Tabs/Switches' },
      { pattern: /badge|tag|chip/i,          name: 'Badges/Tags' },
      { pattern: /avatar|profile/i,          name: 'Avatar/Profile' },
      { pattern: /progress|loader|spinner/i, name: 'Progress/Loader' },
    ];

    const allText = text + (snapshot.navigation || []).join(' ').toLowerCase();
    for (const sig of compSignals) {
      if (sig.pattern.test(allText)) {
        components.push({ name: sig.name, source: 'inferred' });
      }
    }

    if (snapshot.forms?.length > 0) {
      components.push({ name: `${snapshot.forms.length} Form(s) detected`, source: 'direct' });
    }

    return components;
  }

  // ── Infer data entities ───────────────────────────────────
  function inferDataEntities(snapshot, features) {
    const entities = [];
    const seen     = new Set(['users','sessions']);

    // Always include base entities
    entities.push({ name: 'users',    fields: ['id','email','name','created_at','role'] });
    entities.push({ name: 'sessions', fields: ['id','user_id','token','created_at','expires_at'] });

    const text = snapshot.text.toLowerCase();

    const entitySignals = [
      { pattern: /project|workspace/i,    name: 'projects',      fields: ['id','name','user_id','status','created_at'] },
      { pattern: /team|member|collaborat/i,name: 'team_members', fields: ['id','team_id','user_id','role'] },
      { pattern: /task|todo|issue|ticket/i,name: 'tasks',        fields: ['id','title','status','assignee_id','due_date'] },
      { pattern: /payment|billing|invoice/i,name:'payments',     fields: ['id','user_id','amount','status','created_at'] },
      { pattern: /subscription|plan/i,    name: 'subscriptions', fields: ['id','user_id','plan','status','renews_at'] },
      { pattern: /report|analytics/i,     name: 'analytics_events',fields:['id','user_id','event','properties','timestamp'] },
      { pattern: /file|upload|media/i,    name: 'files',         fields: ['id','user_id','filename','url','size','type'] },
      { pattern: /notification|alert/i,   name: 'notifications', fields: ['id','user_id','type','message','read','created_at'] },
      { pattern: /comment|feedback/i,     name: 'comments',      fields: ['id','user_id','resource_id','body','created_at'] },
      { pattern: /product|item|listing/i, name: 'products',      fields: ['id','name','price','description','status'] },
      { pattern: /order|purchase/i,       name: 'orders',        fields: ['id','user_id','total','status','created_at'] },
      { pattern: /document|page|post|content/i, name: 'documents', fields: ['id','title','body','author_id','published_at'] },
      { pattern: /audit|log/i,            name: 'audit_logs',    fields: ['id','user_id','action','resource','timestamp'] },
      { pattern: /api.?key|token/i,       name: 'api_keys',      fields: ['id','user_id','key_hash','name','created_at'] },
    ];

    for (const sig of entitySignals) {
      if (sig.pattern.test(text) && !seen.has(sig.name)) {
        seen.add(sig.name);
        entities.push({ name: sig.name, fields: sig.fields, source: 'inferred' });
      }
    }

    return entities;
  }

  // ── Infer product category ────────────────────────────────
  function inferCategory(snapshot) {
    const text = snapshot.text.toLowerCase();
    const cats = [
      { pattern: /payment|fintech|financial|banking|money/i,  cat: 'Fintech / Payments' },
      { pattern: /devtool|developer|sdk|api|github|code/i,    cat: 'Developer Tools' },
      { pattern: /saas|software.as.a.service/i,               cat: 'SaaS Platform' },
      { pattern: /e-?commerce|shop|store|product|checkout/i,  cat: 'E-Commerce' },
      { pattern: /health|medical|clinic|patient|wellness/i,   cat: 'HealthTech' },
      { pattern: /education|learn|course|school|student/i,    cat: 'EdTech' },
      { pattern: /hr|human resource|recruitment|talent/i,     cat: 'HR Tech' },
      { pattern: /marketing|campaign|email|seo|ad/i,          cat: 'MarTech' },
      { pattern: /analytics|data|insight|report|bi\b/i,       cat: 'Analytics / BI' },
      { pattern: /crm|customer|sales|lead/i,                  cat: 'CRM / Sales' },
      { pattern: /logistics|fleet|delivery|shipping/i,        cat: 'Logistics Tech' },
      { pattern: /ai|machine learning|llm|gpt/i,              cat: 'AI / ML Platform' },
      { pattern: /social|community|network|feed/i,            cat: 'Social / Community' },
    ];
    for (const c of cats) {
      if (c.pattern.test(text)) return c.cat;
    }
    return 'General SaaS / Web Platform';
  }

  function dedupeStrings(arr) {
    return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
  }

  return { buildModel };
})();

window.SiteModelEngine = SiteModelEngine;
