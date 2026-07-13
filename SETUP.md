# ReClaim — Production Setup & Deployment Guide

> This guide covers everything needed to take ReClaim from a local clone to a fully running production deployment.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Database Setup (Supabase)](#3-database-setup-supabase)
4. [Image Storage (Cloudinary)](#4-image-storage-cloudinary)
5. [AI Matching (OpenAI) — Optional](#5-ai-matching-openai--optional)
6. [Environment Variables Reference](#6-environment-variables-reference)
7. [Backend Deployment (Render)](#7-backend-deployment-render)
8. [Frontend Deployment (Vercel)](#8-frontend-deployment-vercel)
9. [Post-Deployment Checklist](#9-post-deployment-checklist)
10. [Security Hardening](#10-security-hardening)
11. [Maintenance & Monitoring](#11-maintenance--monitoring)

---

## 1. Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18 LTS or 20 LTS | Runtime for both frontend and backend |
| npm | 9+ | Package manager |
| Git | Latest | Version control |
| A Supabase account | Free tier OK | PostgreSQL database |
| A Cloudinary account | Free tier OK | Image uploads and CDN |
| A Vercel account | Free tier OK | Frontend hosting |
| A Render account | Free tier OK | Backend API hosting |

---

## 2. Local Development Setup

### Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/reclaim.git
cd reclaim

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Create environment files

Copy the example files and fill in your values:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

> See [Section 6](#6-environment-variables-reference) for all required variables.

### Run database migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

### Seed the database (optional)

```bash
cd backend
node prisma/seed.js
```

This creates the configured admin account. Set a unique `ADMIN_PASSWORD` (12+ characters) first.
Running the seed again rotates an existing configured admin to that password.

### Start development servers

Open two terminals:

```bash
# Terminal 1 — Backend API (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` to see the app.

---

## 3. Database Setup (Supabase)

### Create a project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to your users (Singapore for Sri Lanka)
3. Set a strong database password (save it securely)
4. Wait ~2 minutes for provisioning

### Get your connection string

1. In your project dashboard → **Settings** → **Database**
2. Under **Connection string**, select **URI**
3. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```

> **Important:** Use port `5432` (direct connection), **not** port `6543` (transaction pooler).  
> Prisma ORM does not work correctly with the transaction pooler for migrations.

### Set the DATABASE_URL

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

### Run migrations against production

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
npx prisma generate
```

### Preventing database pauses (free tier)

Supabase free-tier projects pause after **7 days of inactivity**. To prevent this:
- Upgrade to the Pro plan ($25/month), OR
- Set up a free cron job at [cron-job.org](https://cron-job.org) to ping your API every 24 hours:
  ```
  GET https://your-api.onrender.com/health
  ```

---

## 4. Image Storage (Cloudinary)

### Create a free account

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to your **Dashboard** → note your **Cloud Name**, **API Key**, and **API Secret**

### Environment variables

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Uploads are sent through the authenticated backend and signed server-side. Do not create an unsigned upload preset or expose the API secret to the frontend.

### Allow Cloudinary in Next.js image domains

In `frontend/next.config.js`, the `remotePatterns` section must include:

```js
{
  protocol: 'https',
  hostname: 'res.cloudinary.com',
}
```

This is already configured if you're using the latest version.

---

## 5. AI Matching (OpenAI) — Optional

The AI semantic matching feature uses OpenAI's `text-embedding-3-small` model. It improves match quality by ~5%. The app functions fully without it.

### Get an API key

1. Go to [platform.openai.com](https://platform.openai.com) → **API Keys** → **Create new secret key**
2. Add billing information (very low cost — embeddings are ~$0.00002 per item)

### Environment variable

```env
OPENAI_API_KEY=sk-...
```

If this key is absent or the API call fails, the matching service silently falls back to the keyword-based algorithm.

---

## 6. Environment Variables Reference

### Backend (`backend/.env`)

```env
# ── Application ──────────────────────────────────────
NODE_ENV=production
PORT=5000

# ── Database ─────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"

# ── Authentication ────────────────────────────────────
# Generate strong secrets: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=CHANGE_THIS_TO_64_RANDOM_CHARS
JWT_REFRESH_SECRET=CHANGE_THIS_TO_DIFFERENT_64_RANDOM_CHARS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ── Cloudinary ────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=re_...
EMAIL_FROM=ReClaim <no-reply@your-domain.com>

# ── OpenAI (optional) ─────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Frontend URL (for CORS) ────────────────────────────
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (`frontend/.env.local`)

```env
# ── API ───────────────────────────────────────────────
NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# ── Cloudinary (public — safe to expose) ─────────────
```

> **Never** commit `.env` or `.env.local` files to Git.  
> **Never** put secrets (JWT_SECRET, API keys) in `NEXT_PUBLIC_` variables — they are exposed to the browser.

---

## 7. Backend Deployment (Render)

### Create a Web Service

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
   - **Instance Type:** Free (or Starter for always-on)
   - **Runtime:** Node

### Add environment variables

In the Render dashboard → **Environment** tab, add all variables from [Section 6](#6-environment-variables-reference) for the backend.

### Note on free tier

Render free services spin down after 15 minutes of inactivity. The first request after sleep takes ~30 seconds. To prevent this:
- Upgrade to the **Starter plan** ($7/month), OR
- Use [cron-job.org](https://cron-job.org) to ping `/health` every 10 minutes

### Custom domain (optional)

1. In Render → **Settings** → **Custom Domains** → add your domain
2. Update DNS records as instructed
3. Update `FRONTEND_URL` on Render to use the custom domain

---

## 8. Frontend Deployment (Vercel)

### Deploy via CLI

```bash
cd frontend
npx vercel --prod
```

### Deploy via GitHub (recommended)

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Next.js — no build command needed
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` → your Render backend URL with `/api`
   - `NEXT_PUBLIC_SOCKET_URL` → your Render backend origin
   - `NEXT_PUBLIC_SITE_URL` → your canonical frontend origin

### Custom domain

1. Vercel dashboard → **Domains** → Add your domain
2. Update DNS at your registrar as instructed
3. After domain is live, update `FRONTEND_URL` in your Render environment variables

---

## 9. Post-Deployment Checklist

```
[ ] Set and securely store a unique `ADMIN_PASSWORD` before seeding
[ ] Set strong JWT_SECRET and JWT_REFRESH_SECRET (64+ random chars each)
[ ] Verify database migrations ran successfully
[ ] Test user registration and login
[ ] Test posting a lost item with image upload
[ ] Test posting a found item
[ ] Verify AI matching runs (check backend logs)
[ ] Test real-time chat (Socket.io connection)
[ ] Verify map displays on item detail pages
[ ] Test claim submission and approval flow
[ ] Verify admin dashboard loads and shows real stats
[ ] Test admin: ban user, approve/reject item, resolve report
[ ] Set up database backup (Supabase → Settings → Backups)
[ ] Add monitoring (Render provides basic metrics)
[ ] Set up error tracking (e.g. Sentry — free tier available)
```

---

## 10. Security Hardening

### Generate production secrets

```bash
# Run this in Node.js — generates two independent 64-char hex secrets
node -e "
const c = require('crypto');
console.log('JWT_SECRET=' + c.randomBytes(64).toString('hex'));
console.log('JWT_REFRESH_SECRET=' + c.randomBytes(64).toString('hex'));
"
```

### CORS

The backend only allows requests from `FRONTEND_URL`. In production, set this to your exact Vercel domain:

```env
FRONTEND_URL=https://reclaim.vercel.app
```

### Rate limiting

The backend uses `express-rate-limit`. Default: 100 requests per 15 minutes per IP. Adjust in `backend/src/index.js` if needed.

### HTTPS

Both Vercel and Render provide free TLS certificates automatically. Do **not** serve the app over plain HTTP in production.

### Database

- Enable Row Level Security in Supabase for extra protection
- Do not expose the `DATABASE_URL` publicly
- Use the direct connection URL (port 5432), not the pooler

### Content Security

- All uploaded images are served from Cloudinary CDN (no direct disk storage)
- Passwords are hashed with bcrypt (cost factor 12)
- JWT tokens expire after 15 minutes; refresh tokens expire after 7 days

---

## 11. Maintenance & Monitoring

### Health check endpoint

```
GET /health
```

Returns `{ status: 'ok', uptime: ... }`. Use this for uptime monitoring.

### Database maintenance

Prisma does **not** auto-clean disconnected clients. If you see connection pool errors:
1. Verify only one `PrismaClient` instance exists (check `backend/src/lib/prisma.js`)
2. Restart the Render service
3. Check Supabase connection limits (free tier: 20 concurrent)

### Logs

- Backend: Render dashboard → **Logs** tab
- Frontend: Vercel dashboard → **Functions** → **Logs**

### Updating the app

```bash
# 1. Make changes locally and test
# 2. Push to main branch
git push origin main

# Render and Vercel auto-deploy on push to main
```

### Database schema changes

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name describe_your_change

# Deploy to production
npx prisma migrate deploy
```

---

## Quick Reference

| Service | URL | Purpose |
|---------|-----|---------|
| Supabase | supabase.com | Database |
| Cloudinary | cloudinary.com | Image CDN |
| Render | render.com | Backend API |
| Vercel | vercel.com | Frontend |
| OpenAI | platform.openai.com | AI Matching (optional) |

---

*For questions or issues, contact support@reclaim.app*
