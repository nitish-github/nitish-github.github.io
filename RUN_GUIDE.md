# Run Guide

This project is a React + TypeScript article app with a static-first data source, IndexedDB caching, a local SQLite API, and a Firebase-ready production path.

## 1) Install dependencies

From the project root:

```bash
npm install
```

For the local API:

```bash
cd api
npm install
```

## 2) Configure the backend source

Create a `.env` file in the project root with either SQLite or Firestore:

```env
DATA_SOURCE=sqlite
VITE_DATA_SOURCE=sqlite
```

or

```env
DATA_SOURCE=firestore
VITE_DATA_SOURCE=firestore
```

The app reads `DATA_SOURCE` and uses SQLite or Firestore for article reads and writes.

## 3) Start the app in development mode

From the project root:

```bash
npm run dev
```

The app runs by default on:

```text
http://localhost:5173/
```

## 4) Start the local SQLite API

In a second terminal:

```bash
cd api
node server.js
```

The API runs on:

```text
http://localhost:3001/
```

Available endpoints:

- GET /health
- GET /api/categories
- GET /api/articles
- GET /api/articles/:category
- GET /api/articles/:category/:slug
- POST /api/articles

## 5) Build for production

From the project root:

```bash
npm run build
```

The build output is generated in:

```text
dist/
```

## 6) Deploy to GitHub Pages

The project includes a Pages deployment workflow in:

```text
.github/workflows/pages.yml
```

Push to the main branch, or run the workflow manually from GitHub Actions.

## 7) Firebase mode

The code includes a Firebase-ready configuration in:

```text
src/firebase/firebase.ts
```

Replace the demo config with your real Firebase project values to enable the authenticated production write path.

## 8) Useful commands

```bash
npm run dev
npm run build
npm run preview
```

For the local API:

```bash
cd api
node server.js
```
