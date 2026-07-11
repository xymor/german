# German Lessons Static Site

A GitHub Pages static site for Raphael's B1 German sentence-correction course.

## Architecture

- GitHub Pages serves the static frontend (`index.html`, `styles.css`, `script.js`).
- Convex stores lessons, sentence cards, and review cards.
- The frontend talks only to the public Convex HTTP endpoint:
  - `https://dapper-owl-146.convex.site/lessons`
  - `https://dapper-owl-146.convex.site/cards`
- The Convex API token is **not** embedded in frontend JavaScript.

## Convex backend

Convex source lives under `convex/`:

- `schema.ts` — lessons, sentences, reviewCards tables
- `lessons.ts` — list/get/upsert lesson functions
- `cards.ts` — list/rate review card functions
- `http.ts` — CORS-enabled HTTP routes for the static frontend
- `seed.ts` — initial seed data

## Local checks

```bash
npm install
npm run check
python3 -m http.server 8766
```

## Deployment

GitHub Pages is configured from the repository root on `master`.
Convex deployment:

- Project: `raphael-miranda/german-lessons`
- Deployment: `dapper-owl-146`
- Cloud URL: `https://dapper-owl-146.convex.cloud`
- Public site HTTP URL: `https://dapper-owl-146.convex.site`
