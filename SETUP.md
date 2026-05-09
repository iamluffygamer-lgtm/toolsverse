# ToolStack — Setup Guide

## Brand Colors

| Name    | Hex       | Usage                        |
|---------|-----------|------------------------------|
| Cream   | `#FAF8F4` | Page background              |
| Surface | `#F4F0E8` | Cards, panels                |
| Sand    | `#F0EBE1` | Sidebar background           |
| Border  | `#E0D9CE` | Default borders              |
| Ink 900 | `#0F0E0C` | Primary text / buttons       |
| Ink 700 | `#2E2B24` | Body text                    |
| Ink 500 | `#6B6660` | Secondary / muted text       |
| Gold    | `#C8973E` | Accent — used sparingly      |
| Gold Lt | `#F4E8CE` | Accent backgrounds / badges  |

---

## Step 1 — Install dependencies

```bash
cd toolstack
npm install
```

## Step 2 — Run dev server

```bash
npm run dev
```
Open http://localhost:3000

## Step 3 — Build for production

```bash
npm run build
npm start
```

## Step 4 — Deploy (Vercel recommended)

```bash
npm i -g vercel
vercel
```
Or connect your GitHub repo to Vercel — it auto-deploys on every push.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          ← Root layout (sidebar, topbar, ads)
│   ├── page.tsx            ← Homepage with tool grid
│   ├── globals.css         ← Brand tokens + base styles
│   └── tools/
│       └── json-formatter/ ← Tool #1 (live + working)
│           ├── page.tsx
│           └── metadata.ts
├── components/
│   ├── Sidebar.tsx         ← Left nav with category accordion
│   ├── Topbar.tsx          ← Search + nav
│   ├── AdSlot.tsx          ← AdSense-ready ad slots
│   └── ToolCard.tsx        ← Homepage tool card
└── lib/
    └── tools.ts            ← Master tool registry (add tools here)
```

---

## Adding a New Tool

1. Add an entry to `src/lib/tools.ts`:
```ts
{
  id: 'base64',
  name: 'Base64 Encoder / Decoder',
  description: '...',
  category: 'developer',
  tags: ['base64', 'encode', 'decode'],
  icon: 'Lock',
}
```

2. Create `src/app/tools/base64/page.tsx` — the tool component.
3. Done. It auto-appears in sidebar, homepage, and search.

---

## AdSense Setup

1. Get approved on Google AdSense.
2. Open `src/app/layout.tsx` — uncomment the `<script>` tag and replace `ca-pub-XXXXXXXXXXXXXXXX`.
3. Open `src/components/AdSlot.tsx` — replace placeholder div with `<ins>` tags.
4. Ad slots are already placed:
   - Top leaderboard (728×90) — above every tool
   - Right rail skyscraper (160×600) — visible on xl screens
   - Right rail square (250×250)
   - Mid-page rectangle (300×250) — between category sections

---

## Monetization Checklist

- [ ] AdSense — baked into layout (just add publisher ID)
- [ ] Affiliate — add relevant links in tool FAQ sections
- [ ] Freemium — add `isPro: true` to tools in registry, gate with auth
- [ ] SEO — every tool has its own URL, metadata, and FAQ content

---

## SEO Architecture

- Every tool = `/tools/[id]/` → unique URL → unique metadata
- Homepage has category sections → internal linking
- Each tool has FAQ content below the tool → long-tail keyword coverage
- `trailingSlash: true` in next.config.js → consistent canonical URLs
- sitemap.xml → add `next-sitemap` package when ready:
  ```bash
  npm i next-sitemap
  ```
