# Split Striker — Developer Guide

## Project Structure

```
split-striker/
├── backend/          FastAPI Python backend
│   ├── main.py       App entry point, CORS config
│   ├── database.py   SQLAlchemy setup (PostgreSQL in prod, SQLite locally)
│   ├── models.py     ORM models
│   ├── routers/      Route handlers (users, groups, expenses, invites, …)
│   └── tests/        pytest test suites (test_core.py + test_api.py)
└── frontend/         React + Vite + Tailwind frontend
    ├── src/
    │   ├── api/client.js         All API calls via the `api` object
    │   ├── hooks/useCurrentUser  Auth state (localStorage)
    │   ├── hooks/useTheme        6-theme switcher (localStorage)
    │   ├── pages/                Route-level components
    │   └── components/           Reusable UI components
    ├── public/_redirects         Render SPA catch-all: `/* /index.html 200`
    └── index.html                Anti-FOUC theme script + SEO meta

```

## Running Locally

```bash
# Backend (from repo root) — activate venv first
source backend/.venv/bin/activate
PYTHONPATH=backend python3 -m uvicorn backend.main:app --reload --port 8000

# Frontend (from frontend/)
npm run dev          # starts on :5173 (proxies /api → :8000)
```

## Environment Variables

| Variable | Where | Value |
|---|---|---|
| `VITE_API_BASE_URL` | Render frontend build env | `https://split-striker.onrender.com/api` |
| `DATABASE_URL` | Render backend env | Neon PostgreSQL connection string (see Render dashboard) |

## Database

- **Production**: Neon PostgreSQL (`DATABASE_URL` env var on Render backend)
- **Local dev**: SQLite (`./split-striker.db`) — used automatically when `DATABASE_URL` is not set
- Data persists across all deploys via Neon — never reset the DB without asking the user

## Tests

```bash
# Backend — 108 tests (38 unit + 70 API integration)
python3 -m pytest backend/tests/ -v

# Frontend — 21 tests (vitest)
cd frontend && npm run test:run
```

Always run tests before pushing.

## Deployment

- **Backend**: Render Web Service — auto-deploys on push to `main`
  - Build: `pip install -r backend/requirements.txt`
  - Start: `python3 -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Frontend**: Render Static Site — auto-deploys on push to `main`
  - Build: `cd frontend && npm install && npm run build`
  - Publish: `frontend/dist`

## Theme System

6 themes (`maroon` default, `forest`, `amber`, `olive`, `teal`, `rust`).
- CSS custom properties on `<html data-theme="...">` drive all colors
- Sidebar always has a dark background (`--sidebar-bg`); page/card bg are light
- All buttons have black text (`--btn-primary-text: #000`)
- Theme saved to `localStorage` key `split_striker_theme`

## Auth / Session

- No passwords — email-only sign-in
- User stored in `localStorage` key `split_striker_user`
- On app load, verifies user still exists via `GET /api/users/:id`
- `ProtectedRoutes` redirects unauthenticated users to `/login?next=<intended-path>`
- After login, app redirects back to `?next=` URL

## Key Rules

- Run both test suites after every code change
- Push only when all tests pass
- Never use `getUsers` — it's `api.getUsers()` (exports from `src/api/client.js` as `api` object)
- `api.loginByEmail(email)` not `api.loginUser(email)`
