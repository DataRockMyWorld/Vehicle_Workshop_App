# Configure workshopapi.space (Backend, Server, Frontend)

Domain **workshopapi.space** points to your droplet. Follow these steps in order.

---

## 1. Server: Nginx + SSL (on the droplet)

SSH into the droplet, then:

### 1.1 Update Nginx config to use the domain

If you use the repo’s config:

```bash
cd ~/Vehicle_Workshop_App
git pull   # get latest deploy/nginx.conf with workshopapi.space

sudo cp deploy/nginx.conf /etc/nginx/sites-available/vehicle-workshop
sudo nginx -t && sudo systemctl reload nginx
```

Or edit `/etc/nginx/sites-available/vehicle-workshop` and set:

```nginx
server_name workshopapi.space 165.232.32.207;
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 1.2 Get HTTPS certificate with Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d workshopapi.space
```

- Use a real email for renewal notices.
- Accept the terms.
- Choose “Redirect” so HTTP is redirected to HTTPS.

Certbot will obtain the certificate and adjust Nginx for HTTPS. Test in a browser: **https://workshopapi.space/health/** should return `{"status":"ok"}`.

---

## 2. Backend: Environment variables (on the droplet)

Set these in the place your backend reads env (e.g. `.env` in the project root, or Docker env for the web service). Replace any existing values for these keys.

```bash
ALLOWED_HOSTS=workshopapi.space,165.232.32.207,localhost,127.0.0.1
APP_BASE_URL=https://workshopapi.space
CORS_ALLOWED_ORIGINS=https://vehicle-workshop-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://workshopapi.space,https://vehicle-workshop-app.vercel.app
```

- No spaces, no trailing slashes.
- If you use Docker Compose, restart after editing env:

```bash
cd ~/Vehicle_Workshop_App
docker compose down && docker compose up -d
```

---

## 3. Frontend: Vercel

1. Open [Vercel](https://vercel.com) → your **vehicle-workshop-app** project.
2. **Settings** → **Environment Variables**.
3. Set **VITE_API_BASE** to:
   ```text
   https://workshopapi.space
   ```
   (no trailing slash). Apply to Production (and Preview if you want).
4. **Deployments** → open the **⋯** on the latest deployment → **Redeploy** (so the new API URL is baked into the build).

---

## 4. Quick check

| Check | Command or URL |
|-------|-----------------|
| API health | Open **https://workshopapi.space/health/** in browser → `{"status":"ok"}` |
| Admin | **https://workshopapi.space/admin/** |
| Frontend login | **https://vehicle-workshop-app.vercel.app** → log in (no mixed content) |

---

## Summary

| Where | What |
|-------|------|
| **Server** | Nginx `server_name workshopapi.space`; Certbot `sudo certbot --nginx -d workshopapi.space` |
| **Backend env** | `ALLOWED_HOSTS`, `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` as above |
| **Vercel** | `VITE_API_BASE=https://workshopapi.space`, then redeploy |

After that, the frontend will call **https://workshopapi.space** and login will work without mixed content.
