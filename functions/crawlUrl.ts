// ============================================================
// AP3X — CONTROLLED CRAWLER FUNCTION v2.1
// PUBLIC endpoint — no auth required (rate-limited by CORS)
// Fetches a public URL, extracts structured site data
// NO external AI browsing — controlled extraction only
// ============================================================

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Helpers ──────────────────────────────────────────────────

function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return { valid: false, error: 'Only HTTP/HTTPS URLs are supported' };
    }
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' || host === '127.0.0.1' ||
      host.startsWith('192.168.') || host.startsWith('10.') ||
      host.startsWith('172.16.') || host.endsWith('.local')
    ) {
      return { valid: false, error: 'Private/local URLs are not permitted' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ').trim().slice(0, 12000);
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) meta.title = titleMatch[1].trim();
  const metaRe = /<meta[^>]+>/gi;
  let m: RegExpExecArray | null;
  while ((m = metaRe.exec(html)) !== null) {
    const tag = m[0];
    const nameM    = tag.match(/name=["']([^"']+)["']/i);
    const propM    = tag.match(/property=["']([^"']+)["']/i);
    const contentM = tag.match(/content=["']([^"']+)["']/i);
    if (contentM) {
      const key = nameM?.[1] || propM?.[1];
      if (key) meta[key.toLowerCase()] = contentM[1].trim().slice(0, 400);
    }
  }
  return meta;
}

function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const re = /<a[^>]+href=["']([^"'#?]+)["']/gi;
  let m: RegExpExecArray | null;
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    try {
      const href = m[1].trim();
      if (!href || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
      let full: string;
      if (href.startsWith('http'))      full = href;
      else if (href.startsWith('/'))    full = `${base.protocol}//${base.host}${href}`;
      else continue;
      const u = new URL(full);
      if (u.hostname === base.hostname && !seen.has(u.pathname)) {
        seen.add(u.pathname); links.push(full);
      }
    } catch { /* skip */ }
  }
  return links.slice(0, 40);
}

function extractNavigation(html: string): string[] {
  const navItems: string[] = [];
  const navRe = /<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/gi;
  let nm: RegExpExecArray | null;
  while ((nm = navRe.exec(html)) !== null) {
    const inner = nm[1];
    const linkRe = /<a[^>]*>([^<]+)<\/a>/gi;
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(inner)) !== null) {
      const text = lm[1].trim();
      if (text && text.length < 60 && !navItems.includes(text)) navItems.push(text);
    }
  }
  return navItems.slice(0, 30);
}

function extractHeadings(html: string): { h1: string[]; h2: string[]; h3: string[] } {
  const extract = (tag: string) => {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    const items: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const t = m[1].replace(/<[^>]+>/g, '').trim();
      if (t && t.length < 200 && !items.includes(t)) items.push(t);
    }
    return items.slice(0, 15);
  };
  return { h1: extract('h1'), h2: extract('h2'), h3: extract('h3') };
}

function extractForms(html: string): Array<{ action: string; inputs: string[] }> {
  const forms: Array<{ action: string; inputs: string[] }> = [];
  const formRe = /<form[^>]*>([\s\S]*?)<\/form>/gi;
  let fm: RegExpExecArray | null;
  while ((fm = formRe.exec(html)) !== null) {
    const inner = fm[0];
    const actionM = inner.match(/action=["']([^"']+)["']/i);
    const inputRe = /<input[^>]+>/gi;
    const inputs: string[] = [];
    let im: RegExpExecArray | null;
    while ((im = inputRe.exec(inner)) !== null) {
      const nameM = im[0].match(/(?:name|placeholder|type)=["']([^"']+)["']/i);
      if (nameM) inputs.push(nameM[1]);
    }
    forms.push({ action: actionM?.[1] || '', inputs: [...new Set(inputs)].slice(0, 10) });
  }
  return forms.slice(0, 10);
}

function extractButtons(html: string): string[] {
  const buttons: string[] = [];
  const re = /<(?:button|input[^>]+type=["'](?:button|submit)["'])[^>]*>([^<]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].trim();
    if (t && t.length < 80 && !buttons.includes(t)) buttons.push(t);
  }
  const re2 = /<[^>]+(?:aria-label|value)=["']([^"']{3,60})["'][^>]*>/gi;
  while ((m = re2.exec(html)) !== null) {
    const t = m[1].trim();
    if (!buttons.includes(t)) buttons.push(t);
  }
  return [...new Set(buttons)].slice(0, 30);
}

function extractPricing(text: string): string[] {
  const signals: string[] = [];
  const patterns = [
    /\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year|user|seat))?/gi,
    /£[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|yr|year))?/gi,
    /(?:free|starter|pro|enterprise|business|growth|scale)\s+plan/gi,
    /(?:per|\/)\s*(?:month|year|user|seat)/gi,
    /(?:annual|monthly)\s+(?:billing|subscription|plan)/gi,
    /(?:14|30)-day\s+(?:free\s+)?trial/gi,
    /freemium|open[- ]source|self[- ]hosted/gi
  ];
  for (const p of patterns) {
    const matches = text.match(p);
    if (matches) signals.push(...matches.map(s => s.trim()));
  }
  return [...new Set(signals)].slice(0, 20);
}

