# ReClaim — CLAUDE.md

Smart Lost & Found platform for Sri Lanka. Users post lost/found items; the system matches them using a weighted scoring algorithm (category, keywords, location, date, attributes, AI embeddings) and facilitates claims, real-time chat, and admin moderation.

## Project Structure

```
reclaim/
├── backend/                  # Node.js + Express + Prisma
│   ├── src/
│   │   ├── index.js          # Entry point: Express setup, rate limiting, Socket.io init
│   │   ├── socket.js         # Socket.io server (chat, notifications, typing)
│   │   ├── routes/           # Route definitions (index.js wires all routes)
│   │   │   ├── index.js      # Mounts all sub-routers under /api
│   │   │   ├── auth.js       # register, login, refresh, logout, me
│   │   │   ├── items.js      # CRUD + status patch; GET is public via optionalAuth
│   │   │   ├── users.js      # Public profile, PATCH /me, POST /me/avatar
│   │   │   │                 # ⚠ PATCH /me is defined BEFORE GET /:id (order matters!)
│   │   │   ├── matches.js    # Get/refresh matches (owner or admin only)
│   │   │   ├── chats.js      # List chats, get messages (paginated), create chat
│   │   │   ├── claims.js     # Submit claim, list by item, list mine, approve/reject
│   │   │   ├── comments.js   # CRUD on item comments (nested replies via parentId)
│   │   │   ├── notifications.js  # List (paginated), mark read, mark-all-read
│   │   │   ├── reports.js    # POST only — submit a report
│   │   │   ├── upload.js     # POST/DELETE /images (5 max) → durable Cloudinary receipts
│   │   │   └── admin.js      # Admin moderation: users, items, claims, reports, stats
│   │   ├── controllers/
│   │   │   ├── authController.js   # register, login, refresh, logout, me
│   │   │   └── itemsController.js  # list, getOne, create, update, remove, updateStatus
│   │   ├── middleware/
│   │   │   ├── auth.js             # authenticate, optionalAuth, requireAdmin, requireSuperAdmin
│   │   │   ├── errorHandler.js     # Prisma P2002/P2025, Multer, JWT error handling
│   │   │   └── validate.js         # express-validator wrapper → 400 with field details
│   │   ├── services/
│   │   │   ├── matchingService.js  # computeMatches(), getMatchesForItem(), computeScore()
│   │   │   ├── embeddingService.js # generateEmbedding() via OpenAI — returns null if no key
│   │   │   ├── notificationService.js  # createNotification() — writes DB + emits socket
│   │   │   └── cloudinaryService.js    # upload/uploadAvatar/deleteFromCloudinary + multer config
│   │   └── lib/
│   │       └── prisma.js     # Singleton PrismaClient (always import from here)
│   └── prisma/
│       ├── schema.prisma     # Full DB schema (see enums below)
│       └── seed.js           # Seeds the explicitly configured administrator
└── frontend/                 # Next.js 16, Tailwind CSS, shadcn/ui components
    ├── app/                  # Next.js App Router pages
    │   ├── page.tsx          # Home (Hero, Stats, Categories, Recent items)
    │   ├── items/            # Browse + detail + edit + new
    │   ├── search/           # Legacy redirect; canonical browse/search lives at /items
    │   ├── chat/             # Real-time chat (Socket.io)
    │   ├── dashboard/        # User dashboard (items, claims, notifications, settings)
    │   ├── admin/            # Admin panel (users, items, claims, reports)
    │   │   └── layout.tsx    # Dark sidebar layout — redirects non-admins to /
    │   ├── auth/             # Login / Register
    │   └── profile/[id]/     # Public user profiles
    ├── components/
    │   ├── layout/           # Navbar.tsx, Footer.tsx
    │   ├── home/             # HeroSection.tsx, index.tsx
    │   ├── items/            # ItemCard.tsx
    │   ├── shared/           # Logo.tsx, LanguageSelector.tsx
    │   ├── providers/        # AuthProvider, SocketProvider, LanguageProvider
    │   └── ui/               # shadcn/ui primitives (toaster, etc.)
    └── lib/
        ├── api.ts            # Fetch wrapper with auto-refresh on TOKEN_EXPIRED
        ├── utils.ts          # cn(), timeAgo, formatDate, CATEGORIES, COLORS, match helpers
        ├── i18n.ts           # Internationalisation strings
        └── store/
            ├── authStore.ts        # Zustand: user, login, register, logout, initialize
            └── notificationStore.ts  # Zustand: notifications, unreadCount, fetch, markRead
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 18, Tailwind CSS, shadcn/ui (Radix primitives), Zustand |
| Backend | Node.js, Express 4, Socket.io 4 |
| Database | PostgreSQL via Prisma ORM (hosted on Supabase) |
| Auth | JWT access tokens (15m) + refresh tokens (7d, rotated on use) |
| Images | Cloudinary (multi-image upload, public ID stored for deletion) |
| Maps | Leaflet.js + react-leaflet + OpenStreetMap |
| AI Matching | OpenAI `text-embedding-3-small` (optional — graceful fallback if key absent) |
| Real-time | Socket.io (chat messages, typing indicators, push notifications) |
| Deployment | Vercel (frontend) + Render (backend) + Supabase (DB) |

## Dev Commands

```bash
# Backend
cd backend
npm run dev          # nodemon src/index.js
npm test             # jest --runInBand (NODE_ENV=test)
npm run seed         # node prisma/seed.js — requires ADMIN_PASSWORD

