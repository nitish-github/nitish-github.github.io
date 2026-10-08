# FastAPI article backend

This is a Python/FastAPI alternative to the existing Node API. It keeps the same
routes and SQLite schema, and by default uses the Node backend's
`api/data/articles.db` so either backend can read the same users, sessions, and
articles.

## Run locally

From this directory:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m app
```

Set `DATABASE_PATH` to a separate SQLite file if both backends should use
independent data. Use an absolute path for deployments. Configure `HOST`,
`PORT`, `DATABASE_PATH`, and comma-separated `CORS_ORIGINS` through environment
variables; `.env` is for local development only. In production, run Uvicorn
without `--reload`, for example `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

The interactive API docs are available at `/docs`. The current frontend points
to `http://localhost:3001`, so using this service with it requires changing the
frontend API base URLs or proxying port 3001 to this service.

## Routes

- `GET /health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `PUT /api/auth/preferences`
- `GET /api/categories`
- `GET /api/articles`
- `GET /api/articles/{category}`
- `GET /api/articles/{category}/{slug}`
- `GET /api/my/articles`
- `POST /api/articles`
- `PUT /api/articles/{article_id}`
- `DELETE /api/articles/{article_id}`

The existing demo account is `demo@example.com` / `password123` when the
database has been initialized by the Node backend.
