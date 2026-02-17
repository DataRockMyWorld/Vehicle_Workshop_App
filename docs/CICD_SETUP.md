# CI/CD Setup (GitHub → Backend + Frontend)

## Overview

| Part | Trigger | What happens |
|------|---------|--------------|
| **CI** | Every push/PR to `main` or `master` | Runs backend tests, frontend tests, E2E tests |
| **Deploy Backend** | Push to `main`/`master` (and manual) | SSHs to droplet, pulls code, rebuilds Docker, restarts |
| **Frontend** | Push to `main`/`master` | Vercel auto-deploys when repo is connected |

---

## 1. Frontend (Vercel) – already automatic

Once the repo is connected in Vercel with **Root Directory** = `frontend`:

- Every push to the production branch triggers a new deployment.
- No extra setup. Optional: add a **custom domain** in Vercel (e.g. workshop.space).

---

## 2. Backend – one-time setup

### 2.1 On the droplet: deploy user and SSH key

SSH into the server and create a key pair for GitHub Actions (or use an existing deploy key):

```bash
ssh codebond@165.232.32.207   # or your deploy user

# Generate a key for GitHub Actions (no passphrase so the workflow can use it)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy -N ""

# Add the public key to authorized_keys so this key can log in
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Show the **private** key once (you’ll paste it into GitHub Secrets):

```bash
cat ~/.ssh/github_deploy
```

Copy the entire output (including `-----BEGIN ... KEY-----` and `-----END ... KEY-----`).

### 2.2 Ensure the repo is on the server

On the droplet:

```bash
cd ~
git clone https://github.com/YOUR_ORG/Vehicle_Workshop_App.git
cd Vehicle_Workshop_App
# Add .env, then run docker compose up -d as you did for initial setup
```

If the repo is already there (e.g. under `~/Vehicle_Workshop_App`), no need to clone again. Note the full path; you’ll use it as `DEPLOY_PATH` if it’s not `~/Vehicle_Workshop_App`.

### 2.3 GitHub repository secrets

In GitHub: **Repository** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add:

| Secret name | Value |
|-------------|--------|
| `DEPLOY_HOST` | Droplet host: `165.232.32.207` or `workshopapi.space` |
| `DEPLOY_USER` | SSH user, e.g. `codebond` |
| `DEPLOY_SSH_KEY` | Full contents of the **private** key (`~/.ssh/github_deploy`) |
| `DEPLOY_PATH` | (Optional) App directory on the server, e.g. `/home/codebond/Vehicle_Workshop_App`. Omit to use `~/Vehicle_Workshop_App` |

`DEPLOY_PATH` is only needed if the app is not in `~/Vehicle_Workshop_App`.

### 2.4 (Optional) Deploy only when CI passes

In GitHub: **Settings** → **Branches** → **Branch protection rules** → add/edit rule for `main` (or `master`):

- Enable **Require status checks before merging**.
- Select **Backend tests** and **Frontend tests** (and **E2E tests** if you want).
- Merge only when CI is green; then pushes to `main` will always have passed CI before deploy runs.

---

## 3. What runs

- **Push or PR to `main`/`master`**  
  - **CI** workflow runs (backend + frontend + E2E tests).

- **Push to `main`/`master`** (after you added secrets):  
  - **Deploy Backend** workflow runs: SSH → `git fetch` / `git reset` to the **branch that triggered the run** → `docker compose build web` (single image reused for web, celery, celery-beat) → `docker compose up -d` → `migrate`. If migrations fail, the deploy fails (no silent ignore).  
  - **Vercel** builds and deploys the frontend.

- **Manual deploy**  
  - In the repo: **Actions** → **Deploy Backend** → **Run workflow**.

---

## 4. Troubleshooting

| Problem | Check |
|--------|--------|
| Deploy workflow fails on SSH | `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` correct; server has the public key in `authorized_keys`. |
| Deploy fails on `cd` or `git` | Repo exists at `DEPLOY_PATH` (or `~/Vehicle_Workshop_App`); user can read the directory and run `git`. |
| Deploy fails on `docker compose` | User is in the `docker` group or can run `docker`/`docker compose`; `.env` exists in the app directory. |
| Build fails on server | Dockerfile and `docker-compose.yml` work locally; server has enough disk and memory. |

To test SSH from your machine:

```bash
ssh -i /path/to/github_deploy codebond@165.232.32.207 "cd ~/Vehicle_Workshop_App && git status"
```

If that works, the same key and user will work from GitHub Actions once the secrets are set.

---

## 5. Later: build in GitHub, pull on droplet (Fix 4)

When you’re ready to speed up deploys further, you can move to **build in GitHub → push to registry → droplet only pulls**. The server then never compiles anything. Deferred until the current flow (single image, migrations, branch) is stable. When you come back to it, the steps are:

- A workflow job that builds the image, tags it (e.g. `ghcr.io/OWNER/repo:latest`), and pushes using `GITHUB_TOKEN` or a PAT.
- On the droplet: `docker compose pull` (and logging in to GHCR if the image is private).
- `docker-compose.yml` (or an override) using the registry image for `web`/`celery`/`celery-beat` instead of `build: .` when deploying from the registry.
