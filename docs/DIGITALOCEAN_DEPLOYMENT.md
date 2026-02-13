# DigitalOcean Deployment Guide

Deploy the Vehicle Workshop backend to DigitalOcean App Platform, with frontend on Vercel.

## Overview

- **Backend**: Django API on DigitalOcean App Platform (Docker)
- **Database**: DigitalOcean Managed PostgreSQL
- **Cache/Queue**: DigitalOcean Managed Redis (optional, for Celery)
- **Frontend**: Vercel (React + Vite)
- **API docs**: `https://your-app.ondigitalocean.app/api/schema/docs/`

---

## Prerequisites

- [DigitalOcean account](https://cloud.digitalocean.com)
- GitHub repository connected
- Backend in `backend/`, Dockerfile at repo root

---

## Part 1: Backend on DigitalOcean

### Step 1: Create a New App

1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click **Create App**
3. Select **GitHub** as source, authorize if needed
4. Choose your `Vehicle_Workshop_App` repository and branch (e.g. `main`)

### Step 2: Configure the Web Service

1. App Platform will detect the **Dockerfile** at repo root
2. Set the **Source Directory** to repo root (leave empty or `/`)
3. Under **Resource Type**, ensure it's a **Web Service**
4. **HTTP Port**: `8000`
5. **HTTP Request Routes**: `/` (default)

### Step 3: Add PostgreSQL Database

1. In your app, click **Add Resource** → **Database** → **PostgreSQL**
2. Choose a plan (e.g. Basic, 1 GB)
3. DigitalOcean will create the database and inject `DATABASE_URL` into your app
4. Note the **Connection string** or host/port if you need them for the entrypoint wait

### Step 4: Add Redis (Optional, for Celery)

For Celery (SMS, notifications, scheduled tasks):

1. **Add Resource** → **Database** → **Redis**
2. Choose a plan
3. DigitalOcean injects `REDIS_URL` — use this for `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`

If you skip Redis, the API will run; Celery tasks will fail until Redis is configured.

### Step 5: Set Environment Variables

In your **Web Service** → **Settings** → **App-Level Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `SECRET_KEY` | `openssl rand -hex 32` (generate a secure key) |
| `DEBUG` | `false` |
| `ALLOWED_HOSTS` | `*` or `your-app.ondigitalocean.app,.ondigitalocean.app` |
| `DATABASE_URL` | Injected automatically if you added PostgreSQL |
| `CELERY_BROKER_URL` | From Redis component (e.g. `$redisa.redis.REDIS_URL`) or your Redis URL |
| `CELERY_RESULT_BACKEND` | Same as `CELERY_BROKER_URL` |
| `APP_BASE_URL` | `https://your-app.ondigitalocean.app` (update after deploy) |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` (your Vercel frontend URL) |

**Reference other components:** Use the **Link** option to reference the database’s `DATABASE_URL` and Redis’s `REDIS_URL` from your web service.

**PostgreSQL wait:** The entrypoint waits for Postgres. If using DigitalOcean Managed DB, set:
- `POSTGRES_HOST` = hostname from your DB (e.g. `db-postgresql-xxx.db.ondigitalocean.com`)
- `POSTGRES_PORT` = `25060` (typical for DO Managed DB)

Or parse these from `DATABASE_URL` — the format is `postgres://user:pass@host:port/dbname`.

**Redis wait:** Similarly, set `REDIS_HOST` and `REDIS_PORT` if your Redis is external, or the entrypoint may fail. For DO Redis add-ons, check the connection details.

### Step 6: Deploy

1. Click **Next** and review the plan
2. Click **Create Resources**
3. Wait for the build and deploy (5–10 minutes)
4. After deploy, go to **Settings** → **Domains** — you’ll get a URL like `https://your-app-xxxxx.ondigitalocean.app`

### Step 7: Update URLs and CORS

1. Copy your app URL
2. Update `APP_BASE_URL` to `https://your-app-xxxxx.ondigitalocean.app`
3. Update `CORS_ALLOWED_ORIGINS` to include your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
4. Redeploy if needed (or edit env vars and save)

### Step 8: Run Migrations

Migrations run automatically in `scripts/entrypoint.sh` on startup. If you need to run them manually:

1. Go to your app → **Console** tab (or use **run**)
2. Run: `python manage.py migrate --noinput`

### Step 9: Create Superuser

1. Use the **Console** (or run a one-off command)
2. Run: `python manage.py createsuperuser`
3. Use **email** as the username when prompted

---

## Part 2: Frontend on Vercel

### Step 1: Connect Repository

1. Go to [Vercel](https://vercel.com) and sign in
2. **Add New** → **Project**
3. Import your `Vehicle_Workshop_App` repository

### Step 2: Configure Build

1. **Root Directory**: `frontend`
2. **Framework Preset**: Vite (auto-detected)
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`

### Step 3: Set Environment Variables

Add:

| Variable | Value |
|----------|-------|
| `VITE_API_BASE` | `https://your-app-xxxxx.ondigitalocean.app` |

This is the backend API URL. The frontend uses it for all API requests when set (no trailing slash).

### Step 4: Deploy

1. Click **Deploy**
2. Vercel will build and deploy; you’ll get a URL like `https://your-app.vercel.app`

### Step 5: Update Backend CORS

Add your Vercel URL to `CORS_ALLOWED_ORIGINS` in your DigitalOcean app:

```
https://your-app.vercel.app
```

Redeploy the backend or save env vars to apply the change.

---

## Optional: Celery Worker

For background tasks (SMS, reminders, promotional notifications):

1. In your DigitalOcean app, **Add Resource** → **Worker**
2. Use the same repo and Dockerfile
3. **Run Command**: `celery -A core worker -l info`
4. Share the same env vars as the web service (`DATABASE_URL`, `CELERY_BROKER_URL`, etc.)

For Celery Beat (scheduled tasks):

1. Add another **Worker**
2. **Run Command**: `celery -A core beat -l info`

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check logs; ensure gunicorn binds to `0.0.0.0:8000` |
| Migrations fail | Confirm `DATABASE_URL` is set and DB is reachable |
| CORS errors | Add your Vercel frontend URL to `CORS_ALLOWED_ORIGINS` |
| Static files 404 | `collectstatic` runs in entrypoint; check `STATIC_ROOT` |
| API docs 404 | Ensure `/api/schema/` and `/api/schema/docs/` are in `urls.py` |
| Entrypoint wait fails | Set `POSTGRES_HOST`/`POSTGRES_PORT` and `REDIS_HOST`/`REDIS_PORT` to match your DO DB/Redis connection info |

---

## Cost Notes

- **App Platform**: ~$5–12/month for a basic web service
- **Managed PostgreSQL**: ~$15/month (Basic)
- **Managed Redis**: ~$15/month (Basic) if used
- **Vercel**: Free tier for hobby projects

---

## Quick Reference

**Backend URL:** `https://your-app.ondigitalocean.app`  
**API docs:** `https://your-app.ondigitalocean.app/api/schema/docs/`  
**Frontend URL:** `https://your-app.vercel.app`

See [API_REFERENCE.md](./API_REFERENCE.md) for authentication and endpoint details.
