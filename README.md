# ReClaim

**Find what matters. Return what's lost.**

ReClaim is a smart Lost & Found platform that connects people with their missing items through intelligent matching, real-time chat, and community-driven verification.

---

## Features

- **Smart matching** — Weighted algorithm scores lost/found pairs by category, keywords, GPS proximity, date, attributes, and AI semantic embeddings
- **Claim verification** — Found-item posters set hidden verification hints; only the true owner can answer them
- **Real-time chat** — Socket.io-powered messaging between finders and claimants with typing indicators
- **Multi-image upload** — Up to 5 images per item via Cloudinary CDN
- **Interactive map** — Leaflet + OpenStreetMap for location-based browsing
- **In-app notifications** — Instant push for matches, claims, messages, and status changes
- **Comment threads** — Nested replies on item posts
- **Admin panel** — Full moderation: ban users, approve/reject items, review claims and reports
- **Dark / light mode**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React 18, Tailwind CSS, shadcn/ui (Radix UI), Framer Motion |
| State | Zustand |
| Backend | Node.js, Express 4 |
| Database | PostgreSQL via Prisma ORM (hosted on Supabase) |
| Auth | JWT access tokens (15 min) + refresh tokens (7 days, rotated) |
| Real-time | Socket.io |
| Images | Cloudinary |
| Maps | Leaflet.js + react-leaflet + OpenStreetMap |
| AI Matching | OpenAI `text-embedding-3-small` (optional) |
| Deployment | Vercel + Render + Supabase |

---

## Project Structure

```
reclaim/
├── frontend/                  # Next.js 16 app
│   ├── app/                   # App Router pages
│   │   ├── page.tsx           # Home
│   │   ├── items/             # Browse, detail, new, edit
│   │   ├── search/            # Full-text + filter search
│   │   ├── chat/              # Real-time messaging
│   │   ├── dashboard/         # User dashboard (items, claims, notifications)
│   │   ├── admin/             # Admin panel
│   │   └── auth/              # Login / Register
│   └── components/            # UI components, layout, providers
│
└── backend/                   # Node.js + Express API
    ├── src/
    │   ├── index.js           # Entry point
    │   ├── socket.js          # Socket.io server
    │   ├── routes/            # API route handlers
    │   ├── controllers/       # Auth, items logic
    │   ├── services/          # Matching, embedding, notifications, Cloudinary
    │   ├── middleware/        # JWT auth, validation, error handling
    │   └── lib/prisma.js      # Shared Prisma client singleton
    └── prisma/
        ├── schema.prisma      # Database schema
        └── seed.js            # Seeds the explicitly configured administrator
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database (or a free [Supabase](https://supabase.com) project)
- [Cloudinary](https://cloudinary.com) account (free tier works)
- OpenAI API key _(optional — AI matching degrades gracefully without it)_

### 1. Clone & install

```bash
git clone https://github.com/yourusername/reclaim.git
cd reclaim

# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

### 2. Configure environment variables

**`backend/.env`**
```env
DATABASE_URL=postgresql://user:password@host:5432/reclaim
DIRECT_URL=postgresql://user:password@host:5432/reclaim
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
OPENAI_API_KEY=sk-...          # optional
RESEND_API_KEY=re_...
EMAIL_FROM=ReClaim <no-reply@your-domain.com>
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
ADMIN_EMAIL=admin@reclaim.app
ADMIN_PASSWORD=replace-with-a-unique-strong-password
ADMIN_NAME=ReClaim Admin
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Set up the database

```bash
cd backend
npx prisma migrate deploy
npm run seed
```

This applies committed migrations and seeds the explicitly configured admin account:
- **Email:** `admin@reclaim.app`
- **Password:** set a unique `ADMIN_PASSWORD` (12+ characters) before seeding

Running the seed again rotates that account to the currently configured password.

### 4. Run in development

```bash
# Terminal 1 — backend (port 5000)
cd backend && npm run dev

# Terminal 2 — frontend (port 3000)
cd frontend && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Admin panel | http://localhost:3000/admin |
| API health | http://localhost:5000/api/health |

---

## Matching Algorithm

Each lost/found pair is scored from 0–100:

| Factor | Weight | Method |
|--------|--------|--------|
| Category | 25 | Exact match |
| Keywords | 25 | Jaccard similarity on title + description |
| Location | 20 | Haversine distance (GPS) or label similarity fallback |
| Date | 15 | Exponential decay over 30 days |
| Color + brand | 10 | Exact match per attribute |
| AI embedding | 5 | Cosine similarity (OpenAI embeddings) |

Matches are computed asynchronously after item creation. Pairs scoring ≥ 60 trigger in-app notifications to both parties.

---

## API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login; issue HttpOnly session cookies |
| `POST /api/auth/refresh` | Rotate the HttpOnly refresh token |
| `GET /api/items` | Browse items (filterable by type, category, date, location) |
| `POST /api/items` | Post a new lost/found item |
| `GET /api/matches/:itemId` | Get scored matches for an item |
| `POST /api/claims` | Submit a claim for a found item |
| `GET /api/claims/received` | List claims received by the current user |
| `GET /api/users/me/items` | Private owner item list, including closed statuses |
| `GET /api/chats` | List user's active chats |
| `GET /api/notifications` | List notifications |
| `POST /api/upload/images` | Upload images and receive user-bound upload receipts |
| `GET /api/admin/*` | Admin moderation endpoints (admin role required) |

Full API reference: [`docs/API.md`](docs/API.md)

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, and `NEXT_PUBLIC_SITE_URL` in the Vercel dashboard.

### Backend → Render (free)

The repo includes a `render.yaml` Blueprint — on [render.com](https://render.com)
choose **New → Blueprint** and pick this repo; it pre-fills root dir, build/start
commands, and the health check. Then fill in the secret env vars.

A free GitHub Actions keep-alive (`.github/workflows/keep-alive.yml`) pings the
backend every ~14 min so it never sleeps. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
for the full free-hosting guide (Vercel + Render-free + Supabase, no card required).

### Database → Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy the **PostgreSQL connection string** → `DATABASE_URL`

---

## Default Roles

| Role | Permissions |
|------|------------|
| `USER` | Post items, claim, chat, comment |
| `ADMIN` | All of above + approve/reject items, manage claims/reports, ban users |
| `SUPER_ADMIN` | All of above + promote users to admin |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes
4. Open a pull request

---

## License

MIT
