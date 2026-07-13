# ReClaim — Architecture Overview

## System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  Next.js 16  ·  Tailwind CSS  ·  Zustand  ·  Socket.io-client  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS / WSS
┌────────────────────────────▼─────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                    │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │  Auth    │  │  Items   │  │  Chat    │  │  Admin Routes   │  │
│  │  Routes  │  │  Routes  │  │  Routes  │  │  (role-guarded) │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────────┘  │
│                                                                   │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │MatchingService│  │EmbeddingService│  │NotificationService  │  │
│  │ (score engine)│  │ (OpenAI API)   │  │ (socket push)       │  │
│  └───────────────┘  └────────────────┘  └─────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                   Socket.io Server                          │  │
│  │  chat:send · chat:typing · notification:new                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────┬──────────────────────┬──────────────────────┬─────────────┘
       │                      │                      │
┌──────▼──────┐  ┌────────────▼────┐  ┌─────────────▼──────────────┐
│  PostgreSQL  │  │   Cloudinary    │  │       OpenAI API           │
│  (Supabase)  │  │  (Image store)  │  │  text-embedding-3-small    │
│  Prisma ORM  │  │                 │  │  (AI matching, optional)   │
└─────────────┘  └─────────────────┘  └────────────────────────────┘
```

## Database Schema (Key Tables)

```
users
  ├── id, email, password (bcrypt), name, avatarUrl
  ├── role: USER | ADMIN | SUPER_ADMIN
  ├── isBanned, banReason
  └── phone, showPhone, bio, location

items
  ├── id, type (LOST|FOUND), status
  ├── title, description, category, brand, color
  ├── locationLabel, locationLat, locationLng
  ├── dateLostFound
  ├── verificationHints[] ← legacy storage; question:-prefixed values project publicly
  ├── embedding (JSON vector for AI matching)
  └── userId → users

item_images
  └── url, unique publicId (Cloudinary), position, isPrimary, itemId

pending_uploads
  └── userId, url, unique publicId, expiresAt, cleanupClaimedAt

matches
  ├── lostItemId, foundItemId
  ├── score (0-100)
  └── breakdown { category, keywords, location, date, attributes, embedding }

chats + chat_participants + messages
  └── Real-time via Socket.io

claims
  ├── itemId, claimantId
  ├── verificationAnswers (private question-text → answer JSON snapshot)
  ├── status: PENDING | APPROVED | REJECTED
  └── message

comments
  └── itemId, userId, content, parentId (nested replies)

notifications
  └── userId, type, title, body, link, isRead

reports
  └── itemId, reporterId, reason, status
```

## Matching Algorithm

```
Match Score (0-100) =
  category exact match   × 25
  keyword overlap (TF)   × 25
  location proximity     × 20
  date closeness         × 15
  color + brand match    × 10
  AI embedding cosine    × 5

Thresholds:
  ≥ 60 → high-confidence match — notification sent once
  ≥ 30 → stored possible match
  < 30 → not stored
```

Date closeness is bucketed by absolute day difference: same day, ≤1, ≤3, ≤7,
≤14, and ≤30 days. Public item detail exposes only safe ownership questions
stored with the `question:` prefix. Claim answers are snapshotted privately for
the finder/admin review flow.

Item uploads use durable, one-hour `PendingUpload` ownership records. A signed,
user-bound receipt is consumed atomically when the asset is attached, preventing
receipt replay and preventing abandoned-upload cleanup from deleting an attached
image.

## Auth Flow

```
Register/Login → JWT access token (15min) + refresh token (7d)
                 HttpOnly SameSite=Lax cookies; refresh-token digest stored in PostgreSQL

Browser REST request → frontend-origin /api → Next.js server rewrite → backend
                       first-party cookies + in-memory Bearer access token

Non-browser API request → backend origin directly with supported Bearer token

On 401 TOKEN_EXPIRED → credentialed auto-refresh using the HttpOnly cookie
                        rotate refresh token (single-use)

Logout → delete refresh-token digest from DB + clear HttpOnly cookies/in-memory access token
```

## Real-time Chat

```
User connects → Socket.io auth middleware verifies JWT
             → joins personal room "user:{id}"

chat:join  → join room "chat:{chatId}"
chat:send  → save to DB → broadcast to room → notify others
chat:typing → broadcast to room (2s debounce)
chat:read  → mark messages as read
```

## Deployment

```
Frontend  → Vercel          (auto-deploy from main branch)
Backend   → Render          (Docker or Node.js native)
Database  → Supabase        (PostgreSQL + auto backups)
Images    → Cloudinary      (CDN + transformations)
```
