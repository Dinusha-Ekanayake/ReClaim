# ReClaim — Deployment Guide

## Overview

| Service | Platform | Cost |
|---------|----------|------|
| Frontend | Vercel | Free |
| Backend API | Render | Free (or $7/mo) |
| Database | Supabase | Free |
| Image Storage | Cloudinary | Free |
| AI Matching | OpenAI | Pay-per-use (optional) |

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

## 3. Backend — Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Add all environment variables from `backend/.env.example`
6. Deploy → copy the service URL (e.g. `https://reclaim-api.onrender.com`)

---

## 4. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://reclaim-api.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://reclaim-api.onrender.com
   ```
5. Deploy → your site is live!

---

## 5. Post-Deployment Checklist

```bash
# Run database migrations on Render (via shell)
cd backend
npx prisma migrate deploy
node prisma/seed.js   # creates default admin

# Test the API health
curl https://reclaim-api.onrender.com/api/health
```

### Update CORS on backend
In `backend/.env` on Render:
```
FRONTEND_URL=https://your-project.vercel.app
```

### Change default admin password
1. Log in at `your-project.vercel.app/auth/login`
   - Email: `admin@reclaim.app`
   - Password: `Admin@123`
2. Go to `/admin` → verify admin panel works
3. **Change the password immediately** via Settings

---

## 6. Custom Domain (Optional)

**Frontend (Vercel):**
- Project Settings → Domains → Add your domain
- Point DNS: `CNAME your-domain.com → cname.vercel-dns.com`

**Backend (Render):**
- Service Settings → Custom Domains → Add domain
- Point DNS: `CNAME api.your-domain.com → [render-url]`

---

## 7. Environment Variables Reference

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://...
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
ADMIN_PASSWORD=Admin@123
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
