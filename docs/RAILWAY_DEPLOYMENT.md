# Railway Deployment Guide

Deploy the Vehicle Workshop app to Railway for testing outside your local environment.

## Overview

- **Backend**: Django API, Celery worker, Celery beat (optional for reminders/promos)
- **Database**: Railway PostgreSQL
- **Cache/Queue**: Railway Redis
- **API docs**: Available at `https://your-app.railway.app/api/schema/docs/`

---

## Prerequisites

- [Railway account](https://railway.app)
- GitHub repo connected
- Railway CLI (optional): `npm i -g @railway/cli`

---

## Step 1: Create a New Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. **New Project** → **Deploy from GitHub repo**
3. Select your `Vehicle_Workshop_App` repository
4. Railway will detect the Dockerfile

---

## Step 2: Add PostgreSQL and Redis

1. In your project, click **+ New** → **Database** → **PostgreSQL**
2. Click **+ New** → **Database** → **Redis**
3. Note the generated `DATABASE_URL` and `REDIS_URL` (or `CELERY_BROKER_URL`) from each service’s **Variables** tab

---

## Step 3: Configure Backend Service

1. Click your **web** (or main) service
2. Go to **Variables** and add:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | Use `openssl rand -hex 32` |
| `DEBUG` | `false` |
| `ALLOWED_HOSTS` | `*` or `your-app.railway.app,.railway.app` |
| `DATABASE_URL` | From PostgreSQL service (Railway links it automatically if you add the reference) |
| `CELERY_BROKER_URL` | From Redis service |
| `CELERY_RESULT_BACKEND` | Same as Redis URL |
| `APP_BASE_URL` | `https://your-app.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.railway.app,https://your-frontend.vercel.app` (add your frontend URL if split) |

3. **Reference variables** from Postgres/Redis:
   - In Variables, use **Add Reference** → choose `DATABASE_URL` from PostgreSQL
   - Same for Redis → `REDIS_URL` or `CELERY_BROKER_URL`

---

## Step 4: Root Directory (Monorepo)

The repo has `backend/` (Django) and `frontend/` (React). The `Dockerfile` at repo root copies `backend/` into the container.

1. Service **Settings** → **Root Directory**: leave empty (or `/` for repo root)
2. Railway uses the `Dockerfile` at the repo root

---

## Step 5: Deploy

1. Push to `main` or `master` to trigger a deploy
2. After build, go to **Settings** → **Networking** → **Generate Domain**
3. Your API will be at `https://<generated>.railway.app`

---

## Step 6: Run Migrations

Migrations run automatically in `scripts/entrypoint.sh`. If you need to run them manually:

```bash
railway run python manage.py migrate
```

Or use Railway’s **Shell** from the service.

---

## Step 7: Create a Superuser

```bash
railway run python manage.py createsuperuser
```

Or use the Railway Shell and run the same command.

---

## API Documentation

After deployment, your APIs are documented at:

- **OpenAPI (JSON)**: `https://your-app.railway.app/api/schema/`
- **Swagger UI**: `https://your-app.railway.app/api/schema/docs/`

Use Swagger UI to explore endpoints and test with JWT: click **Authorize**, enter your `access` token (from `/auth/login/`), then try endpoints. See [API_REFERENCE.md](./API_REFERENCE.md) for details.

---

## Optional: Frontend Deployment

### Option A: Serve frontend from Django (single service)

Build the frontend and serve it from Django. Requires Dockerfile changes to build the frontend and copy `dist/` into static files. See `Dockerfile` comments or a separate `Dockerfile.full` if added.

### Option B: Deploy frontend to Vercel

1. Push frontend to Vercel (or connect the same repo)
2. Set **Root Directory** to `frontend`
3. Add env var: `VITE_API_BASE=https://your-app.railway.app`
4. Ensure the frontend uses `VITE_API_BASE` for API requests (see `frontend/src/api/client.ts`)

---

## Optional: Celery Worker

For background tasks (SMS, reminders, notifications):

1. Add a new service from the same repo
2. Set **Start Command**: `celery -A core worker -l info`
3. Use the same `DATABASE_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` as the web service

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check logs; ensure gunicorn binds to `0.0.0.0:8000` |
| Migrations fail | Confirm `DATABASE_URL` is set and reachable |
| CORS errors | Add your frontend origin to `CORS_ALLOWED_ORIGINS` |
| Static files 404 | `collectstatic` runs in entrypoint; check `STATIC_ROOT` |
| API docs 404 | Ensure `/api/schema/` and `/api/schema/docs/` are in `urls.py` |

---

## Cost Notes

- PostgreSQL and Redis consume from your Railway usage
- Typical small deploy: ~$5–15/month
- Set usage limits in Railway **Settings** → **Usage**
