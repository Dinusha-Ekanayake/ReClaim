# ReClaim — Deployment Guide

## Overview

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Vercel | Plan-dependent |
| Backend API | Render web service | Plan-dependent |
| Database | Supabase | Plan-dependent |
| Optional health schedule | GitHub Actions cron | Subject to Actions quotas/scheduling |
| Image Storage | Cloudinary | Plan-dependent |
| AI Matching | OpenAI | Pay-per-use (optional) |

Provider pricing, quotas, cold-start behavior, and inactivity policies change.
Verify the current terms for each selected plan before launch. The included
GitHub Actions health schedule is best-effort monitoring traffic only; cron
execution can be delayed or skipped, and it does not guarantee an always-on
backend or prevent a database provider from pausing a project.

---

## 1. Database — Supabase

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your users
3. Copy both connection strings needed by the application:
   - `DATABASE_URL`: the pooled runtime connection (the transaction pooler is appropriate for normal application queries).
   - `DIRECT_URL`: a migration-capable direct connection. For Render + Supabase, use the IPv4-compatible Supavisor **session** pooler on port 5432 when the direct host is IPv6-only; never use the transaction pooler on port 6543 for Prisma DDL.
4. Add both to `backend/.env`:
   ```
   DATABASE_URL="postgresql://runtime-pooler/..."
   DIRECT_URL="postgresql://direct-or-session-pooler/..."
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

## 3. Backend — Render web service

This repo includes a `render.yaml` **Blueprint**, so the easiest path is:

1. Push your code to GitHub.
2. Go to [render.com](https://render.com) → **New → Blueprint** → pick this repo.
3. Render reads `render.yaml` and pre-fills everything (root dir `backend`,
   build/start commands, health check, free plan).
4. Fill in the secret env vars it marks as required (the `sync: false` ones:
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `UPLOAD_RECEIPT_SECRET`, Cloudinary keys, `RESEND_API_KEY`, `EMAIL_FROM`,
   `OPENAI_API_KEY`, and `FRONTEND_URL`).
5. Deploy → copy the service URL (e.g. `https://reclaim-api.onrender.com`).

`RESEND_API_KEY` and an `EMAIL_FROM` address on a verified sender/domain are
mandatory for a usable production registration flow. New accounts cannot sign
in until their email is verified; the production API never exposes a fallback
verification link. Verify provider delivery before opening registration.

**Manual setup (if you prefer not to use the Blueprint):**
- **Root Directory**: `backend`
- **Build Command**: `npm ci --include=dev && npx prisma generate && npx prisma migrate deploy`
- **Start Command**: `npm start`
- **Health Check Path**: `/api/health/ready`

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
   # Server-side Next.js rewrite target; include /api.
   NEXT_PUBLIC_API_URL=https://reclaim-api.onrender.com/api
   # Direct Socket.IO origin; omit /api.
   NEXT_PUBLIC_SOCKET_URL=https://reclaim-api.onrender.com
   NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
   ```
   REST calls from the browser stay on the Vercel origin at `/api`; Next.js
   proxies them to `NEXT_PUBLIC_API_URL`. This is required for the backend's
   HttpOnly `SameSite=Lax` session cookies to remain first-party. Do not point
   browser fetches directly at the Render origin.
5. Deploy → your site is live!

---

## 5. Optional best-effort health schedule

The repo ships `.github/workflows/keep-alive.yml`, which pings the backend every
~14 minutes when GitHub Actions scheduling and repository quotas allow it. This
can reduce some cold starts, but it is not a liveness monitor: non-200 responses
do not fail the workflow and no alerts are sent. It is not an uptime guarantee
and must not be relied on to keep a service or database continuously active.
Choose an always-on hosting plan and independent monitoring when production
availability has an SLA.

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

The current release requires the complete committed migration chain through
`20260713230000_single_approved_claim_per_item`. It adds the production indexes,
durable upload and matching workflows, email verification, moderation revision
guards, evidence-preserving item removal, item/chat referential integrity, and a
database-enforced maximum of one approved claim per item. The updated backend
must not start before every migration succeeds.

### Exercise the user journey
1. Register a fresh non-admin account and confirm the verification email arrives.
2. Follow the link, then sign in and verify refresh/logout behavior in the deployed browser.
3. Submit a report and confirm it is visible to its owner but absent from public listings.
4. Approve the report as an administrator and confirm it becomes public and the matching worker clears its pending job.
5. Test password-reset delivery from the deployed origin.

### Update CORS on backend
Set `FRONTEND_URL` on Render to your Vercel URL. It accepts a **comma-separated
list**, so include preview domains if you use them:
```
FRONTEND_URL=https://your-project.vercel.app,https://your-project-git-dev.vercel.app
```

### Verify the configured admin
1. Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique 12–72 byte `ADMIN_PASSWORD` in the environment, then run the seed explicitly.
2. Log in at `your-project.vercel.app/auth/login` with those private values.
3. Go to `/admin` → verify admin panel works.
4. To rotate the password, update `ADMIN_PASSWORD` and run the seed again.

ReClaim does not ship or publish working administrator credentials.

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
DATABASE_URL=postgresql://...   # pooled runtime URL
DIRECT_URL=postgresql://...     # migration-capable direct/session URL, never transaction mode
JWT_SECRET=<64-char random string>
JWT_REFRESH_SECRET=<64-char random string>
UPLOAD_RECEIPT_SECRET=<third distinct 64-char random string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=sk-...       # optional
RESEND_API_KEY=re_...       # required: verification + password reset
EMAIL_FROM=ReClaim <no-reply@your-domain.com> # verified sender/domain
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-project.vercel.app
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=<unique-password-with-at-least-12-characters>
ADMIN_NAME=Your Name
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://reclaim-api.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://reclaim-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
```

`NEXT_PUBLIC_API_URL` is consumed by the Next.js server rewrite even though its
name is public. Client REST code uses only `/api`; `NEXT_PUBLIC_SOCKET_URL` is the
separate direct WebSocket origin.

---

## Generating Secure Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run three times to get different secrets for `JWT_SECRET`,
`JWT_REFRESH_SECRET`, and `UPLOAD_RECEIPT_SECRET`.
