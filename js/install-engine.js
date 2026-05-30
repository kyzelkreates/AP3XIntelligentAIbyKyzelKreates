// ============================================================
// AP3X — INSTALL ENGINE
// One-touch install: Android, iOS, Desktop (Windows/Mac/Linux)
// Handles PWA install prompt, iOS guide, and persistent storage setup
// ============================================================

const InstallEngine = (() => {

  let _deferredPrompt = null;
  let _installed      = false;

  // ── Platform detection ────────────────────────────────────
  function platform() {
    const ua  = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !/android/.test(ua);
    const android = /android/.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
    const mac     = /macintosh/.test(ua) && !ios;
    const windows = /windows/.test(ua);
    const linux   = /linux/.test(ua) && !android;
    return { ios, android, mac, windows, linux, desktop: mac||windows||linux, standalone };
  }

  // ── Storage init — request persistent storage ─────────────
  async function initPersistentStorage() {
    const results = {};

    // 1. Request persistent localStorage (navigator.storage.persist)
    if (navigator.storage && navigator.storage.persist) {
      try {
        const granted = await navigator.storage.persist();
        results.persistent = granted;
      } catch (e) {
        results.persistent = false;
      }
    }

    // 2. Check storage estimate
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        results.quota = Math.round((est.quota || 0) / 1024 / 1024);
        results.used  = Math.round((est.usage  || 0) / 1024 / 1024);
      } catch (e) { /* skip */ }
    }

    // 3. Open IndexedDB for structured data
    results.indexedDB = await _openIndexedDB();

    return results;
  }

  async function _openIndexedDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) { resolve(false); return; }
      try {
        const req = indexedDB.open('AP3X_IDB', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          // Create object stores mirroring SSOT collections
          const stores = [
            'ingestion_jobs','site_snapshots','site_models',
            'project_specs','system_blueprints','ui_blueprints','investor_packs',
            'ap3x_projects','graph_nodes','graph_edges'
          ];
          for (const name of stores) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: 'id', autoIncrement: false });
            }
          }
        };
        req.onsuccess = () => { req.result.close(); resolve(true); };
        req.onerror   = () => resolve(false);
      } catch { resolve(false); }
    });
  }

  // ── Capture install prompt (must be called early) ─────────
  function captureInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _deferredPrompt = e;
      _showInstallFAB();
    });

    window.addEventListener('appinstalled', () => {
      _installed = true;
      _deferredPrompt = null;
      _hideInstallUI();
      _showInstalledToast();
    });

    // Also show FAB for iOS if not standalone
    const p = platform();
    if (p.ios && !p.standalone) {
      setTimeout(_showInstallFAB, 1500);
    }
  }

  // ── Trigger install ───────────────────────────────────────
  async function triggerInstall() {
    const p = platform();

    if (p.standalone) {
      _showToast('AP3X is already installed ✓', 'success');
      return;
    }

    if (_deferredPrompt) {
      // Android / Desktop Chrome/Edge — native prompt
      _deferredPrompt.prompt();
      const choice = await _deferredPrompt.userChoice;
      _deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        _showInstalledToast();
      }
      return;
    }

    if (p.ios) {
      _showIOSGuide();
      return;
    }

    // Desktop fallback — show instructions
    _showDesktopGuide(p);
  }

  // ── Show install FAB ──────────────────────────────────────
  function _showInstallFAB() {
    const p = platform();
    if (p.standalone) return;

    let fab = document.getElementById('ap3x-install-fab');
    if (!fab) {
      fab = document.createElement('div');
      fab.id        = 'ap3x-install-fab';
      fab.innerHTML = `
        <button class="install-fab-btn" onclick="InstallEngine.triggerInstall()">
          <span class="install-fab-icon">⊕</span>
          <span class="install-fab-text">INSTALL AP3X</span>
        </button>`;
      document.body.appendChild(fab);
    }
    fab.classList.remove('hidden');
  }

  function _hideInstallUI() {
    document.getElementById('ap3x-install-fab')?.remove();
    document.getElementById('ap3x-ios-guide')?.remove();
    document.getElementById('ap3x-desktop-guide')?.remove();
  }

  // ── iOS Install Guide ─────────────────────────────────────
  function _showIOSGuide() {
    let el = document.getElementById('ap3x-ios-guide');
    if (el) { el.classList.toggle('hidden'); return; }

    el = document.createElement('div');
    el.id = 'ap3x-ios-guide';
    el.innerHTML = `
      <div class="install-overlay">
        <div class="install-modal">
          <div class="install-modal-header">
            <span class="install-modal-icon">⊕</span>
            <span class="install-modal-title">INSTALL AP3X</span>
            <button class="install-modal-close" onclick="document.getElementById('ap3x-ios-guide').classList.add('hidden')">✕</button>
          </div>
          <div class="install-modal-sub">Add to Home Screen for instant offline access</div>

          <div class="install-steps">
            <div class="install-step">
              <div class="step-num">1</div>
              <div class="step-body">
                <div class="step-title">Tap the Share button</div>
                <div class="step-desc">The <strong>⎙</strong> icon at the bottom of Safari</div>
              </div>
            </div>
            <div class="install-step">
              <div class="step-num">2</div>
              <div class="step-body">
                <div class="step-title">Tap "Add to Home Screen"</div>
                <div class="step-desc">Scroll down in the share sheet to find it</div>
              </div>
            </div>
            <div class="install-step">
              <div class="step-num">3</div>
              <div class="step-body">
                <div class="step-title">Tap "Add"</div>
                <div class="step-desc">AP3X launches as a full-screen app with your icon</div>
              </div>
            </div>
          </div>

          <div class="install-features">
            <div class="install-feature">◈ Runs fully offline</div>
            <div class="install-feature">◈ All data stored locally on device</div>
            <div class="install-feature">◈ Full-screen experience</div>
            <div class="install-feature">◈ Home screen icon</div>
          </div>

          <div class="install-arrow-indicator">▼ Tap Share button below ▼</div>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  // ── Desktop Guide ─────────────────────────────────────────
  function _showDesktopGuide(p) {
    let el = document.getElementById('ap3x-desktop-guide');
    if (el) { el.classList.toggle('hidden'); return; }

    const instructions = p.mac
      ? 'Click the install icon (⊕) in the address bar, or go to Chrome menu → "Install AP3X Intelligent AI"'
      : p.windows
      ? 'Click the install icon in the address bar, or press the ⊕ icon in Chrome/Edge toolbar'
      : 'Click the install icon in the browser address bar to install as a desktop app';

    el = document.createElement('div');
    el.id = 'ap3x-desktop-guide';
    el.innerHTML = `
      <div class="install-overlay">
        <div class="install-modal">
          <div class="install-modal-header">
            <span class="install-modal-icon">⊕</span>
            <span class="install-modal-title">INSTALL AP3X</span>
            <button class="install-modal-close" onclick="document.getElementById('ap3x-desktop-guide').classList.add('hidden')">✕</button>
          </div>
          <div class="install-modal-sub">Install as a desktop app</div>

          <div class="install-steps">
            <div class="install-step">
              <div class="step-num">→</div>
              <div class="step-body">
                <div class="step-title">${instructions}</div>
                <div class="step-desc">Or use the INSTALL AP3X button that appears in your browser toolbar</div>
              </div>
            </div>
          </div>

          <div class="install-features">
            <div class="install-feature">◈ Runs fully offline — no internet required</div>
            <div class="install-feature">◈ All data stored in local IndexedDB + localStorage</div>
            <div class="install-feature">◈ Desktop shortcut icon</div>
            <div class="install-feature">◈ No login, no cloud dependency</div>
          </div>

          <button class="install-modal-btn" onclick="document.getElementById('ap3x-desktop-guide').classList.add('hidden')">GOT IT</button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  // ── Toast ─────────────────────────────────────────────────
  function _showInstalledToast() {
    _showToast('AP3X installed successfully ✓ — find it on your home screen or desktop', 'success');
  }

  function _showToast(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `ap3x-toast ap3x-toast-${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 50);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 4000);
  }

  // ── Storage status for Settings panel ────────────────────
  async function getStorageStatus() {
    const status = { localStorage: false, indexedDB: false, persistent: false, quotaMB: 0, usedMB: 0 };
    try {
      localStorage.setItem('__ap3x_test', '1');
      localStorage.removeItem('__ap3x_test');
      status.localStorage = true;
    } catch { /* blocked */ }

    if (window.indexedDB) status.indexedDB = true;

    if (navigator.storage) {
      if (navigator.storage.persisted) status.persistent = await navigator.storage.persisted();
      if (navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        status.quotaMB = Math.round((est.quota || 0) / 1024 / 1024);
        status.usedMB  = Math.round((est.usage  || 0) / 1024 / 1024);
      }
    }
    return status;
  }

  // ── Init ──────────────────────────────────────────────────
  async function init() {
    captureInstallPrompt();
    await initPersistentStorage();
  }

  return {
    init,
    triggerInstall,
    getStorageStatus,
    platform,
    initPersistentStorage,
    captureInstallPrompt
  };
})();

window.InstallEngine = InstallEngine;
