# ReClaim

**Find what matters. Return what's lost.**

ReClaim is a smart Lost & Found platform that connects people with their missing items through intelligent matching, real-time chat, and community-driven verification.

---

## Features

- **Smart matching** — Weighted algorithm scores lost/found pairs by category, keywords, GPS proximity, date, attributes, and AI semantic embeddings
- **Verified accounts** — New users must verify their email address before signing in
- **Claim verification** — Found-item posters publish ownership questions; answers stay inside the authenticated claimant/finder/admin workflow
- **Real-time chat** — Socket.io-powered messaging between finders and claimants with typing indicators
- **Multi-image upload** — Up to 5 images per item via Cloudinary CDN
- **Interactive map** — Leaflet + OpenStreetMap for location-based browsing
- **In-app notifications** — Instant push for matches, claims, messages, and status changes
- **Comment threads** — Nested replies on item posts
- **Moderated reports** — New and materially edited reports remain private until an administrator approves them
- **Admin panel** — Moderation tools to ban users, approve/reject items, and review claims and reports
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
│   │   ├── search/            # Legacy redirect that preserves filters in /items
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

- Node.js 20.9+ (use a current Node.js LTS release)
- PostgreSQL database (or a free [Supabase](https://supabase.com) project)
- [Cloudinary](https://cloudinary.com) account (free tier works)
- [Resend](https://resend.com) account and verified sender/domain for production email verification and password resets
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
DIRECT_URL=postgresql://user:password@migration-host:5432/reclaim
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
UPLOAD_RECEIPT_SECRET=another-distinct-secret-key
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
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=replace-with-a-unique-strong-password
ADMIN_NAME=Your Name
```

**`frontend/.env.local`**
```env
# Server-side Next.js rewrite target; include the backend /api suffix.
NEXT_PUBLIC_API_URL=http://localhost:5000/api
# Socket.io origin; do not include /api.
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Browser REST requests use the frontend's same-origin `/api` path. Next.js
rewrites that path to `NEXT_PUBLIC_API_URL` on the server, allowing the
HttpOnly `SameSite=Lax` session cookies to remain first-party. Do not configure
browser code to call the backend API origin directly. Socket.IO still uses
`NEXT_PUBLIC_SOCKET_URL` and authenticates with the in-memory access token.

Production registration requires a working `RESEND_API_KEY` and an
`EMAIL_FROM` address on a verified sender/domain. New users cannot sign in until
they follow the verification link. In development only, if email delivery is
unavailable, the registration/resend response includes a `devVerificationUrl`;
the production API never exposes that bearer link in its response.

### 3. Set up the database

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run seed
```

`DATABASE_URL` is the pooled runtime connection. `DIRECT_URL` must be a
migration-capable direct connection, or the IPv4-compatible Supavisor **session**
pooler on port 5432 when deploying Render with Supabase. Do not use the
transaction pooler on port 6543 for Prisma migrations.

The committed migration chain through
`20260713230000_single_approved_claim_per_item` includes production query
indexes, durable single-use upload receipts, public/private location separation,
email verification, moderation defaults, durable matching jobs and stable
ranking, evidence-preserving item removal, chat referential integrity, and the
one-approved-claim database invariant. Apply the complete chain before starting
this application version.

Seeding is optional and creates or rotates only the administrator explicitly
configured with `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique `ADMIN_PASSWORD` of
12–72 bytes. The project does not publish working administrator credentials.

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
| Date | 15 | Fixed proximity buckets: same day, ≤1, ≤3, ≤7, ≤14, or ≤30 days |
| Color + brand | 10 | Exact match per attribute |
| AI embedding | 5 | Cosine similarity (OpenAI embeddings) |

New and materially edited reports remain hidden from public listings while they
await administrator review. Approval queues a durable asynchronous matching
job. Pairs scoring ≥ 60 trigger in-app notifications to both parties.

---

## API Overview

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/register` | Create an unverified account and send a verification link |
| `POST /api/auth/verify-email` | Verify an email address with its single-use token |
| `POST /api/auth/resend-verification` | Request another verification link |
| `POST /api/auth/login` | Login after verification; issue HttpOnly session cookies |
| `POST /api/auth/refresh` | Rotate the HttpOnly refresh token |
| `GET /api/items` | Browse items (filterable by type, category, date, location) |
| `POST /api/items` | Submit a new lost/found report for moderation |
| `GET /api/matches/:itemId` | Get scored matches for an item |
| `POST /api/claims` | Submit a claim for a found item |
| `GET /api/claims/received` | List claims received by the current user |
| `GET /api/users/me/items` | Private owner item list, including closed statuses |
| `POST /api/users/me/avatar` | Upload or replace the current user's avatar |
| `GET /api/chats` | List user's active chats |
| `GET /api/notifications` | List notifications |
| `POST /api/upload/images` | Upload images and receive one-hour, user-bound, single-use receipts |
| `GET /api/admin/*` | Admin moderation endpoints (admin role required) |

Full API reference: [`docs/API.md`](docs/API.md)

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set `NEXT_PUBLIC_API_URL` to the backend API origin including `/api` (the
server-side rewrite target), `NEXT_PUBLIC_SOCKET_URL` to the backend origin, and
`NEXT_PUBLIC_SITE_URL` to the canonical frontend origin in the Vercel dashboard.

### Backend → Render (free)

The repo includes a `render.yaml` Blueprint — on [render.com](https://render.com)
choose **New → Blueprint** and pick this repo; it pre-fills root dir, build/start
commands, and the health check. Then fill in the secret env vars.

The optional GitHub Actions keep-alive (`.github/workflows/keep-alive.yml`) makes
best-effort health requests on a schedule. It deliberately does not fail or
alert on non-200 responses, and hosted runners/provider scheduling are not
guaranteed, so the backend may still cold-start or a database may pause. Use
always-on hosting plus independent uptime monitoring when that SLA matters. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full guide.

### Database → Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Configure a pooled runtime URL as `DATABASE_URL`
3. Configure a migration-capable direct or session-pooler URL as `DIRECT_URL`

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
