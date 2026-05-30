// ============================================================
// AP3X VER5E — SECURESCAN AI VIEW CONTROLLER v1.0
// UI for Local-First Security Audit Module
// SSOT: AP3X_Storage (storage.js)
// ============================================================

const SecureScanView = (() => {

  let activeReportId = null;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    renderHistory();
    renderStats();
  }

  // ── Stats bar ─────────────────────────────────────────────
  function renderStats() {
    const history = SecureScanEngine.getHistory();
    const el = document.getElementById('ss-stats');
    if (!el) return;
    const total  = history.length;
    const highs  = history.filter(h => h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL').length;
    const avgScr = total > 0 ? Math.round(history.reduce((a, h) => a + h.score, 0) / total) : 0;

    el.innerHTML =
      '<div class="ss-stat"><div class="ss-stat-val">' + total + '</div><div class="ss-stat-lbl">SCANS</div></div>' +
      '<div class="ss-stat"><div class="ss-stat-val risk-high">' + highs + '</div><div class="ss-stat-lbl">HIGH RISK</div></div>' +
      '<div class="ss-stat"><div class="ss-stat-val">' + (total > 0 ? avgScr : '—') + '</div><div class="ss-stat-lbl">AVG SCORE</div></div>';
  }

  // ── Scan submit ───────────────────────────────────────────
  async function submitScan() {
    const inputEl  = document.getElementById('ss-url-input');
    const logEl    = document.getElementById('ss-log');
    const url      = (inputEl && inputEl.value || '').trim();

    if (!url) { showLog('[ERROR] No URL entered', 'error'); return; }

    clearLog();
    clearReportPanel();
    showLog('[ INIT ] Starting SecureScan AI for: ' + url, 'info');
    setProgress(5);

    const btnEl = document.getElementById('ss-scan-btn');
    if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'SCANNING…'; }

    const result = await SecureScanEngine.scan(url, function(msg, pct) {
      showLog(msg, msg.includes('ERROR') || msg.includes('FAIL') ? 'error' : 'progress');
      if (pct) setProgress(pct);
    });

    if (btnEl) { btnEl.disabled = false; btnEl.textContent = 'RUN SCAN'; }
    setProgress(100);

    if (!result.success) {
      showLog('\n[ ✗ SCAN FAILED ] ' + result.error, 'error');
      return;
    }

    showLog('\n[ ✓ SCAN COMPLETE ] ' + result.report.totalFindings + ' findings — loading report…', 'success');
    activeReportId = result.report.scanId;
    renderHistory();
    renderStats();
    renderReport(result.report);
  }

  // ── History panel ─────────────────────────────────────────
  function renderHistory() {
    const el = document.getElementById('ss-history');
    if (!el) return;
    const history = SecureScanEngine.getHistory();

    if (history.length === 0) {
      el.innerHTML = '<div class="ss-empty">[ NO SCANS — SUBMIT A URL ABOVE ]</div>';
      return;
    }

    el.innerHTML = history.map(function(h) {
      const domain = _domain(h.url);
      const cls    = h.riskLevel === 'HIGH' || h.riskLevel === 'CRITICAL' ? 'risk-high' :
                     h.riskLevel === 'MEDIUM' ? 'risk-med' : 'risk-low';
      return '<div class="ss-hist-item ' + (h.scanId === activeReportId ? 'active' : '') + '" onclick="SecureScanView.loadScan(\'' + h.scanId + '\')">' +
        '<div class="ssh-top">' +
          '<span class="ssh-domain">' + domain + '</span>' +
          '<span class="ssh-score ' + cls + '">' + h.score + '</span>' +
        '</div>' +
        '<div class="ssh-meta">' +
          '<span class="ssh-risk ' + cls + '">' + h.riskLevel + '</span>' +
          '<span class="ssh-date">' + _reltime(h.scannedAt) + '</span>' +
          '<span class="ssh-counts">' +
            (h.highCount > 0   ? '<span class="cnt-h">H:' + h.highCount + '</span>' : '') +
            (h.mediumCount > 0 ? '<span class="cnt-m">M:' + h.mediumCount + '</span>' : '') +
            (h.lowCount > 0    ? '<span class="cnt-l">L:' + h.lowCount + '</span>' : '') +
          '</span>' +
        '</div>' +
        '<button class="ss-del-btn" onclick="SecureScanView.deleteScan(event,\'' + h.scanId + '\')">✕</button>' +
        '</div>';
    }).join('');
  }

  // ── Load from history ─────────────────────────────────────
  function loadScan(scanId) {
    const report = SecureScanEngine.getReport(scanId);
    if (!report) return;
    activeReportId = scanId;
    renderHistory();
    renderReport(report);
  }

  // ── Delete scan ───────────────────────────────────────────
  function deleteScan(event, scanId) {
    event.stopPropagation();
    if (!confirm('Delete this scan and all associated data?')) return;
    SecureScanEngine.deleteReport(scanId);
    if (activeReportId === scanId) {
      activeReportId = null;
      clearReportPanel();
    }
    renderHistory();
    renderStats();
  }

  // ── Render full report ────────────────────────────────────
  function renderReport(report) {
    const panel = document.getElementById('ss-report-panel');
    const ph    = document.getElementById('ss-report-placeholder');
    if (!panel) return;
    if (ph) ph.classList.add('hidden');
    panel.classList.remove('hidden');

    const sc  = report.scoreResult;
    const fr  = report.fetchResult;

    panel.innerHTML =
      // ── Header ──────────────────────────────────────────
      '<div class="ss-report-header">' +
        '<div class="ssrh-left">' +
          '<div class="ssrh-url">' + _escHtml(report.url) + '</div>' +
          '<div class="ssrh-meta">' +
            _badge(sc.riskLevel) +
            '<span class="ssrh-date">Scanned: ' + new Date(report.scannedAt).toLocaleString() + '</span>' +
            (fr.httpStatus ? '<span class="ssrh-status">HTTP ' + fr.httpStatus + '</span>' : '') +
            (fr.corsBlocked ? '<span class="ssrh-cors">CORS BLOCKED</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="ssrh-score-ring ' + _riskClass(sc.riskLevel) + '">' +
          '<div class="ssrh-score-val">' + sc.score + '</div>' +
          '<div class="ssrh-score-lbl">/ 100</div>' +
        '</div>' +
      '</div>' +

      // ── Score breakdown ──────────────────────────────────
      '<div class="ss-score-bar">' +
        '<div class="ssbar-fill" style="width:' + sc.score + '%;background:' + sc.riskColour + '"></div>' +
      '</div>' +

      // ── Finding counts ───────────────────────────────────
      '<div class="ss-count-row">' +
        '<div class="ss-count-card risk-high"><div class="scc-val">' + sc.counts.HIGH   + '</div><div class="scc-lbl">HIGH</div></div>' +
        '<div class="ss-count-card risk-med"><div class="scc-val">' + sc.counts.MEDIUM + '</div><div class="scc-lbl">MEDIUM</div></div>' +
        '<div class="ss-count-card risk-low"><div class="scc-val">' + sc.counts.LOW    + '</div><div class="scc-lbl">LOW</div></div>' +
        '<div class="ss-count-card"><div class="scc-val">' + report.totalFindings + '</div><div class="scc-lbl">TOTAL</div></div>' +
      '</div>' +

      // ── Headers observed ─────────────────────────────────
      _renderHeadersSection(fr.visibleHeaders || {}) +

      // ── Findings ─────────────────────────────────────────
      '<div class="ss-section-title">[ SECURITY FINDINGS ]</div>' +
      (report.findings.length === 0
        ? '<div class="ss-clean">✓ No issues detected — excellent security posture</div>'
        : report.findings.map(function(f) { return _renderFinding(f); }).join('')) +

      // ── Patch summary ────────────────────────────────────
      _renderPatchSummary(report.patchSummary) +

      // ── Export ───────────────────────────────────────────
      '<div class="ss-export-row">' +
        '<button class="ss-export-btn" onclick="SecureScanView.exportReport(\'' + report.scanId + '\')">EXPORT REPORT (JSON)</button>' +
        '<button class="ss-export-btn" onclick="SecureScanView.exportText(\'' + report.scanId + '\')">EXPORT REPORT (TEXT)</button>' +
      '</div>';
  }

  function _renderHeadersSection(headers) {
    const REQUIRED = [
      'content-security-policy','x-content-type-options','x-frame-options',
      'strict-transport-security','referrer-policy','permissions-policy'
    ];
    var rows = REQUIRED.map(function(h) {
      var val     = headers[h];
      var present = !!val;
      return '<div class="hdr-row">' +
        '<span class="hdr-name">' + h + '</span>' +
        '<span class="hdr-status ' + (present ? 'hdr-ok' : 'hdr-miss') + '">' + (present ? '✓ PRESENT' : '✗ MISSING') + '</span>' +
        (val ? '<span class="hdr-val">' + _escHtml(val.slice(0, 80)) + (val.length > 80 ? '…' : '') + '</span>' : '') +
        '</div>';
    }).join('');
    return '<div class="ss-section-title">[ SECURITY HEADERS ]</div><div class="hdr-grid">' + rows + '</div>';
  }

  function _renderFinding(f) {
    var sevClass = f.severity === 'HIGH' ? 'sev-high' : f.severity === 'MEDIUM' ? 'sev-med' : 'sev-low';
    var snippetHtml = f.snippet
      ? '<div class="finding-snippet"><div class="fs-label">SECURE CODE / FIX:</div><pre class="fs-code">' + _escHtml(f.snippet) + '</pre></div>'
      : '';
    return '<div class="finding-card ' + sevClass + '">' +
      '<div class="fc-top">' +
        '<span class="fc-id">' + f.id + '</span>' +
        '<span class="fc-sev ' + sevClass + '">' + f.severity + '</span>' +
        '<span class="fc-cat">' + f.category + '</span>' +
      '</div>' +
      '<div class="fc-title">' + _escHtml(f.title) + '</div>' +
      '<div class="fc-detail">' + _escHtml(f.detail) + '</div>' +
      '<div class="fc-risk"><span class="fc-risk-lbl">RISK:</span> ' + _escHtml(f.risk) + '</div>' +
      '<div class="fc-fix"><span class="fc-fix-lbl">FIX:</span> ' + _escHtml(f.fix) + '</div>' +
      snippetHtml +
      '</div>';
  }

  function _renderPatchSummary(patches) {
    if (!patches || (!patches.critical.length && !patches.medium.length)) return '';
    return '<div class="ss-section-title">[ PATCH PRIORITY QUEUE ]</div>' +
      '<div class="patch-queue">' +
      patches.critical.slice(0, 5).map(function(p, i) {
        return '<div class="patch-row priority-critical">' +
          '<span class="patch-num">' + (i + 1) + '</span>' +
          '<span class="patch-sev">HIGH</span>' +
          '<span class="patch-title">' + _escHtml(p.title) + '</span>' +
        '</div>';
      }).join('') +
      patches.medium.slice(0, 5).map(function(p, i) {
        return '<div class="patch-row priority-medium">' +
          '<span class="patch-num">' + (patches.critical.length + i + 1) + '</span>' +
          '<span class="patch-sev">MED</span>' +
          '<span class="patch-title">' + _escHtml(p.title) + '</span>' +
        '</div>';
      }).join('') +
      '</div>';
  }

  // ── Export ────────────────────────────────────────────────
  function exportReport(scanId) {
    const report = SecureScanEngine.getReport(scanId);
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    _downloadBlob(blob, 'securescan-' + _domain(report.url) + '-' + _dateStr() + '.json');
  }

  function exportText(scanId) {
    const report = SecureScanEngine.getReport(scanId);
    if (!report) return;
    const sc  = report.scoreResult;
    var lines = [
      '================================================================',
      'AP3X SECURESCAN AI — SECURITY AUDIT REPORT',
      'Generated: ' + new Date().toLocaleString(),
      '================================================================',
      '',
      'URL:          ' + report.url,
      'Scanned:      ' + new Date(report.scannedAt).toLocaleString(),
      'Risk Level:   ' + sc.riskLevel,
      'Score:        ' + sc.score + ' / 100',
      'Total Findings: ' + report.totalFindings,
      '  HIGH:   ' + sc.counts.HIGH,
      '  MEDIUM: ' + sc.counts.MEDIUM,
      '  LOW:    ' + sc.counts.LOW,
      '',
      '================================================================',
      'SECURITY HEADERS',
      '================================================================'
    ];
    var REQUIRED_HEADERS = ['content-security-policy','x-content-type-options','x-frame-options','strict-transport-security','referrer-policy','permissions-policy'];
    for (var h of REQUIRED_HEADERS) {
      var val = (report.fetchResult.visibleHeaders || {})[h];
      lines.push((val ? '✓ ' : '✗ ') + h + (val ? ': ' + val.slice(0,80) : ' — MISSING'));
    }
    lines.push('', '================================================================', 'FINDINGS', '================================================================');
    for (var f of report.findings) {
      lines.push('', '[' + f.severity + '] ' + f.id + ' — ' + f.title, 'Category: ' + f.category, 'Detail:   ' + f.detail, 'Risk:     ' + f.risk, 'Fix:      ' + f.fix);
      if (f.snippet) lines.push('Snippet:', f.snippet);
      lines.push('---');
    }
    lines.push('', '================================================================', 'Generated by AP3X VER5E SecureScan AI — Defensive Security Only', '================================================================');
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    _downloadBlob(blob, 'securescan-' + _domain(report.url) + '-' + _dateStr() + '.txt');
  }

  function _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Helpers ───────────────────────────────────────────────
  function showLog(msg, type) {
    const el = document.getElementById('ss-log');
    if (!el) return;
    const line = document.createElement('div');
    line.className = 'log-line log-' + (type || 'info');
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function clearLog() {
    const el = document.getElementById('ss-log');
    if (el) el.innerHTML = '';
  }

  function setProgress(pct) {
    const el = document.getElementById('ss-progress-fill');
    if (el) el.style.width = Math.min(100, pct) + '%';
    const bar = document.getElementById('ss-progress-bar');
    if (bar) bar.style.display = pct > 0 && pct < 100 ? 'block' : 'none';
  }

  function clearReportPanel() {
    const panel = document.getElementById('ss-report-panel');
    const ph    = document.getElementById('ss-report-placeholder');
    if (panel) { panel.innerHTML = ''; panel.classList.add('hidden'); }
    if (ph)    ph.classList.remove('hidden');
  }

  function _domain(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }

  function _reltime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000)    return 'just now';
    if (diff < 3600000)  return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    return Math.floor(diff/86400000) + 'd ago';
  }

  function _dateStr() {
    return new Date().toISOString().slice(0,10);
  }

  function _escHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _badge(level) {
    var cls = level === 'HIGH' || level === 'CRITICAL' ? 'risk-high' : level === 'MEDIUM' ? 'risk-med' : 'risk-low';
    return '<span class="risk-badge ' + cls + '">' + level + '</span>';
  }

  function _riskClass(level) {
    return level === 'HIGH' || level === 'CRITICAL' ? 'ring-high' : level === 'MEDIUM' ? 'ring-med' : 'ring-low';
  }

  function clearAllScans() {
    if (!confirm('Clear ALL scan history? This cannot be undone.')) return;
    SecureScanEngine.clearAllScans();
    activeReportId = null;
    clearReportPanel();
    renderHistory();
    renderStats();
  }

  return { init, submitScan, loadScan, deleteScan, exportReport, exportText, clearAllScans };
})();

window.SecureScanView = SecureScanView;
