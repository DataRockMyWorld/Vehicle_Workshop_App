# Nginx Setup for Vehicle Workshop API

Use Nginx as a reverse proxy in front of the Django API on your droplet. This lets you:

- Serve the API on port 80 (and optionally 443 for HTTPS)
- Stop exposing port 8000 directly (optional, for security)
- Add SSL with Let's Encrypt later (Certbot)

## Prerequisites

- Django app running in Docker on port 8000 (e.g. `curl http://127.0.0.1:8000/health/` returns `{"status": "ok"}`)
- If using a domain: add it to `ALLOWED_HOSTS` in `.env` (e.g. `ALLOWED_HOSTS=localhost,127.0.0.1,web,0.0.0.0,your-domain.com`)

## Install Nginx

```bash
sudo apt update
sudo apt install -y nginx
```

## Configure Nginx

1. Copy the project config and replace the placeholder with your domain or IP:

   ```bash
   cd ~/Vehicle_Workshop_App
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/vehicle-workshop
   sudo sed -i 's/YOUR_DOMAIN_OR_IP/your-domain.com/g' /etc/nginx/sites-available/vehicle-workshop
   ```

   Or use your server's IP if you don't have a domain yet:
   ```bash
   sudo sed -i 's/YOUR_DOMAIN_OR_IP/165.232.32.207/g' /etc/nginx/sites-available/vehicle-workshop
   ```

2. Enable the site and disable the default site (optional):

   ```bash
   sudo ln -sf /etc/nginx/sites-available/vehicle-workshop /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```

3. Test and reload:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

4. Ensure Nginx starts on boot:

   ```bash
   sudo systemctl enable nginx
   ```

## Verify

```bash
curl http://YOUR_DOMAIN_OR_IP/health/
# Expected: {"status":"ok"}
```

## Stop Exposing Port 8000 (Optional)

If you want only Nginx to receive traffic (port 80), stop publishing port 8000 in `docker-compose.yml`:

- Change `ports: - "${WEB_PORT:-8000}:8000"` to `ports: []` (or remove the line)
- Django will still run on 8000 inside the container; Nginx on the host will proxy to `127.0.0.1:8000`

If you do this, ensure your `web` service is on the same host as Nginx so `127.0.0.1:8000` is reachable. Restart: `docker compose up -d`.

## Add HTTPS with Let's Encrypt (Optional)

Once you have a domain pointing to your droplet:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Certbot will update the Nginx config and set up automatic certificate renewal.
