// ============================================================
// AP3X INTELLIGENT AI — EXPLANATION ENGINE
// 3-mode structured intelligence output
// ============================================================

const ExplanationEngine = (() => {

  // ── SIMPLE MODE ──────────────────────────────────────────
  function explainSimple(item) {
    const name = item.name || item.summary?.split('.')[0] || 'This system';
    const desc = item.description || item.summary || item.raw || '';
    const tags  = (item.tags || []).slice(0, 4).join(', ');
    const ents  = (item.entities || []).slice(0, 3).map(e => typeof e === 'string' ? e : e.value).join(', ');

    return {
      mode:   'SIMPLE',
      title:  name,
      output: [
        { label: 'WHAT IT IS',    value: desc || 'An AP3X intelligence system component.' },
        { label: 'KEY COMPONENTS',value: ents || 'Core modules and processing units.' },
        { label: 'WHAT IT DOES',  value: `Processes and manages ${tags || 'intelligence workflows'} within the AP3X ecosystem.` },
        { label: 'WHO USES IT',   value: 'Operators and administrators of the AP3X platform.' },
        { label: 'KEY BENEFIT',   value: 'Simplifies complex data management into structured, actionable intelligence.' }
      ]
    };
  }

  // ── TECHNICAL MODE ───────────────────────────────────────
  function explainTechnical(item) {
    const name  = item.name || 'System Component';
    const arch  = item.architecture || item.raw || item.description || '';
    const tags  = (item.tags || []).join(', ');
    const ents  = (item.entities || []).map(e => typeof e === 'string' ? e : e.value);
    const type  = item.meta?.type || item.type || 'functional';
    const id    = item.id || 'N/A';

    const modules = ents.filter(e => /engine|system|os|module|api|core/i.test(e));
    const data    = ents.filter(e => /data|record|entity|node|graph/i.test(e));
    const actors  = ents.filter(e => !modules.includes(e) && !data.includes(e));

    return {
      mode:   'TECHNICAL',
      title:  name,
      output: [
        { label: 'COMPONENT ID',       value: id },
        { label: 'ARCHITECTURE TYPE',  value: type.toUpperCase() },
        { label: 'MODULES DETECTED',   value: modules.length > 0 ? modules.join(' → ') : 'Core processing unit' },
        { label: 'DATA ENTITIES',      value: data.length > 0 ? data.join(', ') : 'Structured records' },
        { label: 'ACTORS / INTERFACES',value: actors.length > 0 ? actors.join(', ') : 'Internal API surfaces' },
        { label: 'DATA FLOW',          value: arch ? arch.slice(0, 200) + (arch.length > 200 ? '...' : '') : 'Input → Classification → Storage → Graph Update' },
        { label: 'INDEX TAGS',         value: tags || 'N/A' },
        { label: 'INTEGRATION POINTS', value: 'AP3X Storage Engine, Knowledge Graph, Relationship Indexer' }
      ]
    };
  }

  // ── INVESTOR MODE ────────────────────────────────────────
  function explainInvestor(item) {
    const name    = item.name || 'AP3X Component';
    const desc    = item.description || item.summary || item.raw || '';
    const tags    = (item.tags || []).slice(0, 5).join(', ');
    const ents    = (item.entities || []).slice(0, 5).map(e => typeof e === 'string' ? e : e.value).join(', ');

    const verticals = _detectVerticals(item);

    return {
      mode:   'INVESTOR',
      title:  name,
      output: [
        { label: 'VALUE PROPOSITION',  value: `${name} delivers automated intelligence processing — reducing manual overhead and accelerating decision velocity across the AP3X ecosystem.` },
        { label: 'MARKET OPPORTUNITY', value: `Applicable across ${verticals}. Local-first architecture eliminates recurring SaaS costs and data sovereignty risks.` },
        { label: 'CORE CAPABILITY',    value: desc ? desc.slice(0, 180) : 'Automated knowledge structuring and relationship mapping.' },
        { label: 'KEY ENTITIES',       value: ents || 'Proprietary system components' },
        { label: 'SCALABILITY',        value: 'Fully client-side. Zero server cost. Scales to any user device. No infrastructure dependencies.' },
        { label: 'COMPETITIVE EDGE',   value: 'Offline-first PWA with local intelligence graph — operates where cloud solutions cannot.' },
        { label: 'CROSS-INDUSTRY USE', value: `${tags || 'intelligence, automation, data'} — applicable in logistics, healthcare, fintech, and education sectors.` },
        { label: 'IP LAYER',           value: 'AP3X Base Structure: proprietary knowledge ingestion and relationship engine by Kyzel Kreates.' }
      ]
    };
  }

  function _detectVerticals(item) {
    const text = JSON.stringify(item).toLowerCase();
    const v = [];
    if (/fleet|vehicle|logistic|transport/.test(text))  v.push('logistics & fleet management');
    if (/education|learn|train|school/.test(text))      v.push('education technology');
    if (/health|medical|wellness|fitness/.test(text))   v.push('healthcare');
    if (/finance|revenue|invest|market/.test(text))     v.push('financial services');
    if (v.length === 0) v.push('enterprise intelligence', 'knowledge management');
    return v.join(', ');
  }

  // ── Public: generate explanation ─────────────────────────
  function generateExplanation(item, mode = 'simple') {
    switch (mode.toLowerCase()) {
      case 'simple':   return explainSimple(item);
      case 'technical':return explainTechnical(item);
      case 'investor': return explainInvestor(item);
      default:         return explainSimple(item);
    }
  }

  return { generateExplanation, explainSimple, explainTechnical, explainInvestor };
})();

window.ExplanationEngine = ExplanationEngine;
