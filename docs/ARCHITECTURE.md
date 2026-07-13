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
  ├── verificationHints[] ← hidden from public
  ├── embedding (JSON vector for AI matching)
  └── userId → users

item_images
  └── url, publicId (Cloudinary), isPrimary, itemId

matches
  ├── lostItemId, foundItemId
  ├── score (0-100)
  └── breakdown { category, keywords, location, date, attributes, embedding }

chats + chat_participants + messages
  └── Real-time via Socket.io

claims
  ├── itemId, claimantId
  ├── verificationAnswers (JSON)
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
  ≥ 70 → "Strong match"  — immediate notification sent
  ≥ 50 → "Good match"
  ≥ 30 → "Possible match"
  < 30 → not stored
```

## Auth Flow

```
Register/Login → JWT access token (15min) + refresh token (7d)
                 HttpOnly cookies; refresh-token digest stored in PostgreSQL

Every web request → credentialed cookie auth (Bearer tokens remain supported for API clients)

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
