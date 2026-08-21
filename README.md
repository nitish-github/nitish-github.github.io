# Article App

Something to help organ capture notes

## 1) Run the app

From the project root:

```bash
npm install
npm run dev
```

Then start the local SQLite API in a second terminal:

```bash
cd api
node server.js
```

The local app runs at:

```text
http://localhost:5173/
```

The API runs at:

```text
http://localhost:3001/
```

## 2) Choose the backend with DATA_SOURCE

Create a `.env` file in the project root:

```env
DATA_SOURCE=sqlite
VITE_DATA_SOURCE=sqlite
```

Or use Firestore:

```env
DATA_SOURCE=firestore
VITE_DATA_SOURCE=firestore
```

The app reads `DATA_SOURCE` and uses the matching backend for article reads and writes.

If you choose SQLite, the API must be running because the app calls:

```text
http://localhost:3001/api/articles
```

If you choose Firestore, replace the demo Firebase config in:

```text
src/firebase/firebase.ts
```

with valid project credentials.

## 3) Add a new article

1. Open the admin page at:

```text
/#/admin
```

2. Select the backend chip:
   - SQLite
   - Firestore

3. Fill in the article form:
   - Category
   - Title
   - Slug
   - Tags
   - Summary
   - References
   - Content

4. Click Create article.

5. The article is saved to the chosen backend and becomes available in the main article list once refreshed.

## 4) Update an existing article

1. Open the admin page at:

```text
/#/admin
```

2. Load the article you want to edit.

3. Change the title, summary, tags, references, or content.

4. Click Update article.

5. The article is saved back to the active backend with the new timestamp.

## 5) Delete an article

1. Open the article in the admin editor.
2. Click Delete article.
3. The item is removed from the active backend.

## 6) SQLite API details

The local API supports:

- GET /health
- GET /api/categories
- GET /api/articles
- GET /api/articles/:category
- GET /api/articles/:category/:slug
- POST /api/articles
- PUT /api/articles/:id
- DELETE /api/articles/:id

## 7) Production build

```bash
npm run build
```

The build is output to:

```text
dist/
```

## 8) Deploy to GitHub Pages

The repo includes a Pages workflow in:

```text
.github/workflows/pages.yml
```

Push to the main branch or trigger the workflow manually from GitHub Actions.

