# AGENTS.md

## Purpose
This repository is a React + TypeScript article app with a static-first article reader, admin CRUD flow, and backend selection via `DATA_SOURCE`.

## Required behaviors
- Use TypeScript and keep types in `src/types/article.ts`.
- Keep CRUD operations centralized in `src/services/articleRepository.ts`.
- Do not bypass repository functions when handling article create/update/delete work.
- Respect the backend mode from `DATA_SOURCE`:
  - `sqlite`: use `api/server.js`
  - `firestore`: use Firebase repository helpers
- Keep article data JSON-friendly and editor-aware.

## Local commands
```bash
npm install
npm run dev
npm run build
cd api && node server.js
```

## Important paths
- `src/App.tsx`
- `src/pages/AdminPage.tsx`
- `src/pages/ArticleAppShell.tsx`
- `src/services/articleRepository.ts`
- `src/services/firebaseRepository.ts`
- `src/components/ArticleEditor.tsx`
- `src/lib/editorAdapters.ts`
- `api/server.js`
- `RUN_GUIDE.md`

## Quality bar
- Validate with `npm run build` before ending work.
- Maintain GitHub Pages compatibility and static asset behavior.
- Keep admin editing flow consistent with the selected backend.
- Prefer small, surgical edits over broad rewrites.

## Do not do
- Do not add hidden database logic outside the repository/service layer.
- Do not break the route structure or static category navigation.
- Do not hard-code a single backend when the app is designed to switch via `DATA_SOURCE`.
