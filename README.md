# TFF Portal — Starter (React + Vite + Tailwind)

## Quick start
```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project structure
- `src/components/TFFPortal.tsx` — main portal with tabs, standings, fixtures, share, OCR upload
- `src/components/UploadResults.tsx` — image OCR upload to update results (localStorage trial)
- `src/utils/useOCR.ts` — Tesseract.js OCR helper
- `src/data/*.json` — teams, fixtures, results

## Deploy to Vercel
1) Create a new GitHub repo and push this project.
2) Go to https://vercel.com → Import Project → select repo.
3) Framework preset: **Vite** (auto-detected). Build Command: `npm run build`. Output dir: `dist`.
4) Deploy. Your live URL will be something like `https://tff-portal.vercel.app`.

## Updating results
- Use the **Upload Results** tab to OCR a weekly screenshot and update your browser's data.
- Or edit `src/data/results.json` and redeploy.
