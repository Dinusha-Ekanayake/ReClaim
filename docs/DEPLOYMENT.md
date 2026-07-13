# ReClaim — Deployment Guide

## Overview

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Vercel | Free (no card) |
| Backend API | Render (free web service) | Free (no card) |
| Database | Supabase | Free (no card) |
| Keep-alive | GitHub Actions cron | Free |
| Image Storage | Cloudinary | Free |
| AI Matching | OpenAI | Pay-per-use (optional) |

> **100% free, no card required.** Render's free *web service* runs indefinitely
> — only Render's *database* product expires after ~30 days, and we don't use it
> (the DB is Supabase). The one trade-off is that a free Render service sleeps
> after ~15 min idle (≈50 s cold start on the next request). The included
> GitHub Actions keep-alive (`.github/workflows/keep-alive.yml`) pings it every
> ~14 min to avoid that **and** keeps Supabase from pausing.

---

## 1. Database — Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users
3. Copy the **Connection String** (Settings → Database → URI)
   - Use the "Transaction" pooler URL for serverless
4. Add to `backend/.env`:
   ```
   DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
   ```

---

## 2. Image Storage — Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com) → Sign up free
2. Dashboard → Copy **Cloud Name**, **API Key**, **API Secret**
3. Add to `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

---

## 3. Backend — Render (free web service)

This repo includes a `render.yaml` **Blueprint**, so the easiest path is:

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New → Blueprint** → pick this repo.
3. Render reads `render.yaml` and pre-fills everything (root dir `backend`,
   build/start commands, health check, free plan).
4. Fill in the secret env vars it marks as required (the `sync: false` ones:
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, Cloudinary
   keys, `OPENAI_API_KEY`, and `FRONTEND_URL`).
5. Deploy → copy the service URL (e.g. `https://reclaim-api.onrender.com`).

**Manual setup (if you prefer not to use the Blueprint):**
- **Root Directory**: `backend`
- **Build Command**: `npm ci && npx prisma generate && npx prisma migrate deploy`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health`

> Keep production schema changes in committed Prisma migrations. Do not use
> `prisma db push` against production because it bypasses migration history.

---

## 4. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`  ← important: set this so Vercel builds the app, not the repo root
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://reclaim-api.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://reclaim-api.onrender.com
   ```
5. Deploy → your site is live!

---

## 5. Keep-alive (prevents cold starts + DB pause) — free

The repo ships `.github/workflows/keep-alive.yml`, which pings the backend every
~14 min so the free Render service never sleeps and Supabase never pauses.

1. In your GitHub repo: **Settings → Secrets and variables → Actions → Variables**.
2. Add a **repository variable** named `BACKEND_URL` = your Render URL
   (e.g. `https://reclaim-api.onrender.com`, no trailing slash).
3. (Optional) Trigger it once manually: **Actions → Keep backend warm → Run workflow**.

---

## 6. Post-Deployment Checklist

```bash
# Seed or rotate the configured admin (from Render Shell or locally against Supabase)
cd backend
node prisma/seed.js

# Test the API health
curl https://reclaim-api.onrender.com/api/health
```

> The Render build runs `prisma migrate deploy`. If you disable automatic
> deploys, run it manually before starting the updated backend.

### Update CORS on backend
Set `FRONTEND_URL` on Render to your Vercel URL. It accepts a **comma-separated
list**, so include preview domains if you use them:
```
FRONTEND_URL=https://your-project.vercel.app,https://your-project-git-dev.vercel.app
```

### Verify the configured admin
1. Log in at `your-project.vercel.app/auth/login`
   - Email: `admin@reclaim.app`
   - Password: the unique `ADMIN_PASSWORD` configured for this environment
2. Go to `/admin` → verify admin panel works
3. To rotate the password, update `ADMIN_PASSWORD` and run the seed again

---

## 7. Custom Domain (Optional)

**Frontend (Vercel):**
- Project Settings → Domains → Add your domain
- Point DNS: `CNAME your-domain.com → cname.vercel-dns.com`

**Backend (Render):**
- Service Settings → Custom Domains → Add domain
- Point DNS: `CNAME api.your-domain.com → [render-url]`

---

## 8. Environment Variables Reference

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://...   # Supabase pooled (Transaction) URL
DIRECT_URL=postgresql://...     # Supabase direct URL (for migrations)
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<64-char random string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=sk-...       # optional
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-project.vercel.app
ADMIN_EMAIL=admin@reclaim.app
ADMIN_PASSWORD=<unique-password-with-at-least-12-characters>
ADMIN_NAME=ReClaim Admin
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://reclaim-api.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://reclaim-api.onrender.com
```

---

## Generating Secure Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice to get two different secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET`.
