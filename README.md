# AP3X Intelligent AI
### by Kyzel Kreates

> **Local Intelligence Operating System** — A fully offline, installable PWA that ingests raw unstructured text and converts it into structured intelligence, builds a dynamic knowledge graph, and generates multi-mode analysis outputs.

---

## What It Is

AP3X Intelligent AI is **not a chatbot**. It is an intelligence operating system that:

- Stores knowledge locally (no cloud, no APIs, no backend)
- Ingests raw text and automatically extracts entities, tags, domain classification, and summaries
- Builds a live knowledge graph of systems and their relationships
- Generates structured analysis in 3 modes: **Simple**, **Technical**, and **Investor**
- Runs fully offline as an installable PWA

---

## Screens

| Screen | Purpose |
|--------|---------|
| **Dashboard** | System status, health, stats, domain overview, recent intelligence |
| **Project Browser** | Browse all indexed systems with tags and entities |
| **Ingestion Engine** | Paste raw text → instant structured intelligence |
| **Analysis View** | 3-mode explanation engine per system |
| **Knowledge Graph** | Live node-edge canvas map of the AP3X ecosystem |

---

## Architecture

```
storage.js              ← Single source of truth (localStorage)
├── project-engine.js   ← CRUD for AP3X projects
├── ingestion-engine.js ← Raw text → structured records
├── knowledge-engine.js ← Query, search, overview
├── relationship-engine.js ← Graph builder + indexer
├── explanation-engine.js  ← Simple / Technical / Investor modes
├── graph-renderer.js   ← Canvas-based knowledge graph
└── app.js              ← Main UI controller
```

---

## PWA Features

- ✅ Fully offline (service worker + cache-first strategy)
- ✅ Installable on Android, iOS, and Desktop
- ✅ One-tap install prompt (Android/Desktop)
- ✅ Guided iOS install overlay
- ✅ `manifest.json` + `sw.js` included
- ✅ 192px + 512px icons

---

## How to Deploy

Drop the project folder on any static host (Netlify, Vercel, GitHub Pages, or your own server). **Must be served over HTTPS** for service worker and PWA install to activate.

### GitHub Pages (quickest)
1. Go to **Settings → Pages**
2. Set source to **main branch, root (`/`)**
3. Your app will be live at `https://kyzelkreates.github.io/AP3XIntelligentAIbyKyzelKreates`

---

## Tech Stack

- **Vanilla JS** (ES6, no frameworks, no dependencies)
- **Canvas API** (knowledge graph renderer)
- **localStorage** (all data, fully local)
- **Service Worker** (offline caching)
- **Web App Manifest** (PWA install)

---

*Built with AP3X Base Structure — Kyzel Kreates © 2025*
