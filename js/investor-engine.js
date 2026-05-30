// ============================================================
// AP3X — MODULE 5: INVESTOR INTELLIGENCE ENGINE
// Generates full investor-ready analysis pack
// STRICT: No assumptions outside inferred signals
// ============================================================

const InvestorEngine = (() => {

  function compile(snapshot, siteModel, projectSpec, jobId) {
    return {
      jobId,
      version:    1,
      compiledAt: new Date().toISOString(),
      url:        snapshot.url,
      productName:siteModel.productName,

      // A. Executive Summary
      executiveSummary: _executiveSummary(snapshot, siteModel, projectSpec),

      // B. Problem & Solution
      problemSolution: _problemSolution(snapshot, siteModel, projectSpec),

      // C. Product Maturity
      productMaturity: _productMaturity(snapshot, siteModel),

      // D. Market Signal Inference
      marketSignals: _marketSignals(snapshot, siteModel),

      // E. Business Model Inference
      businessModel: _businessModel(snapshot, siteModel),

      // F. POC & Scalability
      scalabilitySignals: _scalabilitySignals(snapshot, siteModel),

      // G. Investor Pitch
      investorPitch: _investorPitch(snapshot, siteModel, projectSpec),

      // Meta
      disclaimer: 'All values are inferred from public page signals only. Revenue, user counts, and financial metrics are not claimed unless explicitly stated in source content.',
      inferenceScore: _computeInferenceScore(snapshot, siteModel)
    };
  }

  // ── A. Executive Summary ──────────────────────────────────
  function _executiveSummary(snapshot, siteModel, projectSpec) {
    const name    = siteModel.productName;
    const cat     = siteModel.category;
    const desc    = projectSpec.whatItDoes || '';
    const users   = (projectSpec.targetUsers || []).slice(0,2).join(' and ');
    const topFeat = (projectSpec.coreFeatures || []).slice(0,3).map(f=>f.name).join(', ');

    return {
      oneLiner: `${name} is a ${cat} product that ${desc.slice(0,120)}`,
      valueProposition: `Delivers ${topFeat || 'core business functionality'} to ${users || 'business professionals'} with a streamlined, modern platform.`,
      whatMakesItValuable: _inferValueProp(snapshot, siteModel)
    };
  }

  function _inferValueProp(snapshot, siteModel) {
    const text  = snapshot.text.toLowerCase();
    const props = [];
    if (/no.?code|low.?code/i.test(text))    props.push('No-code or low-code accessibility');
    if (/api.first/i.test(text))             props.push('API-first architecture for developer extensibility');
    if (/open.?source/i.test(text))          props.push('Open-source model with community growth potential');
    if (/ai|machine learning|automation/i.test(text)) props.push('AI/automation-native capabilities');
    if (/enterprise/i.test(text))            props.push('Enterprise-grade feature set');
    if (/free.?tier|freemium/i.test(text))   props.push('Freemium acquisition funnel');
    if (props.length === 0)                  props.push('Focused solution for a defined market segment');
    return props.join(' · ');
  }

  // ── B. Problem & Solution ─────────────────────────────────
  function _problemSolution(snapshot, siteModel, projectSpec) {
    return {
      problem: projectSpec.problemItSolves,
      solution: _inferSolution(snapshot, siteModel),
      keyDifferentiators: _inferDifferentiators(snapshot, siteModel)
    };
  }

  function _inferSolution(snapshot, siteModel) {
    const features = siteModel.features.slice(0,4).map(f=>f.name).join(', ');
    return `${siteModel.productName} addresses this through: ${features}. The platform is delivered as a ${siteModel.category} with ${snapshot.pricingSignals?.length > 0 ? 'tiered pricing' : 'a structured offering'}.`;
  }

  function _inferDifferentiators(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const diffs = [];
    if (/ai|ml|intelligent/i.test(text))         diffs.push('AI-powered core functionality');
    if (/real.?time/i.test(text))                diffs.push('Real-time data processing');
    if (/no.?code|low.?code/i.test(text))        diffs.push('No-code accessibility');
    if (/open.source/i.test(text))               diffs.push('Open-source community model');
    if (/enterprise|compliance|gdpr/i.test(text))diffs.push('Enterprise compliance-ready');
    if (/mobile|ios|android/i.test(text))        diffs.push('Mobile-first or cross-platform');
    if (diffs.length === 0)
      diffs.push('Inferred differentiation requires direct competitor analysis');
    return diffs;
  }

  // ── C. Product Maturity ───────────────────────────────────
  function _productMaturity(snapshot, siteModel) {
    const features = siteModel.features.length;
    const hasAuth  = siteModel.features.some(f => f.type === 'auth');
    const hasBill  = siteModel.features.some(f => f.type === 'billing');
    const hasApi   = siteModel.features.some(f => f.type === 'api');
    const hasDash  = siteModel.features.some(f => /dashboard/i.test(f.name));
    const hasDoc   = siteModel.features.some(f => f.type === 'support');

    let score = 0;
    if (hasAuth)     score += 2;
    if (hasBill)     score += 2;
    if (hasApi)      score += 2;
    if (hasDash)     score += 1;
    if (hasDoc)      score += 1;
    if (features>8)  score += 2;
    if (snapshot.forms?.length > 1) score += 1;
    if (snapshot.pricingSignals?.length > 0) score += 2;

    const tier = score >= 10 ? 'Enterprise-Grade'
               : score >= 6  ? 'Growth Stage'
               : score >= 3  ? 'MVP+' : 'MVP';

    const complexity = score >= 10 ? 'High' : score >= 5 ? 'Medium' : 'Low';

    const complete = [];
    const missing  = [];

    if (hasAuth)  complete.push('Authentication'); else missing.push('Authentication system');
    if (hasBill)  complete.push('Payments/Billing'); else missing.push('Billing/subscription system');
    if (hasApi)   complete.push('API layer'); else missing.push('Public API');
    if (hasDash)  complete.push('Dashboard'); else missing.push('Analytics dashboard');
    if (hasDoc)   complete.push('Documentation'); else missing.push('Documentation/help centre');

    return { tier, complexityScore: score, complexity, complete, missing };
  }

  // ── D. Market Signal Inference ────────────────────────────
  function _marketSignals(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const category = siteModel.category;

    return {
      productCategory:     category,
      positioning:         _inferPositioning(snapshot, siteModel),
      likelyCompetitorCategory: _inferCompetitorCategory(category),
      buyerSegment:        _inferBuyerSegment(text),
      adoptionSignals:     _inferAdoptionSignals(snapshot)
    };
  }

  function _inferPositioning(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    if (/enterprise.*grade|compliance|soc.?2/i.test(text)) return 'Enterprise positioning';
    if (/startup|indie|small.?team|simple/i.test(text))    return 'SMB / startup-focused';
    if (/developer|api.?first|open.?source/i.test(text))   return 'Developer-led growth (PLG)';
    if (/self.?serve|sign.?up.?free/i.test(text))          return 'Self-serve PLG motion';
    return 'Mid-market / general business';
  }

  function _inferCompetitorCategory(category) {
    const map = {
      'Fintech / Payments':     'Stripe, Braintree, Adyen',
      'Developer Tools':        'GitHub, GitLab, Vercel, Netlify',
      'SaaS Platform':          'Notion, Monday.com, Airtable',
      'E-Commerce':             'Shopify, WooCommerce, BigCommerce',
      'HealthTech':             'Epic, Cerner, Veeva',
      'EdTech':                 'Coursera, Udemy, Canvas LMS',
      'HR Tech':                'Workday, BambooHR, Rippling',
      'MarTech':                'HubSpot, Marketo, Mailchimp',
      'Analytics / BI':         'Mixpanel, Amplitude, Tableau',
      'CRM / Sales':            'Salesforce, HubSpot CRM, Pipedrive',
      'Logistics Tech':         'Samsara, Locus, project44',
      'AI / ML Platform':       'OpenAI, Hugging Face, Replicate',
      'Social / Community':     'Discord, Discourse, Circle',
    };
    return map[category] || 'General SaaS competitors (requires deeper research)';
  }

  function _inferBuyerSegment(text) {
    if (/enterprise|ciso|procurement/i.test(text)) return 'Enterprise buyer (top-down)';
    if (/team|startup|small.?business/i.test(text))return 'SMB / team buyer';
    if (/individual|personal|solo/i.test(text))    return 'Individual / prosumer';
    if (/developer|engineer/i.test(text))          return 'Developer-led (bottom-up)';
    return 'Mixed buyer segment (inferred)';
  }

  function _inferAdoptionSignals(snapshot) {
    const signals = [];
    const text = snapshot.text.toLowerCase();
    if (/free.*trial|try.*free/i.test(text))    signals.push('Free trial offered');
    if (/freemium|free.?tier/i.test(text))      signals.push('Freemium tier available');
    if (/demo|book.*demo/i.test(text))          signals.push('Sales demo-driven motion');
    if (/open.?source/i.test(text))             signals.push('Open-source adoption path');
    if (/sign.?up.*free|get.?started.?free/i.test(text)) signals.push('Self-serve free signup');
    return signals.length > 0 ? signals : ['Adoption motion not clearly detected'];
  }

  // ── E. Business Model ─────────────────────────────────────
  function _businessModel(snapshot, siteModel) {
    const pricing = snapshot.pricingSignals || [];
    const text    = snapshot.text.toLowerCase();

    const models = [];
    if (/subscription|monthly|annual/i.test(text))  models.push('Subscription (SaaS)');
    if (/marketplace|transaction|fee/i.test(text))  models.push('Marketplace / Transaction fee');
    if (/freemium|free.*pro/i.test(text))           models.push('Freemium → Paid upgrade');
    if (/enterprise.*plan|custom.*pricing/i.test(text)) models.push('Enterprise / Custom pricing');
    if (/usage.?based|pay.as.you.go/i.test(text))   models.push('Usage-based pricing');
    if (/open.?source/i.test(text))                 models.push('Open-source + Paid cloud/support');
    if (models.length === 0)                        models.push('Business model not clearly inferred from page signals');

    return {
      models,
      pricingSignals:    pricing,
      hasPricingPage:    siteModel.pages.some(p => /pricing|plan/i.test(p.label)),
      revenueHypothesis: _buildRevenueHypothesis(text, pricing),
      disclaimer:        'INFERRED — not verified revenue data'
    };
  }

  function _buildRevenueHypothesis(text, pricing) {
    const hasSub = /subscription|monthly/i.test(text);
    const hasEnt = /enterprise|custom/i.test(text);
    const hasPrices = pricing.some(p => /\$|£/.test(p));

    if (hasEnt && hasSub)
      return '[INFERRED] Likely dual-motion: self-serve subscription + enterprise deals';
    if (hasSub && hasPrices)
      return '[INFERRED] Subscription SaaS with tiered monthly/annual pricing';
    if (hasEnt)
      return '[INFERRED] Enterprise-focused with custom contract pricing';
    return '[INFERRED] Revenue model requires direct investigation';
  }

  // ── F. POC & Scalability ──────────────────────────────────
  function _scalabilitySignals(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const api  = snapshot.apiSignals || [];

    const mvpEvidence = [];
    if (snapshot.forms?.length > 0)                     mvpEvidence.push('Forms/interactions present');
    if (siteModel.features.length > 3)                  mvpEvidence.push('Multiple features detected');
    if (siteModel.userFlows.length > 0)                 mvpEvidence.push('User flows inferred');
    if (snapshot.pricingSignals?.length > 0)            mvpEvidence.push('Pricing structure exists');
    if (siteModel.pages.length > 3)                     mvpEvidence.push('Multi-page product');

    const scalabilityIndicators = [];
    if (/(AWS|GCP|Azure)/i.test(api.join(' ')))         scalabilityIndicators.push('Cloud infrastructure signals');
    if (/cdn|edge|cloudfront/i.test(text))              scalabilityIndicators.push('CDN / edge delivery');
    if (/microservic|serverless/i.test(text))           scalabilityIndicators.push('Microservices / serverless architecture');
    if (/horizontal|auto.?scal/i.test(text))            scalabilityIndicators.push('Auto-scaling mentioned');
    if (/99\.9|sla|uptime/i.test(text))                 scalabilityIndicators.push('SLA / uptime guarantees');
    if (/api.rate.?limit|throttl/i.test(text))          scalabilityIndicators.push('API rate limiting (maturity signal)');
    if (scalabilityIndicators.length === 0)
      scalabilityIndicators.push('No explicit scalability signals detected — requires engineering assessment');

    const engMaturity = _inferEngMaturity(snapshot, siteModel);

    return { mvpEvidence, scalabilityIndicators, engineeringMaturity: engMaturity };
  }

  function _inferEngMaturity(snapshot, siteModel) {
    const api = snapshot.apiSignals || [];
    let score = 0;
    if (api.some(s=>/(REST|GraphQL)/i.test(s)))         score++;
    if (api.some(s=>/(JWT|OAuth)/i.test(s)))            score++;
    if (api.some(s=>/(AWS|GCP|Azure)/i.test(s)))        score++;
    if (/audit|logging/i.test(snapshot.text))           score++;
    if (/soc.?2|iso.?27001|compliance/i.test(snapshot.text)) score++;
    if (siteModel.features.length > 8)                  score++;

    if (score >= 5) return 'HIGH — Strong engineering maturity signals';
    if (score >= 3) return 'MEDIUM — Growing engineering sophistication';
    if (score >= 1) return 'LOW-MEDIUM — Early-stage engineering baseline';
    return 'UNDETERMINED — Insufficient signals';
  }

  // ── G. Investor Pitch ─────────────────────────────────────
  function _investorPitch(snapshot, siteModel, projectSpec) {
    const name    = siteModel.productName;
    const cat     = siteModel.category;
    const problem = projectSpec.problemItSolves;
    const topFeat = (projectSpec.coreFeatures || []).slice(0,3).map(f=>f.name).join(', ');
    const users   = (projectSpec.targetUsers  || []).slice(0,2).join(' and ');

    const pitch = `${name} is a ${cat} platform that ${problem.toLowerCase()}. It serves ${users || 'modern businesses'} by providing ${topFeat || 'core business capabilities'}. The product demonstrates ${_maturitySentence(snapshot, siteModel)} and is positioned in the ${cat} space with ${_competitorSentence(siteModel)}.`;

    return {
      sixtySecondPitch: pitch,
      whyItMatters:     _whyItMatters(snapshot, siteModel),
      whyItCouldScale:  _whyItCouldScale(snapshot, siteModel)
    };
  }

  function _maturitySentence(snapshot, siteModel) {
    const features = siteModel.features.length;
    if (features > 10) return 'strong feature completeness and clear product-market fit signals';
    if (features > 5)  return 'solid MVP+ foundations with growth-stage features';
    return 'early MVP characteristics with core functionality in place';
  }

  function _competitorSentence(siteModel) {
    const competitors = _inferCompetitorCategory(siteModel.category);
    return `established players including ${competitors}`;
  }

  function _whyItMatters(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const reasons = [];
    if (/ai|automation/i.test(text))         reasons.push('Leverages AI/automation — high relevance in current market');
    if (/enterprise/i.test(text))            reasons.push('Enterprise segment offers large contract value');
    if (/open.?source/i.test(text))          reasons.push('Open-source model enables fast community-led growth');
    if (/api.?first/i.test(text))            reasons.push('API-first enables platform/ecosystem network effects');
    if (reasons.length === 0)
      reasons.push(`Addresses a real workflow need in the ${siteModel.category} space`);
    return reasons.join('. ') + '.';
  }

  function _whyItCouldScale(snapshot, siteModel) {
    const text = snapshot.text.toLowerCase();
    const reasons = [];
    if (/api|integration/i.test(text))       reasons.push('Integration ecosystem creates stickiness');
    if (/team|multi.?user/i.test(text))      reasons.push('Team/multi-user model grows revenue per account');
    if (/enterprise/i.test(text))            reasons.push('Enterprise upsell path from self-serve base');
    if (/marketplace|partner/i.test(text))   reasons.push('Marketplace or partner channel for distribution');
    if (reasons.length === 0)
      reasons.push('Core product value supports organic growth if distribution is established');
    return reasons.join('. ') + '.';
  }

  // ── Inference Score ───────────────────────────────────────
  function _computeInferenceScore(snapshot, siteModel) {
    let score = 0;
    if (snapshot.text.length > 2000)         score += 20;
    if (snapshot.headings.h1.length > 0)     score += 10;
    if (snapshot.headings.h2.length > 3)     score += 10;
    if (snapshot.navigation.length > 3)      score += 10;
    if (snapshot.pricingSignals?.length > 0) score += 15;
    if (snapshot.apiSignals?.length > 0)     score += 10;
    if (siteModel.features.length > 5)       score += 15;
    if (snapshot.forms?.length > 0)          score += 10;
    return {
      score: Math.min(score, 100),
      label: score >= 80 ? 'HIGH CONFIDENCE'
           : score >= 50 ? 'MEDIUM CONFIDENCE'
           : 'LOW CONFIDENCE — Limited page signals'
    };
  }

  return { compile };
})();

window.InvestorEngine = InvestorEngine;
