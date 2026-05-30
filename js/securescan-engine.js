// ============================================================
// AP3X VER5E — SECURESCAN AI ENGINE v1.0
// Local-first security audit — browser-only, no backend
// DEFENSIVE ANALYSIS ONLY. No exploitation. No probing.
// SSOT: all results via AP3X_Storage (storage.js)
// ============================================================

const SecureScanEngine = (() => {

  const SCAN_VERSION  = '1.0';
  const MAX_SCAN_AGE  = 7 * 24 * 60 * 60 * 1000; // 7 days

  // ══════════════════════════════════════════════════════════
  // LAYER 1 — LOCAL INGESTION
  // Safe client-side fetch, no active probing
  // ══════════════════════════════════════════════════════════
  async function fetchTarget(url) {
    const start = Date.now();
    try {
      const resp = await fetch(url, {
        method:  'GET',
        headers: { 'Accept': 'text/html,*/*;q=0.8' },
        signal:  AbortSignal.timeout(15000),
        mode:    'cors'
      });
      const html      = await resp.text();
      const elapsed   = Date.now() - start;
      return {
        success:       true,
        html,
        httpStatus:    resp.status,
        contentType:   resp.headers.get('content-type') || '',
        contentLength: html.length,
        elapsed,
        // Headers we can observe (limited by CORS)
        visibleHeaders: _extractVisibleHeaders(resp.headers),
        fetchedAt:     new Date().toISOString()
      };
    } catch (err) {
      // CORS block or network error — still analyse the URL structure itself
      const elapsed = Date.now() - start;
      return {
        success:      false,
        html:         '',
        error:        err.message,
        corsBlocked:  err.message.includes('CORS') || err.message.includes('fetch'),
        elapsed,
        fetchedAt:    new Date().toISOString()
      };
    }
  }

  function _extractVisibleHeaders(headers) {
    const visible = {};
    const securityHeaders = [
      'content-security-policy','x-content-type-options','x-frame-options',
      'strict-transport-security','referrer-policy','permissions-policy',
      'x-xss-protection','cache-control','cross-origin-opener-policy',
      'cross-origin-embedder-policy','cross-origin-resource-policy'
    ];
    for (const h of securityHeaders) {
      const val = headers.get(h);
      if (val) visible[h] = val;
    }
    return visible;
  }

  // ══════════════════════════════════════════════════════════
  // LAYER 2 — LOCAL ANALYSIS ENGINE
  // All analysis runs in the browser on fetched HTML
  // ══════════════════════════════════════════════════════════
  function analyse(fetchResult, targetUrl) {
    const html    = fetchResult.html || '';
    const text    = html.toLowerCase();
    const headers = fetchResult.visibleHeaders || {};
    const url     = targetUrl || '';

    const findings = [];

    // ── A. URL Structure Analysis ─────────────────────────
    _checkUrlStructure(url, findings);

    // ── B. Security Header Analysis ───────────────────────
    _checkSecurityHeaders(headers, fetchResult, findings);

    // ── C. HTML/DOM Pattern Analysis ─────────────────────
    if (html) {
      _checkHTMLPatterns(html, text, findings);
      _checkFormSecurity(html, text, findings);
      _checkScriptPatterns(html, text, findings);
      _checkSensitiveDataExposure(html, text, findings);
      _checkStoragePatterns(html, text, findings);
      _checkPWAConfiguration(html, text, findings);
      _checkThirdPartyRisks(html, text, findings);
      _checkDeprecatedPatterns(html, text, findings);
    }

    // ── D. Protocol / Transport Analysis ─────────────────
    _checkTransportSecurity(url, fetchResult, findings);

    return findings;
  }

  // ── URL Structure ──────────────────────────────────────
  function _checkUrlStructure(url, findings) {
    try {
      const u = new URL(url);

      if (u.protocol === 'http:') {
        findings.push({
          id:       'URL-001',
          category: 'Transport Security',
          severity: 'HIGH',
          title:    'Insecure HTTP Protocol',
          detail:   'Site is served over HTTP, not HTTPS. All data is transmitted unencrypted.',
          risk:     'All traffic can be intercepted (man-in-the-middle). Credentials, session tokens, and sensitive data are exposed in plaintext.',
          fix:      'Enable HTTPS immediately. Obtain a free TLS certificate via Let\'s Encrypt. Set up HTTP→HTTPS redirect.',
          snippet:  '# Nginx redirect example\nserver {\n  listen 80;\n  return 301 https://$host$request_uri;\n}'
        });
      }

      if (/\.(php|asp|aspx|cfm|cgi)$/i.test(u.pathname)) {
        findings.push({
          id:       'URL-002',
          category: 'Technology Exposure',
          severity: 'LOW',
          title:    'Server Technology Disclosed via URL Extension',
          detail:   'URL extension reveals server-side technology (' + u.pathname.split('.').pop() + ').',
          risk:     'Attackers can target known vulnerabilities for this specific server technology.',
          fix:      'Use URL rewriting to remove technology-revealing extensions. Configure web server to serve clean URLs.'
        });
      }

      if (u.search && /(?:pass|password|token|secret|key|api_key|auth)/i.test(u.search)) {
        findings.push({
          id:       'URL-003',
          category: 'Data Exposure',
          severity: 'HIGH',
          title:    'Sensitive Data in URL Query String',
          detail:   'URL query parameters appear to contain sensitive values (passwords, tokens, keys).',
          risk:     'URLs are logged in browser history, server access logs, and proxies. Sensitive values are permanently exposed.',
          fix:      'Never transmit sensitive data in URL parameters. Use POST request bodies or HTTP headers instead.',
          snippet:  '// Instead of: /api/data?api_key=secret123\n// Use header: Authorization: Bearer <token>\nfetch(url, { headers: { \'Authorization\': \'Bearer \' + token } })'
        });
      }

      if (/\/(admin|administrator|wp-admin|phpmyadmin|cpanel|panel|backend|manager)/i.test(u.pathname)) {
        findings.push({
          id:       'URL-004',
          category: 'Access Control',
          severity: 'MEDIUM',
          title:    'Admin Interface at Predictable Path',
          detail:   'Administrative interface detected at a well-known URL path.',
          risk:     'Attackers routinely scan for default admin paths. Predictable paths increase attack surface.',
          fix:      'Move admin interfaces to non-standard paths. Restrict access by IP allowlist. Require MFA for all admin access.',
          snippet:  '# Nginx IP restriction\nlocation /admin {\n  allow 203.0.113.0/24;\n  deny all;\n}'
        });
      }

    } catch (e) { /* invalid URL — skip */ }
  }

  // ── Security Headers ───────────────────────────────────
  function _checkSecurityHeaders(headers, fetchResult, findings) {
    if (fetchResult.corsBlocked) {
      findings.push({
        id:       'HDR-000',
        category: 'Analysis Limitation',
        severity: 'LOW',
        title:    'Response Headers Not Observable (CORS)',
        detail:   'The server blocked this cross-origin request, so security response headers could not be read.',
        risk:     'Header security posture is unknown. May indicate missing CORS policy or strict security configuration.',
        fix:      'Use browser DevTools (Network tab) to inspect response headers directly, or use securityheaders.com.'
      });
      return;
    }

    if (!fetchResult.success) return;

    const headerChecks = [
      {
        header:   'content-security-policy',
        id:       'HDR-001',
        severity: 'HIGH',
        title:    'Missing Content-Security-Policy Header',
        detail:   'No CSP header detected. CSP is the primary defence against Cross-Site Scripting (XSS) attacks.',
        risk:     'Without CSP, malicious scripts injected into your site can execute with full browser permissions — stealing sessions, credentials, and data.',
        fix:      'Add a Content-Security-Policy response header. Start strict, then relax as needed.',
        snippet:  "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';"
      },
      {
        header:   'x-content-type-options',
        id:       'HDR-002',
        severity: 'MEDIUM',
        title:    'Missing X-Content-Type-Options Header',
        detail:   'No X-Content-Type-Options header. Browsers may MIME-sniff responses and execute unexpected content.',
        risk:     'Browsers may interpret non-executable content (e.g. images, text) as executable scripts if attacker-controlled content is served.',
        fix:      'Add the header with value "nosniff" to all responses.',
        snippet:  'X-Content-Type-Options: nosniff'
      },
      {
        header:   'x-frame-options',
        id:       'HDR-003',
        severity: 'MEDIUM',
        title:    'Missing X-Frame-Options Header',
        detail:   'No X-Frame-Options detected. Site may be embeddable in iframes on other domains.',
        risk:     'Clickjacking attacks: attackers embed your site invisibly and trick users into clicking UI elements, hijacking actions.',
        fix:      'Add X-Frame-Options or use CSP frame-ancestors directive.',
        snippet:  'X-Frame-Options: DENY\n# Or via CSP:\nContent-Security-Policy: frame-ancestors \'none\';'
      },
      {
        header:   'strict-transport-security',
        id:       'HDR-004',
        severity: 'HIGH',
        title:    'Missing Strict-Transport-Security (HSTS) Header',
        detail:   'No HSTS header. Browsers may attempt HTTP connections before being redirected to HTTPS.',
        risk:     'SSL stripping attacks can downgrade HTTPS connections to HTTP, exposing all traffic.',
        fix:      'Add HSTS header. Start with short max-age, then extend to 1 year after testing.',
        snippet:  'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'
      },
      {
        header:   'referrer-policy',
        id:       'HDR-005',
        severity: 'LOW',
        title:    'Missing Referrer-Policy Header',
        detail:   'No Referrer-Policy header. Full URLs may be leaked in HTTP Referer headers to third parties.',
        risk:     'Sensitive path information (e.g. /account/reset?token=...) may be sent to third-party analytics or CDN providers.',
        fix:      'Set a restrictive referrer policy.',
        snippet:  'Referrer-Policy: strict-origin-when-cross-origin'
      },
      {
        header:   'permissions-policy',
        id:       'HDR-006',
        severity: 'LOW',
        title:    'Missing Permissions-Policy Header',
        detail:   'No Permissions-Policy header. Browser features (camera, microphone, geolocation) are unrestricted.',
        risk:     'Third-party scripts or injected code could access device features without explicit permission.',
        fix:      'Define a Permissions-Policy restricting access to only required browser APIs.',
        snippet:  'Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)'
      }
    ];

    for (const check of headerChecks) {
      if (!headers[check.header]) {
        findings.push({
          id:       check.id,
          category: 'Security Headers',
          severity: check.severity,
          title:    check.title,
          detail:   check.detail,
          risk:     check.risk,
          fix:      check.fix,
          snippet:  check.snippet || null
        });
      } else if (check.header === 'content-security-policy') {
        // CSP present — check for unsafe values
        const csp = headers['content-security-policy'];
        if (/unsafe-inline|unsafe-eval/i.test(csp)) {
          findings.push({
            id:       'HDR-001b',
            category: 'Security Headers',
            severity: 'MEDIUM',
            title:    'Weak Content-Security-Policy (unsafe-inline / unsafe-eval)',
            detail:   'CSP header present but allows unsafe-inline or unsafe-eval, which largely defeats XSS protection.',
            risk:     'Inline scripts and eval() can still execute attacker-injected code despite CSP being enabled.',
            fix:      'Replace unsafe-inline with nonce-based or hash-based CSP. Avoid unsafe-eval; refactor code using eval().',
            snippet:  "// Nonce-based CSP (server generates unique nonce per request)\nContent-Security-Policy: script-src 'nonce-{SERVER_GENERATED_NONCE}' 'strict-dynamic';"
          });
        }
      }
    }
  }

  // ── HTML / DOM Patterns ────────────────────────────────
  function _checkHTMLPatterns(html, text, findings) {
    // Autocomplete on sensitive fields
    if (/type=["']password["'][^>]*(?!autocomplete=["']off)/i.test(html) &&
        !/<input[^>]*type=["']password["'][^>]*autocomplete=["'](?:off|new-password)/i.test(html)) {
      findings.push({
        id:       'HTML-001',
        category: 'Form Security',
        severity: 'LOW',
        title:    'Password Field Without Autocomplete Control',
        detail:   'Password input detected without explicit autocomplete="off" or autocomplete="new-password".',
        risk:     'Browsers may autofill or store passwords in unexpected contexts (e.g. shared devices, kiosk mode).',
        fix:      'Set autocomplete attribute explicitly on all password fields.',
        snippet:  '<input type="password" autocomplete="current-password" />\n<!-- For registration: -->\n<input type="password" autocomplete="new-password" />'
      });
    }

    // Mixed content signals
    if (/src=["']http:\/\//i.test(html) && /https/i.test(html.slice(0, 500))) {
      findings.push({
        id:       'HTML-002',
        category: 'Transport Security',
        severity: 'HIGH',
        title:    'Potential Mixed Content (HTTP resources on HTTPS page)',
        detail:   'External resources loaded over HTTP detected within an HTTPS context.',
        risk:     'HTTP resources can be intercepted and replaced by attackers, even on HTTPS pages. May trigger browser security warnings.',
        fix:      'Replace all resource URLs with HTTPS equivalents. Use protocol-relative URLs (//) or enforce HTTPS on all assets.',
        snippet:  '<!-- Replace: -->\n<script src="http://cdn.example.com/lib.js"></script>\n<!-- With: -->\n<script src="https://cdn.example.com/lib.js"></script>'
      });
    }

    // iFrame without sandbox
    if (/<iframe/i.test(html)) {
      if (!/<iframe[^>]*sandbox/i.test(html)) {
        findings.push({
          id:       'HTML-003',
          category: 'Content Isolation',
          severity: 'MEDIUM',
          title:    'Unsandboxed iFrame Detected',
          detail:   'One or more iFrame elements detected without a sandbox attribute.',
          risk:     'Unsandboxed iframes can execute scripts, access parent page DOM, and submit forms — creating significant injection risks.',
          fix:      'Add sandbox attribute to all iframes. Only grant permissions explicitly required.',
          snippet:  '<iframe sandbox="allow-scripts allow-same-origin" src="..."></iframe>\n<!-- For external content: -->\n<iframe sandbox src="..."></iframe>'
        });
      }
    }

    // Comments with sensitive-looking content
    const commentRe = /<!--([\s\S]*?)-->/g;
    let cm;
    while ((cm = commentRe.exec(html)) !== null) {
      const comment = cm[1];
      if (/password|secret|api.?key|token|credential|todo.?fix|hack|vuln|fixme/i.test(comment) && comment.trim().length > 3) {
        findings.push({
          id:       'HTML-004',
          category: 'Data Exposure',
          severity: 'HIGH',
          title:    'Sensitive Information in HTML Comments',
          detail:   'HTML comment contains potentially sensitive information (credentials, tokens, security notes).',
          risk:     'HTML comments are visible to anyone viewing page source. Credentials or security workarounds in comments are immediately exposed.',
          fix:      'Remove all sensitive data from HTML comments before deployment. Use server-side templating comments (never rendered to client).',
          snippet:  '<!-- ✗ NEVER do this:\n     password: admin123\n     api_key: sk-prod-xxxxx\n-->'
        });
        break; // one finding is enough
      }
    }
  }

  // ── Form Security ──────────────────────────────────────
  function _checkFormSecurity(html, text, findings) {
    // Forms without CSRF protection signals
    const formRe = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let fm;
    let insecureFormCount = 0;
    while ((fm = formRe.exec(html)) !== null) {
      const form    = fm[0];
      const isPost  = /method=["']post/i.test(form);
      const hasCsrf = /csrf|_token|nonce|authenticity_token|__requestverificationtoken/i.test(form);
      if (isPost && !hasCsrf) insecureFormCount++;
    }
    if (insecureFormCount > 0) {
      findings.push({
        id:       'FORM-001',
        category: 'CSRF Protection',
        severity: 'HIGH',
        title:    'POST Form(s) Without CSRF Token (' + insecureFormCount + ' detected)',
        detail:   insecureFormCount + ' POST form(s) found without detectable CSRF protection tokens.',
        risk:     'Cross-Site Request Forgery: attackers can trick authenticated users into submitting forms on your behalf — changing passwords, making purchases, deleting data.',
        fix:      'Include a unique, session-bound CSRF token in all state-changing forms. Validate server-side.',
        snippet:  '<!-- Include in every POST form -->\n<form method="POST" action="/submit">\n  <input type="hidden" name="csrf_token" value="{{ csrf_token }}" />\n  ...\n</form>'
      });
    }

    // Forms posting to HTTP from HTTPS
    if (/action=["']http:\/\//i.test(html)) {
      findings.push({
        id:       'FORM-002',
        category: 'Transport Security',
        severity: 'HIGH',
        title:    'Form Action Submits to HTTP Endpoint',
        detail:   'Form action attribute points to an HTTP (insecure) URL.',
        risk:     'Form data — including credentials — is transmitted unencrypted to the server.',
        fix:      'Change all form action URLs to use HTTPS.',
        snippet:  '<!-- Replace: action="http://api.example.com/submit" -->\n<form action="https://api.example.com/submit">'
      });
    }

    // Autocomplete on sensitive inputs
    if (/type=["'](?:text|email)["'][^>]*name=["'][^"']*(?:ssn|social.?security|card|cvv|dob|national.?id)/i.test(html)) {
      findings.push({
        id:       'FORM-003',
        category: 'Data Exposure',
        severity: 'MEDIUM',
        title:    'Sensitive Input Field May Allow Browser Autocomplete',
        detail:   'Form fields collecting highly sensitive data (SSN, card numbers, national ID) detected without autocomplete="off".',
        risk:     'Browser may autofill or suggest sensitive government/financial identifiers in unexpected contexts.',
        fix:      'Set autocomplete="off" on fields collecting particularly sensitive personal data.',
        snippet:  '<input type="text" name="ssn" autocomplete="off" />'
      });
    }
  }

  // ── Script / JS Patterns ───────────────────────────────
  function _checkScriptPatterns(html, text, findings) {
    // Inline eval usage
    if (/\beval\s*\(/i.test(html)) {
      findings.push({
        id:       'JS-001',
        category: 'JavaScript Security',
        severity: 'HIGH',
        title:    'eval() Usage Detected',
        detail:   'eval() call detected in page scripts. eval() executes arbitrary strings as code.',
        risk:     'If attacker-controlled data reaches eval(), it results in immediate Remote Code Execution in the browser. Also blocked by strict CSP.',
        fix:      'Replace eval() with safer alternatives. Use JSON.parse() for JSON, Function constructors with extreme care, or restructure code.',
        snippet:  '// Instead of:\neval(userInput);\n// Use:\nconst data = JSON.parse(jsonString); // for JSON\n// Or refactor to avoid dynamic code execution entirely'
      });
    }

    // document.write usage
    if (/document\.write\s*\(/i.test(html)) {
      findings.push({
        id:       'JS-002',
        category: 'JavaScript Security',
        severity: 'MEDIUM',
        title:    'document.write() Usage Detected',
        detail:   'document.write() calls detected. This method can be exploited for DOM injection.',
        risk:     'document.write() with unescaped user input enables XSS. Blocks parser and degrades performance.',
        fix:      'Replace document.write() with DOM API methods (createElement, appendChild, innerHTML with sanitisation).',
        snippet:  '// Instead of:\ndocument.write("<script src=\'" + src + "\'><\/script>");\n// Use:\nconst s = document.createElement("script");\ns.src = src;\ndocument.head.appendChild(s);'
      });
    }

    // innerHTML with potential variable
    if (/\.innerHTML\s*=\s*(?!["'`][^$\{])/i.test(html)) {
      findings.push({
        id:       'JS-003',
        category: 'JavaScript Security',
        severity: 'MEDIUM',
        title:    'Dynamic innerHTML Assignment Detected',
        detail:   'innerHTML assigned from a potentially dynamic value (variable or template literal).',
        risk:     'Assigning untrusted data to innerHTML executes embedded HTML/scripts — a common XSS vector.',
        fix:      'Sanitise all dynamic content before innerHTML assignment, or use textContent for plain text.',
        snippet:  '// Safe: text only\nel.textContent = userInput;\n\n// Safe: sanitise HTML\nel.innerHTML = DOMPurify.sanitize(userInput);\n\n// Safe: DOM API\nconst div = document.createElement("div");\ndiv.textContent = userInput;\nparent.appendChild(div);'
      });
    }

    // External scripts without integrity
    const scriptRe = /<script[^>]+src=["'](?:https?:)?\/\/(?!(?:localhost|127\.0\.0\.1))[^"']+["'][^>]*>/gi;
    let sm;
    let missingIntegrity = 0;
    while ((sm = scriptRe.exec(html)) !== null) {
      if (!/integrity=/i.test(sm[0])) missingIntegrity++;
    }
    if (missingIntegrity > 0) {
      findings.push({
        id:       'JS-004',
        category: 'Supply Chain Security',
        severity: 'MEDIUM',
        title:    'External Script(s) Without Subresource Integrity (' + missingIntegrity + ')',
        detail:   missingIntegrity + ' external <script> tag(s) loaded without Subresource Integrity (SRI) attribute.',
        risk:     'If a CDN or third-party script host is compromised, attackers can serve malicious code that executes with full trust on your site.',
        fix:      'Add integrity and crossorigin attributes to all external scripts. Generate SRI hash at deploy time.',
        snippet:  '<!-- Generate hash: openssl dgst -sha384 -binary lib.js | openssl base64 -A -->\n<script\n  src="https://cdn.example.com/lib.min.js"\n  integrity="sha384-{HASH}"\n  crossorigin="anonymous"\n></script>'
      });
    }

    // Hardcoded credentials / API keys in scripts
    const credPatterns = [
      { pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']([^"']{8,})/i,  label: 'API key' },
      { pattern: /(?:secret|private[_-]?key)\s*[:=]\s*["']([^"']{8,})/i, label: 'Secret/private key' },
      { pattern: /(?:password|passwd)\s*[:=]\s*["'][^"']{4,}/i,        label: 'Password' },
      { pattern: /(?:access[_-]?token)\s*[:=]\s*["']([^"']{8,})/i,    label: 'Access token' },
      { pattern: /sk-[a-zA-Z0-9]{20,}/,                                label: 'OpenAI-style secret key' },
      { pattern: /gh[pousr]_[A-Za-z0-9]{36,}/,                         label: 'GitHub token' },
      { pattern: /AKIA[0-9A-Z]{16}/,                                    label: 'AWS access key' }
    ];
    const scriptBlocks = html.match(/<script[\s\S]*?<\/script>/gi) || [];
    const inlineScripts = scriptBlocks.filter(s => !/src=/i.test(s));

    for (const { pattern, label } of credPatterns) {
      if (inlineScripts.some(s => pattern.test(s))) {
        findings.push({
          id:       'JS-005',
          category: 'Credential Exposure',
          severity: 'HIGH',
          title:    'Hardcoded ' + label + ' Detected in Frontend Script',
          detail:   'A ' + label + ' appears to be hardcoded in a client-side script block.',
          risk:     'Client-side JavaScript is visible to every user. Exposed credentials can be used immediately to abuse APIs, access backend systems, or drain accounts.',
          fix:      'Immediately rotate the exposed credential. Never embed secrets in client-side code. Use environment variables and server-side proxies.',
          snippet:  '// ✗ Never:\nconst API_KEY = "sk-real-key-here";\n\n// ✓ Correct — call your own backend:\nconst resp = await fetch("/api/my-endpoint");\n// Your server holds the key and calls the third-party API'
        });
        break;
      }
    }
  }

  // ── Sensitive Data Exposure ────────────────────────────
  function _checkSensitiveDataExposure(html, text, findings) {
    // PII patterns in visible HTML
    const piiPatterns = [
      { re: /\b\d{3}-\d{2}-\d{4}\b/,                     label: 'Social Security Number (SSN)' },
      { re: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/, label: 'Credit card number' },
      { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, label: 'Email address' },
      { re: /password['":\s]*[a-zA-Z0-9!@#$%]{6,}/i,     label: 'Password-like value' }
    ];

    // Only check body text, not script blocks (reduce false positives)
    const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
    const foundPii = [];
    for (const { re, label } of piiPatterns) {
      if (re.test(bodyText)) foundPii.push(label);
    }
    if (foundPii.length > 0) {
      findings.push({
        id:       'DATA-001',
        category: 'Data Exposure',
        severity: 'HIGH',
        title:    'Sensitive Personal Data Patterns in Page Source',
        detail:   'PII-like patterns detected in page HTML: ' + foundPii.join(', ') + '.',
        risk:     'Sensitive personal data exposed in HTML is visible to anyone viewing source and is indexable by search engines and crawlers.',
        fix:      'Remove all PII from HTML output. Mask data on the frontend (e.g. show **** for card numbers). Apply server-side data access controls.',
        snippet:  '// Mask sensitive values on display\nfunction maskEmail(email) {\n  const [user, domain] = email.split("@");\n  return user[0] + "***@" + domain;\n}'
      });
    }

    // Server error / stack trace in HTML
    if (/(?:stack trace|exception|at\s+\w+\.\w+\s*\([^)]+\.(?:js|ts|py|rb|php|java):\d+\)|fatal error|unhandled rejection)/i.test(html)) {
      findings.push({
        id:       'DATA-002',
        category: 'Data Exposure',
        severity: 'HIGH',
        title:    'Server Error / Stack Trace Visible in Response',
        detail:   'Server-side error messages or stack traces detected in the HTTP response.',
        risk:     'Stack traces reveal internal file paths, framework versions, and code structure — giving attackers a detailed map of your system.',
        fix:      'Disable debug mode in production. Configure error handlers to show generic messages to users. Log full errors server-side only.',
        snippet:  '// Express.js example\napp.use((err, req, res, next) => {\n  console.error(err.stack); // log internally\n  res.status(500).json({ error: "An error occurred" }); // generic to client\n});'
      });
    }

    // Directory listing signals
    if (/index of \/|directory listing/i.test(html)) {
      findings.push({
        id:       'DATA-003',
        category: 'Configuration',
        severity: 'HIGH',
        title:    'Directory Listing Enabled',
        detail:   'Server appears to be serving a directory listing page.',
        risk:     'Directory listings expose all files and folders on your server — configuration files, backup files, source code, and sensitive data.',
        fix:      'Disable directory listing in your web server configuration.',
        snippet:  '# Nginx\nautoindex off;\n\n# Apache (.htaccess)\nOptions -Indexes\n\n# Express.js: do not use serveStatic without disabling index'
      });
    }
  }

  // ── Client-side Storage ────────────────────────────────
  function _checkStoragePatterns(html, text, findings) {
    const scriptContent = (html.match(/<script[\s\S]*?<\/script>/gi) || []).join('\n');

    if (/localStorage\.setItem\s*\(\s*["'][^"']*(?:token|password|secret|key|auth|credential)/i.test(scriptContent)) {
      findings.push({
        id:       'STORE-001',
        category: 'Client Storage Security',
        severity: 'HIGH',
        title:    'Sensitive Data Stored in localStorage',
        detail:   'Sensitive values (tokens, passwords, secrets) appear to be written to localStorage.',
        risk:     'localStorage is accessible by any JavaScript on the page — including injected XSS payloads. Stored tokens persist indefinitely and survive page closes.',
        fix:      'Store authentication tokens in HttpOnly, Secure cookies (not accessible to JavaScript). Keep session state server-side.',
        snippet:  '// ✗ Avoid:\nlocalStorage.setItem("auth_token", token);\n\n// ✓ Use HttpOnly cookies (set server-side):\n// Set-Cookie: session=token; HttpOnly; Secure; SameSite=Strict; Path=/'
      });
    }

    if (/sessionStorage\.setItem\s*\(\s*["'][^"']*(?:password|secret|private)/i.test(scriptContent)) {
      findings.push({
        id:       'STORE-002',
        category: 'Client Storage Security',
        severity: 'MEDIUM',
        title:    'Sensitive Data Stored in sessionStorage',
        detail:   'Sensitive values appear to be stored in sessionStorage.',
        risk:     'sessionStorage is still accessible to XSS attacks within the same tab session.',
        fix:      'Avoid storing secrets in any client-side storage. Use server-side sessions and secure HttpOnly cookies.',
        snippet:  '// Use server-managed sessions instead of client storage for sensitive data'
      });
    }
  }

  // ── PWA Configuration ──────────────────────────────────
  function _checkPWAConfiguration(html, text, findings) {
    const hasManifest = /rel=["']manifest/i.test(html);
    const hasSW       = /service.?worker|sw\.js|service-worker\.js/i.test(html);

    if (hasSW && !hasManifest) {
      findings.push({
        id:       'PWA-001',
        category: 'PWA Configuration',
        severity: 'LOW',
        title:    'Service Worker Present Without Web Manifest',
        detail:   'Service worker detected but no web app manifest link found.',
        risk:     'PWA install prompts will not appear. App cannot be installed to home screen/desktop.',
        fix:      'Add a manifest.json file and link it in the HTML head.',
        snippet:  '<link rel="manifest" href="/manifest.json" />'
      });
    }

    if (hasSW) {
      // Check for scope issues in service worker reference
      if (/scope=["']\/[^"']+["']/i.test(html)) {
        // Possibly restricted scope — informational only
      }
    }

    if (!hasSW && hasManifest) {
      findings.push({
        id:       'PWA-002',
        category: 'PWA Configuration',
        severity: 'LOW',
        title:    'Web Manifest Without Service Worker',
        detail:   'Web app manifest linked but no service worker detected.',
        risk:     'App cannot work offline. Install experience is degraded on some platforms.',
        fix:      'Register a service worker to enable offline functionality and full PWA compliance.',
        snippet:  "if ('serviceWorker' in navigator) {\n  navigator.serviceWorker.register('/sw.js')\n    .then(r => console.log('SW registered'))\n    .catch(e => console.error('SW failed', e));\n}"
      });
    }
  }

  // ── Third-Party Risks ──────────────────────────────────
  function _checkThirdPartyRisks(html, text, findings) {
    const thirdPartyDomains = new Set();
    const scriptRe = /<script[^>]+src=["']((?:https?:)?\/\/[^"'/]+)/gi;
    let sm;
    while ((sm = scriptRe.exec(html)) !== null) {
      try {
        const host = new URL(sm[1].startsWith('//') ? 'https:' + sm[1] : sm[1]).hostname;
        if (!host.includes(window?.location?.hostname || 'self')) thirdPartyDomains.add(host);
      } catch (e) { /* skip */ }
    }

    if (thirdPartyDomains.size > 5) {
      findings.push({
        id:       'THIRD-001',
        category: 'Supply Chain Security',
        severity: 'MEDIUM',
        title:    'High Number of Third-Party Script Sources (' + thirdPartyDomains.size + ')',
        detail:   'Scripts loaded from ' + thirdPartyDomains.size + ' external domains: ' + [...thirdPartyDomains].slice(0,5).join(', ') + (thirdPartyDomains.size > 5 ? '...' : ''),
        risk:     'Each third-party script domain is a potential supply chain attack vector. A compromise of any of these CDNs or providers could inject malicious code.',
        fix:      'Audit all third-party scripts. Self-host critical libraries. Apply SRI hashes. Review and minimise third-party dependencies.'
      });
    }

    // Known analytics / tracking scripts
    const trackers = [];
    if (/google-analytics|gtag|analytics\.js/i.test(html))  trackers.push('Google Analytics');
    if (/facebook\.net|fbq\s*\(/i.test(html))               trackers.push('Meta Pixel');
    if (/hotjar|hj\s*\(/i.test(html))                       trackers.push('Hotjar');
    if (/segment\.com|analytics\.track/i.test(html))        trackers.push('Segment');
    if (/tiktok|ttq\s*\./i.test(html))                      trackers.push('TikTok Pixel');
    if (/linkedin.*insight/i.test(html))                     trackers.push('LinkedIn Insight');

    if (trackers.length > 0) {
      findings.push({
        id:       'THIRD-002',
        category: 'Privacy & Tracking',
        severity: 'LOW',
        title:    'Third-Party Tracking Scripts Detected: ' + trackers.join(', '),
        detail:   'Tracking / analytics scripts from ' + trackers.join(', ') + ' detected.',
        risk:     'These scripts may collect user behavioural data and share it with third parties. GDPR/CCPA compliance requires user consent before loading.',
        fix:      'Implement a consent management platform (CMP). Load tracking scripts only after explicit user consent. Update privacy policy.'
      });
    }
  }

  // ── Deprecated / Insecure Patterns ────────────────────
  function _checkDeprecatedPatterns(html, text, findings) {
    if (/<meta[^>]+http-equiv=["']X-UA-Compatible/i.test(html)) {
      findings.push({
        id:       'DEPR-001',
        category: 'Browser Compatibility',
        severity: 'LOW',
        title:    'X-UA-Compatible Meta Tag (IE Compatibility Mode)',
        detail:   'X-UA-Compatible meta tag found — used to control Internet Explorer rendering mode.',
        risk:     'Triggering IE compatibility mode can disable modern security features and render the page in an insecure legacy engine.',
        fix:      'Remove X-UA-Compatible meta tag. Drop IE support. Ensure DOCTYPE is <!DOCTYPE html>.',
        snippet:  '<!-- Remove this: -->\n<meta http-equiv="X-UA-Compatible" content="IE=edge" />'
      });
    }

    if (/<marquee|<blink|<frame|<frameset/i.test(html)) {
      findings.push({
        id:       'DEPR-002',
        category: 'Deprecated Technology',
        severity: 'LOW',
        title:    'Deprecated HTML Elements Detected',
        detail:   'Deprecated HTML elements (<marquee>, <blink>, <frame>, <frameset>) detected.',
        risk:     'Deprecated elements indicate outdated codebase which may also have unpatched security vulnerabilities.',
        fix:      'Replace deprecated elements with modern HTML/CSS equivalents. Conduct a full dependency audit.'
      });
    }

    if (/jquery.*1\.[0-6]\.|jquery.*2\.0\./i.test(html)) {
      findings.push({
        id:       'DEPR-003',
        category: 'Outdated Dependencies',
        severity: 'MEDIUM',
        title:    'Old jQuery Version Detected (with known CVEs)',
        detail:   'jQuery version 1.x or 2.0.x detected — these versions have multiple known security vulnerabilities.',
        risk:     'Known XSS vulnerabilities (e.g. CVE-2019-11358, CVE-2020-11022) exist in these versions.',
        fix:      'Upgrade to jQuery 3.7+ or migrate to modern vanilla JS / framework alternatives.',
        snippet:  '<!-- Upgrade to: -->\n<script src="https://code.jquery.com/jquery-3.7.1.min.js"\n  integrity="sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs"\n  crossorigin="anonymous"></script>'
      });
    }
  }

  // ── Transport Security ─────────────────────────────────
  function _checkTransportSecurity(url, fetchResult, findings) {
    // Connection speed / timing signals
    if (fetchResult.elapsed && fetchResult.elapsed > 5000) {
      findings.push({
        id:       'PERF-001',
        category: 'Performance Security',
        severity: 'LOW',
        title:    'Slow Server Response (' + (fetchResult.elapsed / 1000).toFixed(1) + 's)',
        detail:   'Server took over 5 seconds to respond.',
        risk:     'Slow responses may indicate DoS vulnerability, resource exhaustion, or unoptimised infrastructure that could affect availability.',
        fix:      'Implement caching, CDN, connection pooling, and query optimisation. Set reasonable server-side timeouts.'
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  // LAYER 3 — RISK SCORING ENGINE
  // ══════════════════════════════════════════════════════════
  function scoreFindings(findings) {
    let score = 100; // Start at 100 (perfect), deduct per finding

    const HIGH_PENALTY   = 15;
    const MEDIUM_PENALTY =  7;
    const LOW_PENALTY    =  3;

    const counts    = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byCategory = {};

    for (const f of findings) {
      if (f.severity === 'HIGH')   { score -= HIGH_PENALTY;   counts.HIGH++; }
      if (f.severity === 'MEDIUM') { score -= MEDIUM_PENALTY; counts.MEDIUM++; }
      if (f.severity === 'LOW')    { score -= LOW_PENALTY;    counts.LOW++; }

      if (!byCategory[f.category]) byCategory[f.category] = [];
      byCategory[f.category].push(f);
    }

    score = Math.max(0, Math.min(100, score));

    const riskLevel = score >= 80 ? 'LOW'
                    : score >= 55 ? 'MEDIUM'
                    : score >= 30 ? 'HIGH'
                    : 'CRITICAL';

    const riskColour = { LOW: '#00FF88', MEDIUM: '#F5A623', HIGH: '#FF5050', CRITICAL: '#FF0000' }[riskLevel];

    return { score, riskLevel, riskColour, counts, byCategory };
  }

  // ══════════════════════════════════════════════════════════
  // FULL SCAN ORCHESTRATOR
  // ══════════════════════════════════════════════════════════
  async function scan(url, onProgress) {
    const emit = (msg, pct) => { if (onProgress) onProgress(msg, pct); };
    const scanId = 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const startedAt = new Date().toISOString();

    try {
      emit('[ INIT ] Validating URL…', 5);
      // Basic URL validation
      let parsedUrl;
      try { parsedUrl = new URL(url); } catch {
        return { success: false, error: '[VALIDATION] Invalid URL format' };
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return { success: false, error: '[VALIDATION] Only HTTP/HTTPS URLs supported' };
      }

      emit('[ FETCH ] Requesting target page…', 15);
      const fetchResult = await fetchTarget(url);

      emit('[ ANALYSIS ] Running security analysis engine…', 35);
      const findings = analyse(fetchResult, url);

      emit('[ SCORING ] Computing risk scores…', 70);
      const scoreResult = scoreFindings(findings);

      emit('[ PATCHES ] Generating remediation guidance…', 85);
      // Patches are embedded in each finding already; summarise
      const patchSummary = {
        critical: findings.filter(f => f.severity === 'HIGH').map(f => ({ id: f.id, title: f.title, fix: f.fix, snippet: f.snippet })),
        medium:   findings.filter(f => f.severity === 'MEDIUM').map(f => ({ id: f.id, title: f.title, fix: f.fix, snippet: f.snippet })),
        low:      findings.filter(f => f.severity === 'LOW').map(f => ({ id: f.id, title: f.title, fix: f.fix }))
      };

      const report = {
        scanId,
        url,
        scannedAt:     startedAt,
        completedAt:   new Date().toISOString(),
        version:       SCAN_VERSION,
        fetchResult: {
          success:       fetchResult.success,
          httpStatus:    fetchResult.httpStatus,
          corsBlocked:   fetchResult.corsBlocked || false,
          contentLength: fetchResult.contentLength,
          elapsed:       fetchResult.elapsed,
          visibleHeaders:fetchResult.visibleHeaders
        },
        findings,
        scoreResult,
        patchSummary,
        totalFindings: findings.length
      };

      // Save to SSOT
      emit('[ STORAGE ] Saving to local SSOT…', 95);
      _saveReport(report);

      emit('[ COMPLETE ] Scan complete — ' + findings.length + ' findings', 100);
      return { success: true, report };

    } catch (err) {
      return { success: false, error: '[SYSTEM ERROR] ' + err.message };
    }
  }

  // ══════════════════════════════════════════════════════════
  // SSOT INTEGRATION (storage.js)
  // ══════════════════════════════════════════════════════════
  function _saveReport(report) {
    const db = AP3X_Storage.getDB();
    if (!Array.isArray(db.securescan_reports))  db.securescan_reports  = [];
    if (!Array.isArray(db.securescan_history))  db.securescan_history  = [];

    // Save full report
    db.securescan_reports.push(report);
    // Keep last 50
    if (db.securescan_reports.length > 50) db.securescan_reports = db.securescan_reports.slice(-50);

    // Lightweight history entry
    db.securescan_history.push({
      scanId:       report.scanId,
      url:          report.url,
      scannedAt:    report.scannedAt,
      score:        report.scoreResult.score,
      riskLevel:    report.scoreResult.riskLevel,
      totalFindings:report.totalFindings,
      highCount:    report.scoreResult.counts.HIGH,
      mediumCount:  report.scoreResult.counts.MEDIUM,
      lowCount:     report.scoreResult.counts.LOW
    });
    if (db.securescan_history.length > 200) db.securescan_history = db.securescan_history.slice(-200);

    db.meta.totalSecureScans = (db.meta.totalSecureScans || 0) + 1;
    AP3X_Storage.saveDB(db);
  }

  function getAllReports() {
    const db = AP3X_Storage.getDB();
    return (db.securescan_reports || []).slice().reverse();
  }

  function getReport(scanId) {
    const db = AP3X_Storage.getDB();
    return (db.securescan_reports || []).find(r => r.scanId === scanId) || null;
  }

  function getHistory() {
    const db = AP3X_Storage.getDB();
    return (db.securescan_history || []).slice().reverse();
  }

  function deleteReport(scanId) {
    const db = AP3X_Storage.getDB();
    db.securescan_reports = (db.securescan_reports || []).filter(r => r.scanId !== scanId);
    db.securescan_history = (db.securescan_history || []).filter(r => r.scanId !== scanId);
    AP3X_Storage.saveDB(db);
  }

  function clearAllScans() {
    const db = AP3X_Storage.getDB();
    db.securescan_reports = [];
    db.securescan_history = [];
    db.meta.totalSecureScans = 0;
    AP3X_Storage.saveDB(db);
  }

  return {
    scan,
    getAllReports,
    getReport,
    getHistory,
    deleteReport,
    clearAllScans,
    scoreFindings,
    analyse
  };
})();

window.SecureScanEngine = SecureScanEngine;
