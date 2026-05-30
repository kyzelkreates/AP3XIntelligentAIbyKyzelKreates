// ============================================================
// AP3X VER5E — PROJECT AI ENGINE v1.0
// Upload text → AI learns → answers questions → anticipates
// Local-first NLP. No external API. No backend.
// SSOT: AP3X_Storage (storage.js)
// ============================================================

const ProjectAI = (() => {

  // ══════════════════════════════════════════════════════════
  // KNOWLEDGE BASE — learns from uploaded text + projects
  // ══════════════════════════════════════════════════════════

  function learnFromText(title, text, projectId) {
    if (!text || text.trim().length < 10) return { success: false, error: 'Text too short' };

    const knowledge = _buildKnowledge(title, text, projectId);
    _saveKnowledge(knowledge);

    return {
      success:     true,
      knowledge,
      factCount:   knowledge.facts.length,
      entityCount: knowledge.entities.length,
      qaPairsGenerated: knowledge.qaSeed.length
    };
  }

  function _buildKnowledge(title, text, projectId) {
    const id        = 'kb_' + Date.now() + '_' + Math.random().toString(36).substr(2,4);
    const sentences = _splitSentences(text);
    const facts     = _extractFacts(sentences);
    const entities  = _extractEntities(text);
    const tags      = _extractTags(text);
    const topics    = _classifyTopics(text);
    const qaSeed    = _generateQAPairs(title, facts, entities, topics, text);

    return {
      id,
      title:      title || 'Untitled Knowledge',
      raw:        text,
      projectId:  projectId || null,
      learnedAt:  new Date().toISOString(),
      wordCount:  text.split(/\s+/).length,
      sentences:  sentences.length,
      facts,
      entities,
      tags,
      topics,
      qaSeed,
      searchIndex:_buildSearchIndex(facts, entities, tags, text)
    };
  }

  function _splitSentences(text) {
    return text.split(/(?<=[.!?])\s+|[\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 800);
  }

  function _extractFacts(sentences) {
    return sentences.map((s, i) => {
      const type  = _classifySentence(s);
      const keywords = _extractKeywords(s);
      return { id: i, text: s, type, keywords, weight: _weightSentence(s) };
    }).sort((a, b) => b.weight - a.weight);
  }

  function _classifySentence(s) {
    const l = s.toLowerCase();
    if (/is a |is an |are a |defined as|means |refers to/i.test(l))  return 'definition';
    if (/can |enables?|allows?|provides?|delivers?|lets you/i.test(l)) return 'capability';
    if (/built with|built using|uses |powered by|based on/i.test(l))  return 'technical';
    if (/revenue|pricing|cost|pay|charge|subscription/i.test(l))      return 'business';
    if (/user|customer|client|target|audience/i.test(l))              return 'audience';
    if (/problem|issue|challenge|pain|struggle/i.test(l))             return 'problem';
    if (/solution|solve|fix|address|resolve/i.test(l))                return 'solution';
    if (/feature|functionality|capability|module/i.test(l))           return 'feature';
    if (/architecture|stack|structure|design/i.test(l))               return 'architecture';
    if (/grant|fund|invest|raise|capital/i.test(l))                   return 'funding';
    if (/plan|roadmap|next|future|goal/i.test(l))                     return 'roadmap';
    return 'general';
  }

  function _weightSentence(s) {
    let w = 1;
    if (s.length > 80)  w += 1;
    if (/\d/.test(s))   w += 1;  // contains numbers — likely factual
    if (/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/.test(s)) w += 1; // proper nouns
    if (/definition|capability|technical|business|audience/.test(_classifySentence(s))) w += 2;
    return w;
  }

  function _extractKeywords(s) {
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','has','have','had','do','does','did','will','would','could','should','may','might','can','this','that','these','those','it','its','as','into','through','about','between','then','than','so','if','when','where','how','what','which','who','its','our','their','your','my','we','they','he','she','i','you','all','any','some','each','every']);
    return s.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)).slice(0, 8);
  }

  function _extractEntities(text) {
    const entities = [];
    const seen     = new Set();

    // Proper nouns (capitalised multi-word phrases)
    const properRe = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,4})\b/g;
    let m;
    while ((m = properRe.exec(text)) !== null) {
      const val = m[1].trim();
      if (!seen.has(val.toLowerCase()) && val.split(' ').length <= 4) {
        seen.add(val.toLowerCase());
        entities.push({ value: val, type: 'proper_noun', confidence: 0.8 });
      }
    }

    // Tech terms
    const techRe = /\b((?:React|Vue|Angular|Next\.js|Node\.js|Python|TypeScript|JavaScript|PostgreSQL|MongoDB|Firebase|Supabase|Stripe|OpenAI|GPT|Claude|Vercel|Netlify|Docker|AWS|GCP|Azure|Deno|Redis|GraphQL|REST|API|SDK|PWA|SSOT)[^\s,;.]*)/gi;
    while ((m = techRe.exec(text)) !== null) {
      const val = m[1].trim();
      if (!seen.has(val.toLowerCase())) {
        seen.add(val.toLowerCase());
        entities.push({ value: val, type: 'technology', confidence: 0.95 });
      }
    }

    // Metrics (numbers with context)
    const metricRe = /\b(\d[\d,]*(?:\.\d+)?(?:\s*(?:%|users?|customers?|projects?|million|thousand|K|M|B|£|\$|months?|years?|days?)))\b/gi;
    while ((m = metricRe.exec(text)) !== null) {
      const val = m[1].trim();
      if (!seen.has(val.toLowerCase())) {
        seen.add(val.toLowerCase());
        entities.push({ value: val, type: 'metric', confidence: 0.9 });
      }
    }

    return entities.slice(0, 50);
  }

  function _extractTags(text) {
    const lower = text.toLowerCase();
    const tags  = new Set();
    const tagPatterns = [
      'ai', 'machine learning', 'pwa', 'offline', 'local-first', 'open source',
      'saas', 'api', 'dashboard', 'analytics', 'mobile', 'react', 'node',
      'typescript', 'python', 'blockchain', 'security', 'fintech', 'edtech',
      'healthtech', 'b2b', 'b2c', 'enterprise', 'startup', 'mvp', 'demo',
      'production', 'beta', 'grant', 'funding', 'investor', 'revenue',
      'subscription', 'freemium', 'marketplace', 'realtime', 'websocket',
      'modular', 'ssot', 'graph', 'knowledge', 'intelligence', 'automation'
    ];
    for (const tag of tagPatterns) {
      if (lower.includes(tag)) tags.add(tag);
    }
    return [...tags].slice(0, 15);
  }

  function _classifyTopics(text) {
    const lower   = text.toLowerCase();
    const topics  = [];
    const topicMap = {
      'Product Description':   /product|platform|tool|system|app|service/i,
      'Technical Architecture': /architecture|stack|built|framework|engine|module|database/i,
      'Business Model':        /revenue|pricing|subscription|monetis|business.?model/i,
      'Market & Audience':     /market|audience|user|customer|target|segment/i,
      'Funding & Investment':  /fund|invest|grant|raise|capital|pitch/i,
      'Features & Capabilities': /feature|function|capability|enable|allow|provide/i,
      'Problem & Solution':    /problem|solve|issue|challenge|pain|solution/i,
      'Team & Background':     /team|founder|built.by|created|kyzel|developer/i,
      'Roadmap & Vision':      /roadmap|plan|next|future|goal|milestone|vision/i,
      'Security':              /security|privacy|secure|protect|encrypt|auth/i
    };
    for (const [topic, re] of Object.entries(topicMap)) {
      if (re.test(lower)) topics.push(topic);
    }
    return topics;
  }

  function _buildSearchIndex(facts, entities, tags, text) {
    const index = {};
    for (const fact of facts) {
      for (const kw of fact.keywords) {
        if (!index[kw]) index[kw] = [];
        index[kw].push(fact.id);
      }
    }
    return index;
  }

  // ══════════════════════════════════════════════════════════
  // Q&A PAIR GENERATION — from text + context
  // ══════════════════════════════════════════════════════════
  function _generateQAPairs(title, facts, entities, topics, rawText) {
    const pairs = [];
    const titleLower = (title || '').toLowerCase();

    // Definition questions
    const defFacts = facts.filter(f => f.type === 'definition').slice(0, 3);
    for (const f of defFacts) {
      pairs.push({ q: 'What is this about?', a: f.text, confidence: 0.9, type: 'definition' });
      pairs.push({ q: 'Describe ' + title, a: f.text, confidence: 0.85, type: 'definition' });
    }

    // Capability questions
    const capFacts = facts.filter(f => f.type === 'capability').slice(0, 4);
    for (const f of capFacts) {
      pairs.push({ q: 'What can ' + title + ' do?', a: f.text, confidence: 0.85, type: 'capability' });
      pairs.push({ q: 'What features does it have?', a: f.text, confidence: 0.8, type: 'capability' });
    }

    // Problem / solution
    const probFacts = facts.filter(f => f.type === 'problem').slice(0, 2);
    const solFacts  = facts.filter(f => f.type === 'solution').slice(0, 2);
    if (probFacts.length) pairs.push({ q: 'What problem does this solve?', a: probFacts[0].text, confidence: 0.9, type: 'problem' });
    if (solFacts.length)  pairs.push({ q: 'How does it solve the problem?', a: solFacts[0].text, confidence: 0.9, type: 'solution' });

    // Technical
    const techFacts = facts.filter(f => f.type === 'technical').slice(0, 3);
    if (techFacts.length) pairs.push({ q: 'How is this built?', a: techFacts.map(f => f.text).join(' '), confidence: 0.85, type: 'technical' });

    // Business
    const bizFacts = facts.filter(f => f.type === 'business').slice(0, 2);
    if (bizFacts.length) pairs.push({ q: 'What is the business model?', a: bizFacts[0].text, confidence: 0.9, type: 'business' });

    // Audience
    const audFacts = facts.filter(f => f.type === 'audience').slice(0, 2);
    if (audFacts.length) pairs.push({ q: 'Who is this for?', a: audFacts[0].text, confidence: 0.9, type: 'audience' });

    // Funding
    const fundFacts = facts.filter(f => f.type === 'funding').slice(0, 2);
    if (fundFacts.length) pairs.push({ q: 'What is the funding or investment situation?', a: fundFacts[0].text, confidence: 0.85, type: 'funding' });

    // Roadmap
    const roadFacts = facts.filter(f => f.type === 'roadmap').slice(0, 2);
    if (roadFacts.length) pairs.push({ q: 'What are the future plans?', a: roadFacts[0].text, confidence: 0.85, type: 'roadmap' });

    // Topic-level summary Q
    if (topics.includes('Technical Architecture')) {
      const techText = facts.filter(f => f.type === 'technical').map(f => f.text).join(' ');
      if (techText) pairs.push({ q: 'Explain the technical architecture', a: techText, confidence: 0.8, type: 'technical' });
    }

    // Entity-level questions
    const techEntities = entities.filter(e => e.type === 'technology').slice(0, 3);
    if (techEntities.length) {
      pairs.push({ q: 'What technologies are used?', a: techEntities.map(e => e.value).join(', '), confidence: 0.9, type: 'technical' });
    }

    return pairs.slice(0, 30);
  }

  // ══════════════════════════════════════════════════════════
  // ANSWER ENGINE — matches questions to knowledge
  // ══════════════════════════════════════════════════════════
  function ask(question, projectId) {
    if (!question || question.trim().length < 2) {
      return { answer: "Please ask a question about your projects.", source: 'system', confidence: 0, followUps: [] };
    }

    const db      = AP3X_Storage.getDB();
    const qLower  = question.toLowerCase().trim();

    // 1. Check Q&A pairs from all knowledge (optionally scoped to project)
    const allKnowledge = db.project_ai_knowledge || [];
    const scoped = projectId
      ? allKnowledge.filter(k => k.projectId === projectId || !k.projectId)
      : allKnowledge;

    // 2. Check intelligence packs (structured data)
    const allPacks = db.project_intelligence_packs || [];
    const projects = db.domains.ap3x.projects || [];

    // Try exact Q&A match first
    const qaMatch = _searchQAPairs(qLower, scoped);
    if (qaMatch && qaMatch.confidence > 0.5) {
      return {
        answer:     qaMatch.answer,
        source:     'learned knowledge: ' + (qaMatch.source || 'uploaded text'),
        confidence: qaMatch.confidence,
        followUps:  _generateFollowUps(question, qaMatch, scoped, allPacks, projects)
      };
    }

    // Try intelligence packs
    const packMatch = _searchPacks(qLower, allPacks, projectId);
    if (packMatch && packMatch.confidence > 0.3) {
      return {
        answer:     packMatch.answer,
        source:     'project intelligence: ' + packMatch.source,
        confidence: packMatch.confidence,
        followUps:  _generateFollowUps(question, packMatch, scoped, allPacks, projects)
      };
    }

    // Try free-text search across facts
    const factMatch = _searchFacts(qLower, scoped);
    if (factMatch && factMatch.confidence > 0.2) {
      return {
        answer:     factMatch.answer,
        source:     'knowledge base: ' + (factMatch.source || 'uploaded text'),
        confidence: factMatch.confidence,
        followUps:  _generateFollowUps(question, factMatch, scoped, allPacks, projects)
      };
    }

    // Try project records directly
    const projMatch = _searchProjects(qLower, projects, allPacks);
    if (projMatch) {
      return {
        answer:     projMatch.answer,
        source:     'project record: ' + projMatch.source,
        confidence: projMatch.confidence,
        followUps:  _generateFollowUps(question, projMatch, scoped, allPacks, projects)
      };
    }

    // Fallback
    return {
      answer:     _buildFallbackAnswer(question, scoped, allPacks, projects),
      source:     'inference',
      confidence: 0.2,
      followUps:  _buildDefaultFollowUps(allPacks, projects)
    };
  }

  function _searchQAPairs(qLower, knowledge) {
    let best = null;
    let bestScore = 0;

    for (const kb of knowledge) {
      for (const pair of (kb.qaSeed || [])) {
        const score = _similarity(qLower, pair.q.toLowerCase());
        if (score > bestScore) {
          bestScore = score;
          best = { answer: pair.a, confidence: score * pair.confidence, source: kb.title };
        }
      }
    }
    return best;
  }

  function _searchFacts(qLower, knowledge) {
    const qWords = qLower.split(/\W+/).filter(w => w.length > 2);
    let best = null;
    let bestScore = 0;

    for (const kb of knowledge) {
      for (const fact of (kb.facts || [])) {
        const factLower = fact.text.toLowerCase();
        let score = 0;
        for (const w of qWords) {
          if (factLower.includes(w)) score += 1;
        }
        score = score / Math.max(qWords.length, 1);
        if (score > bestScore && score > 0.3) {
          bestScore = score;
          best = { answer: fact.text, confidence: score * 0.8, source: kb.title };
        }
      }
    }
    return best;
  }

  function _searchPacks(qLower, packs, projectId) {
    const scoped = projectId ? packs.filter(p => p.projectId === projectId) : packs;

    // Intent mapping
    const intents = [
      { patterns: ['what is','describe','tell me about','explain'],     type: 'definition' },
      { patterns: ['investor','pitch','fund','invest','raise'],          type: 'investor' },
      { patterns: ['grant','funding programme','ukri','innovate'],       type: 'grant' },
      { patterns: ['how built','tech stack','architecture','technology'],type: 'tech' },
      { patterns: ['business model','revenue','pricing','monetis'],      type: 'business' },
      { patterns: ['who is it for','target','audience','user'],          type: 'audience' },
      { patterns: ['problem','pain','challenge','issue'],               type: 'problem' },
      { patterns: ['feature','capability','what can','does it do'],      type: 'feature' },
      { patterns: ['roadmap','plan','next','future'],                    type: 'roadmap' },
      { patterns: ['status','progress','stage','current'],              type: 'status' },
      { patterns: ['entity','entities','component','module'],            type: 'entity' },
      { patterns: ['unique','different','better','advantage'],           type: 'differentiator' },
      { patterns: ['market','competitor','competition'],                 type: 'market' }
    ];

    const matchedIntent = intents.find(intent => intent.patterns.some(p => qLower.includes(p)));

    for (const pack of scoped) {
      if (!matchedIntent) break;
      const answer = _extractFromPack(pack, matchedIntent.type, qLower);
      if (answer) return { answer, confidence: 0.75, source: pack.projectName };
    }

    // If multiple projects — aggregate
    if (scoped.length > 1 && (/how many|all projects|list.*project|overview/i.test(qLower))) {
      const summary = scoped.map(p => '• ' + p.projectName + ' — ' + (p.executive?.stage || 'active')).join('\n');
      return { answer: 'Your projects:\n' + summary, confidence: 0.8, source: 'all projects' };
    }

    return null;
  }

  function _extractFromPack(pack, intentType, qLower) {
    const e = pack.executive || {};
    const i = pack.investorPack || {};
    const b = pack.buildStructure || {};
    const g = pack.grantIntelligence || {};
    const m = pack.marketPosition || {};
    const pa = pack.productAnalysis || {};

    switch (intentType) {
      case 'definition':    return e.oneLiner || '';
      case 'investor':      return i.elevatorPitch || i.fullPitchScript || '';
      case 'grant':         return (g.grantTypes || []).slice(0,4).map(gt => '• ' + gt.name + ' [' + gt.fit + '] — ' + gt.notes).join('\n') || '';
      case 'tech':          return _techSummaryFromPack(b) || '';
      case 'business':      return (i.businessModel && i.businessModel.hypothesis) || '';
      case 'audience':      return e.targetAudience || '';
      case 'problem':       return e.problemSolved || i.problemStatement || '';
      case 'feature':       return (pa.featureSet || []).map(f => '• ' + f.name).join('\n') || '';
      case 'roadmap':       return (i.roadmap && ('Current: ' + i.roadmap.current + '\nNext: ' + i.roadmap.next3months + '\n12m: ' + i.roadmap.next12months)) || '';
      case 'status':        return e.currentStatus || e.stage || '';
      case 'entity':        return (pack.entityMap && pack.entityMap.searchable && pack.entityMap.searchable.slice(0,8).join(', ')) || '';
      case 'differentiator':return (pa.differentiators || []).join(' · ') || e.uniqueValue || '';
      case 'market':        return m.positioning + ' · Competitors: ' + (m.competitors || []).join(', ') || '';
      default:              return '';
    }
  }

  function _techSummaryFromPack(b) {
    if (!b || !b.techStack) return '';
    const s = b.techStack;
    const parts = [];
    if (s.frontend && s.frontend.length) parts.push('Frontend: ' + s.frontend.join(', '));
    if (s.backend  && s.backend.length)  parts.push('Backend: '  + s.backend.join(', '));
    if (s.database && s.database.length) parts.push('DB: '       + s.database.join(', '));
    if (s.ai       && s.ai.length)       parts.push('AI: '       + s.ai.join(', '));
    if (b.architecture) parts.push('Architecture: ' + b.architecture);
    return parts.join(' · ');
  }

  function _searchProjects(qLower, projects, packs) {
    // Look for project name mentions
    for (const proj of projects) {
      if (qLower.includes(proj.name.toLowerCase())) {
        const pack = packs.find(p => p.projectId === proj.id);
        if (pack) {
          return { answer: pack.executive.oneLiner + '\n\nStage: ' + pack.executive.stage + '\nTech: ' + _techSummaryFromPack(pack.buildStructure), confidence: 0.7, source: proj.name };
        }
        return { answer: proj.description || proj.name + ' — no detailed description available.', confidence: 0.5, source: proj.name };
      }
    }

    // Generic project listing
    if (/projects?|portfolio|what.*built|what.*made/i.test(qLower) && projects.length > 0) {
      const list = projects.slice(0, 8).map(p => '• ' + p.name + ' — ' + (p.description || '').slice(0, 80)).join('\n');
      return { answer: 'Your ' + projects.length + ' indexed project(s):\n\n' + list, confidence: 0.65, source: 'project index' };
    }

    return null;
  }

  function _buildFallbackAnswer(question, knowledge, packs, projects) {
    if (knowledge.length === 0 && packs.length === 0) {
      return 'I don\'t have enough information to answer that yet. Upload a project description using the "LEARN" tab, or add more detail to your project records. Then I\'ll be able to answer questions about it.';
    }
    const names = projects.slice(0,3).map(p => p.name).join(', ');
    return 'I couldn\'t find a specific answer to "' + question + '" in my knowledge base. I have information about: ' + (names || 'your projects') + '. Try rephrasing, or upload more project details using the LEARN tab.';
  }

  // ══════════════════════════════════════════════════════════
  // FOLLOW-UP ANTICIPATION ENGINE
  // Predicts what the person will ask next
  // ══════════════════════════════════════════════════════════
  function _generateFollowUps(question, match, knowledge, packs, projects) {
    const qLower   = question.toLowerCase();
    const followUps = [];

    // Intent-based follow-ups
    if (/what is|describe|tell me/i.test(qLower)) {
      followUps.push('What problem does it solve?', 'Who is the target audience?', 'How is it built?');
    } else if (/problem|pain|challenge/i.test(qLower)) {
      followUps.push('How does it solve the problem?', 'Who has this problem?', 'What makes this solution unique?');
    } else if (/built|tech|architecture|stack/i.test(qLower)) {
      followUps.push('Is it offline capable?', 'How does it scale?', 'What APIs does it use?');
    } else if (/investor|pitch|fund/i.test(qLower)) {
      followUps.push('What grants might this qualify for?', 'What is the business model?', 'What traction does it have?');
    } else if (/grant|funding/i.test(qLower)) {
      followUps.push('What is the investor pitch?', 'What stage is it at?', 'What is the business model?');
    } else if (/business model|revenue|pricing/i.test(qLower)) {
      followUps.push('Who is the target audience?', 'What is the competitive advantage?', 'What is the go-to-market strategy?');
    } else if (/feature|capability|do/i.test(qLower)) {
      followUps.push('What makes this unique?', 'How was it built?', 'What is the roadmap?');
    } else if (/unique|different|advantage/i.test(qLower)) {
      followUps.push('Who are the competitors?', 'What is the business model?', 'Is there traction?');
    } else if (/market|compet/i.test(qLower)) {
      followUps.push('What is the go-to-market strategy?', 'Who is the target buyer?', 'What is the pricing model?');
    } else if (/status|stage|progress/i.test(qLower)) {
      followUps.push('What is next on the roadmap?', 'What traction exists?', 'What is needed to reach the next stage?');
    } else {
      followUps.push('Tell me more about the technical architecture', 'What grants might this qualify for?', 'What is the investor pitch?');
    }

    // Contextual additions based on available data
    if (packs.length > 1) followUps.push('Compare all my projects');
    if (knowledge.length > 0) followUps.push('What else have you learned about this?');
    if (projects.some(p => /demo/i.test(p.description || ''))) followUps.push('Which projects have working demos?');

    return [...new Set(followUps)].slice(0, 4);
  }

  function _buildDefaultFollowUps(packs, projects) {
    const ups = ['What projects do I have?', 'Which is most investor-ready?'];
    if (packs.length > 0) ups.push('What grants could I apply for?', 'Give me a pitch for my best project');
    return ups.slice(0, 4);
  }

  // ══════════════════════════════════════════════════════════
  // SIMILARITY — lightweight string matching
  // ══════════════════════════════════════════════════════════
  function _similarity(a, b) {
    const aWords = new Set(a.split(/\W+/).filter(w => w.length > 2));
    const bWords = new Set(b.split(/\W+/).filter(w => w.length > 2));
    if (aWords.size === 0 || bWords.size === 0) return 0;
    let overlap = 0;
    for (const w of aWords) { if (bWords.has(w)) overlap++; }
    return overlap / Math.max(aWords.size, bWords.size);
  }

  // ══════════════════════════════════════════════════════════
  // SSOT — save / load knowledge
  // ══════════════════════════════════════════════════════════
  function _saveKnowledge(knowledge) {
    const db = AP3X_Storage.getDB();
    if (!Array.isArray(db.project_ai_knowledge)) db.project_ai_knowledge = [];
    // Deduplicate by title + projectId
    const idx = db.project_ai_knowledge.findIndex(k => k.title === knowledge.title && k.projectId === knowledge.projectId);
    if (idx >= 0) db.project_ai_knowledge[idx] = knowledge;
    else          db.project_ai_knowledge.push(knowledge);
    if (db.project_ai_knowledge.length > 100) db.project_ai_knowledge = db.project_ai_knowledge.slice(-100);
    AP3X_Storage.saveDB(db);
  }

  function getAllKnowledge() {
    const db = AP3X_Storage.getDB();
    return (db.project_ai_knowledge || []).slice().reverse();
  }

  function deleteKnowledge(id) {
    const db = AP3X_Storage.getDB();
    db.project_ai_knowledge = (db.project_ai_knowledge || []).filter(k => k.id !== id);
    AP3X_Storage.saveDB(db);
  }

  function getConversationHistory() {
    const db = AP3X_Storage.getDB();
    return db.project_ai_conversation || [];
  }

  function saveMessage(role, content, meta) {
    const db = AP3X_Storage.getDB();
    if (!Array.isArray(db.project_ai_conversation)) db.project_ai_conversation = [];
    db.project_ai_conversation.push({ role, content, meta: meta || {}, timestamp: new Date().toISOString() });
    if (db.project_ai_conversation.length > 200) db.project_ai_conversation = db.project_ai_conversation.slice(-200);
    AP3X_Storage.saveDB(db);
  }

  function clearConversation() {
    const db = AP3X_Storage.getDB();
    db.project_ai_conversation = [];
    AP3X_Storage.saveDB(db);
  }

  // ══════════════════════════════════════════════════════════
  // AUTO-LEARN FROM ALL PROJECTS ON INIT
  // ══════════════════════════════════════════════════════════
  function autoLearnFromProjects() {
    const db       = AP3X_Storage.getDB();
    const projects = db.domains.ap3x.projects || [];
    let learned    = 0;
    for (const proj of projects) {
      const text = [proj.name, proj.description, proj.architecture, (proj.tags || []).join(' '), (proj.meta?.notes || '')].filter(Boolean).join('\n');
      if (text.length > 50) {
        const result = learnFromText(proj.name, text, proj.id);
        if (result.success) learned++;
      }
    }
    return learned;
  }

  return {
    learnFromText,
    ask,
    autoLearnFromProjects,
    getAllKnowledge,
    deleteKnowledge,
    getConversationHistory,
    saveMessage,
    clearConversation
  };
})();

window.ProjectAI = ProjectAI;