# Frontend
cd frontend
npm run dev          # next dev (http://localhost:3000)
npm run build        # next build
npm run lint         # ESLint flat-config checks
```

Backend → http://localhost:5000/api
Frontend → http://localhost:3000
Admin panel → http://localhost:3000/admin
Health check → GET /api/health

## Environment Variables

**backend/.env**
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...   # migration-capable direct or session-pooler URL
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=...        # optional, enables AI embedding matching
FRONTEND_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api  # server-side /api rewrite target
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database

Schema lives in `backend/prisma/schema.prisma`. Key enums:
- `ItemType`: LOST | FOUND
- `ItemStatus`: ACTIVE | MATCHED | CLAIM_PENDING | RETURNED | CLOSED | REJECTED
- `ClaimStatus`: PENDING | APPROVED | REJECTED
- `Role`: USER | ADMIN | SUPER_ADMIN
- `NotificationType`: MATCH_FOUND | NEW_MESSAGE | CLAIM_SUBMITTED | CLAIM_APPROVED | CLAIM_REJECTED | ITEM_RETURNED | COMMENT_ADDED | SYSTEM
- `ReportReason`: FAKE | INAPPROPRIATE | SPAM | WRONG_CATEGORY | OTHER
- `ReportStatus`: PENDING | REVIEWED | RESOLVED | DISMISSED

```bash
npx prisma migrate dev --name <name>   # create migration
npx prisma migrate deploy              # apply in production
npx prisma studio                      # GUI browser
node prisma/seed.js                    # seed admin user
```

Set a unique `ADMIN_PASSWORD` (minimum 12 characters) before running the seed. The seed refuses to create an administrator with a built-in/default password.
Also set `ADMIN_EMAIL` and `ADMIN_NAME` explicitly for the target environment; no working administrator credentials are published by the project.

Production deploys must run `prisma generate` and apply the complete committed
migration chain before the new backend starts. In particular:

- `20260713150000_backend_hardening_indexes` adds indexes for ordered/filtering query paths.
- `20260713160000_durable_pending_uploads` adds `PendingUpload`, single-use image ownership records, unique Cloudinary public IDs, and deterministic image positions.

Use the pooled `DATABASE_URL` at runtime. `DIRECT_URL` must support Prisma DDL;
for Render + Supabase this is normally the IPv4-compatible Supavisor session
pooler on port 5432, not the transaction pooler on port 6543. Deploying the new
backend without these migrations makes item-image upload/attachment unavailable.

## Key Architecture Patterns

### Prisma Client
Always import from `src/lib/prisma.js` — never call `new PrismaClient()` directly in other files. This singleton prevents connection pool exhaustion.

```js
const prisma = require('../lib/prisma');
```

### Auth Middleware
- `authenticate` — accepts the HttpOnly access cookie or a valid JWT Bearer token, then attaches `req.user`. Returns 401 with `code: 'TOKEN_EXPIRED'` on expiry so the frontend can refresh automatically.
- `optionalAuth` — attaches user if token present, continues without error if not (used on public item browsing)
- `requireAdmin` — requires ADMIN or SUPER_ADMIN role (apply after `authenticate`)
- `requireSuperAdmin` — requires SUPER_ADMIN only

### Matching Algorithm
Scores 0–100. Computed asynchronously after item creation via `computeMatches(itemId).catch(console.error)` — does not block the API response.

| Factor | Weight |
|--------|--------|
| Category exact match | 25 |
| Keyword overlap (Jaccard) | 25 |
| Location proximity (Haversine) | 20 |
| Date closeness | 15 |
| Color + brand match | 10 |
| AI embedding cosine similarity | 5 |

Thresholds: ≥30 stored in DB, ≥60 triggers notification to both item owners. Pre-filtered by category before full scoring for performance.
Date closeness uses fixed day-difference buckets (same day, ≤1, ≤3, ≤7, ≤14,
and ≤30 days); it is not an exponential decay.

### Real-time (Socket.io)
Socket auth uses the same JWT. Users auto-join `user:{id}` room on connect. The `SocketProvider` in the frontend creates/destroys the socket based on `user?.id`.

- `chat:join` / `chat:leave` — join/leave a chat room
- `chat:send` — save message to DB, broadcast to room, notify others
- `chat:typing` — relay to room (frontend should debounce ~2s)
- `chat:read` — mark messages read

### Rate Limiting
- All `/api/*` routes: 200 req / 15 min
- `/api/auth/login` and `/api/auth/register`: 20 req / 15 min (applied on top of global)

### Image Upload
`POST /api/upload/images` — uploads to Cloudinary via multer memory storage. Returns `{ images: [{ url, publicId, uploadToken }] }`. Each upload is first registered in `PendingUpload`; the signed receipt is user-bound, expires after one hour, and can be consumed only once when an item create/update transaction succeeds. Expired or explicitly abandoned uploads are cleaned up from Cloudinary. Max 5 images, 5MB each.

`DELETE /api/upload/images` — cleans up still-pending uploads using their signed receipts; it cannot delete an image that has already been attached to an item.

`POST /api/users/me/avatar` — single image upload for the current user's avatar. Avatar upload is not exposed under `/api/upload`.

### Frontend API Client (`frontend/lib/api.ts`)
Custom fetch wrapper. Automatically:
1. Sends browser REST requests to same-origin `/api`; the Next.js rewrite forwards them to `NEXT_PUBLIC_API_URL` server-side
2. Keeps the short-lived access token in memory while the backend also issues HttpOnly `SameSite=Lax` access/refresh cookies on the frontend origin
3. On 401 with `code: TOKEN_EXPIRED`, rotates the first-party HttpOnly refresh cookie and retries once
4. Coalesces concurrent refresh attempts and redirects to `/auth/login?expired=true` when recovery fails

Do not change the browser client back to a direct backend origin: the same-origin
proxy is what keeps cookie refresh reliable across browsers without cross-site
cookie requirements. Socket.IO connects to `NEXT_PUBLIC_SOCKET_URL` and sends
the in-memory access token in its auth payload.

### Frontend Auth Flow
`AuthProvider` calls `initialize()` on mount → fetches `/api/auth/me` if token exists. `SocketProvider` connects socket only when a user is authenticated, keyed on `user?.id`.

## API Route Summary

| Prefix | File | Notes |
|--------|------|-------|
| `/api/auth` | routes/auth.js | register, login, refresh, logout (requires auth), me |
| `/api/items` | routes/items.js | CRUD + status patch; GET public (optionalAuth) |
| `/api/matches` | routes/matches.js | get + refresh matches; owner or admin only |
| `/api/claims` | routes/claims.js | submit, list by item, list mine, approve/reject |
| `/api/chats` | routes/chats.js | list chats, get messages (paginated, reversed), create/find chat |
| `/api/comments` | routes/comments.js | GET public, POST/DELETE require auth; nested replies |
| `/api/notifications` | routes/notifications.js | list (paginated), mark-read, mark-all-read |
| `/api/reports` | routes/reports.js | POST only — prevents self-report and duplicate report |
| `/api/admin` | routes/admin.js | stats, users (ban/role), items (approve/delete), claims, reports |
| `/api/upload` | routes/upload.js | POST /images (max 5), DELETE /images for unattached receipts |
| `/api/users` | routes/users.js | GET /:id (public), GET /:id/items, PATCH /me, POST /me/avatar |

## Verification / Claims Flow

1. Finder posts a FOUND item with up to five ownership questions. New questions are stored in the legacy `verificationHints` column with an internal `question:` prefix.
2. The API exposes only those question-prefixed values as public `verificationQuestions`; legacy unprefixed hints are never projected publicly because they may contain expected answers.
3. Claimant answers every displayed question. The client sends indexed `verificationAnswers` (`q0`, `q1`, …); the backend snapshots them as a private question-text→answer JSON object plus an optional message.
4. Item status → `CLAIM_PENDING`; finder receives notification.
5. Finder or admin privately reviews the answers and approves/rejects. On approval: item → `RETURNED`, claimant notified.

## Common Gotchas

- Public item responses may include `verificationQuestions`, which are intentionally visible so a claimant knows what to answer. Raw `verificationHints` remains owner/admin-only; never expose unprefixed legacy values.
- `verificationAnswers` on a stored Claim is a private **JSON object** keyed by the snapshotted question text, not an array. Render owner/admin review with `Object.entries(answers)`, not `answers[i]`.
- `embedding` (JSON vector) is always stripped from API responses; only used internally for matching.
- `showPhone` must be `true` on a user's profile for their phone to appear in item detail.
- AI embedding is optional: if `OPENAI_API_KEY` is absent, `generateEmbedding()` returns `null` and matching uses weight 0 for that factor.
- Socket.io CORS origin must match `FRONTEND_URL` env var exactly.
- Prisma `P2002` = unique constraint violation (409); `P2025` = record not found (404) — handled in `errorHandler.js`.
- In `routes/users.js`, `PATCH /me` **must** be defined before `GET /:id` — otherwise Express matches `/me` as a user ID parameter, making the update endpoint unreachable.
- Admin role change only allows setting USER or ADMIN (not SUPER_ADMIN) — intentional; only direct DB access can elevate to SUPER_ADMIN.
- `POST /api/auth/logout` clears the access/refresh cookies and invalidates the hashed refresh-token record. It intentionally works even when the access token has expired.
- `backend/package.json` `prisma` field must be inside the root JSON object. A missing closing brace before it causes a JSON parse error at `npm install`.