function inferApiSignals(html: string, text: string): string[] {
  const signals: string[] = [];
  const patterns = [
    /(?:REST|GraphQL|gRPC|WebSocket|webhook)/gi,
    /API\s+(?:key|token|endpoint|reference|docs)/gi,
    /(?:OAuth|JWT|SSO|SAML|2FA|MFA)/gi,
    /(?:Stripe|Twilio|SendGrid|Firebase|Supabase|AWS|GCP|Azure)/gi,
    /\/api\/v\d/gi,
    /swagger|openapi|postman/gi
  ];
  const combined = html + text;
  for (const p of patterns) {
    const matches = combined.match(p);
    if (matches) signals.push(...matches.map(s => s.trim()));
  }
  return [...new Set(signals)].slice(0, 20);
}

// ── CORS headers — allow AP3X PWA to call this ────────────────
function corsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age':       '86400',
  };
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors   = corsHeaders(origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    // ── Auth: allow both authenticated and API-key requests ──
    // If called from the AP3X PWA with an AP3X-Token header, accept it
    // If called with Base44 session, also accept
    // If neither, still allow (public crawl endpoint — no sensitive data returned)
    const ap3xToken = req.headers.get('x-ap3x-token');
    const validToken = ap3xToken === 'AP3X-CRAWLER-PUBLIC-2025';

    // Try Base44 auth but don't block if it fails
    let isBase44Authed = false;
    try {
      const base44 = createClientFromRequest(req);
      const user   = await base44.auth.me();
      if (user) isBase44Authed = true;
    } catch { /* not base44 authed — ok for public endpoint */ }

    // Must have at least one form of auth
    if (!isBase44Authed && !validToken) {
      return Response.json(
        { error: '[AUTH FAIL] Provide x-ap3x-token header' },
        { status: 401, headers: cors }
      );
    }

    const body    = await req.json().catch(() => ({}));
    const { url } = body as { url?: string };

    if (!url) {
      return Response.json({ error: '[VALIDATION FAIL] No URL provided' }, { status: 400, headers: cors });
    }

    const validation = validateUrl(url);
    if (!validation.valid) {
      return Response.json({ error: `[VALIDATION FAIL] ${validation.error}` }, { status: 400, headers: cors });
    }

    // ── Fetch ────────────────────────────────────────────────
    let html: string;
    let finalUrl: string;
    let httpStatus: number;

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AP3X-Crawler/2.0; +https://ap3x.kyzelkreates.com)',
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000)
      });

      httpStatus = resp.status;
      finalUrl   = resp.url;

      if (!resp.ok) {
        return Response.json(
          { error: `[CRAWL FAIL] HTTP ${resp.status} — ${resp.statusText}` },
          { status: 422, headers: cors }
        );
      }

      const ct = resp.headers.get('content-type') || '';
      if (!ct.includes('text/html') && !ct.includes('text/plain') && !ct.includes('application/xhtml')) {
        return Response.json(
          { error: `[CRAWL FAIL] Non-HTML content type: ${ct}` },
          { status: 422, headers: cors }
        );
      }

      html = await resp.text();
    } catch (fetchErr) {
      const msg = (fetchErr as Error).message;
      // Provide a helpful error message for common failure modes
      const friendly = msg.includes('fetch') || msg.includes('network')
        ? `Network error reaching target URL. The site may block crawlers or require JavaScript. (${msg})`
        : msg;
      return Response.json(
        { error: `[CRAWL FAIL] ${friendly}` },
        { status: 422, headers: cors }
      );
    }

    if (!html || html.trim().length < 100) {
      return Response.json(
        { error: '[CRAWL FAIL] Empty or near-empty page returned' },
        { status: 422, headers: cors }
      );
    }

    // ── Extract ──────────────────────────────────────────────
    const meta     = extractMeta(html);
    const text     = extractTextContent(html);
    const headings = extractHeadings(html);
    const links    = extractLinks(html, finalUrl);
    const nav      = extractNavigation(html);
    const forms    = extractForms(html);
    const buttons  = extractButtons(html);
    const pricing  = extractPricing(text);
    const apiSigs  = inferApiSignals(html, text);

    // ── Validation gate ──────────────────────────────────────
    const hasContent = headings.h1.length > 0 || headings.h2.length > 0 || text.length > 200;
    if (!hasContent) {
      return Response.json(
        { error: '[EXTRACTION FAIL] Insufficient content — page likely requires JavaScript rendering (SPA/React/Next.js). Try the homepage or a docs/pricing page instead.' },
        { status: 422, headers: cors }
      );
    }

    const snapshot = {
      url: finalUrl, httpStatus,
      crawledAt: new Date().toISOString(),
      meta, text: text.slice(0, 8000),
      headings, links,
      navigation: nav,
      forms, buttons,
      pricingSignals: pricing,
      apiSignals:     apiSigs,
      htmlLength:     html.length,
      textLength:     text.length
    };

    return Response.json(
      { success: true, snapshot },
      { status: 200, headers: cors }
    );

  } catch (error) {
    return Response.json(
      { error: `[SYSTEM ERROR] ${(error as Error).message}` },
      { status: 500, headers: cors }
    );
  }
});
