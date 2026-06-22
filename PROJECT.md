# ReClaim — Project Document

> A portfolio / CV reference document for the **ReClaim** Smart Lost & Found platform.
> Use the ready-made blurbs in the [For Your CV](#for-your-cv) section, or hand the whole
> document to a recruiter as a project write-up.

---

## At a Glance

| | |
|---|---|
| **Project** | ReClaim — Smart Lost & Found Platform |
| **Type** | Full-stack web application (solo / personal project) |
| **Domain** | Community / civic tech — reuniting people with lost belongings in Sri Lanka |
| **Role** | Full-stack Developer (design, frontend, backend, database, deployment) |
| **Stack** | Next.js · React · TypeScript · Node.js · Express · PostgreSQL · Prisma · Socket.io |
| **Highlights** | Weighted matching algorithm, AI semantic search, real-time chat, JWT auth with token rotation, full admin moderation suite |
| **Status** | Deployed (Vercel + Render + Supabase) |

---

## The Problem

Lost property is reunited with owners far too rarely. Found items sit in drawers and
notice boards; lost-item posts scatter across Facebook groups and WhatsApp with no
structure, no search, and no way to verify who the real owner is. There was no purpose-built
platform for Sri Lanka that could **automatically connect** a "lost" report with a matching
"found" report and **safely verify ownership** before handing an item over.

## The Solution

ReClaim is a platform where users post lost or found items, and the system intelligently
matches them using a multi-factor scoring algorithm. When a strong match is detected, both
parties are notified instantly and can chat in real time. Before a found item changes hands,
the finder sets **hidden verification questions** that only the genuine owner could answer —
preventing fraudulent claims. Admins moderate the whole flow.

---

## Key Features

- **Smart matching engine** — A weighted algorithm scores every lost/found pair from 0–100
  across six factors: category, keyword overlap, GPS proximity, date closeness, item
  attributes, and AI semantic similarity. Matches are computed asynchronously so they never
  block the API response.
- **AI semantic matching** — Item descriptions are embedded with OpenAI's
  `text-embedding-3-small` model and compared by cosine similarity, catching matches that
  keyword search alone would miss. Degrades gracefully to a zero-weight factor when no API key
  is present.
- **Fraud-resistant claim verification** — Finders attach hidden verification hints to a found
  item; claimants must answer them. Hints are stripped from every public API response so only
  the true owner can pass.
- **Real-time chat & notifications** — Socket.io powers instant messaging (with typing
  indicators and read receipts) and live push notifications for matches, claims, messages, and
  status changes.
- **Secure authentication** — JWT access tokens (15 min) plus rotating refresh tokens (7 days),
  with automatic, transparent token refresh on the client.
- **Interactive maps** — Leaflet + OpenStreetMap for location-tagged items and proximity-based
  browsing.
- **Multi-image uploads** — Up to 5 images per item served via the Cloudinary CDN.
- **Full admin panel** — User banning, role management, item approval, and claim/report
  moderation.
- **Polished UX** — Responsive design, dark/light mode, and Framer Motion animations
  throughout.

---

## Architecture

```
┌─────────────┐      REST + WebSocket      ┌──────────────┐      Prisma ORM      ┌────────────┐
│  Next.js    │ ◄────────────────────────► │  Express API │ ◄──────────────────► │ PostgreSQL │
│  (Vercel)   │   JWT auth · Socket.io     │   (Render)   │                      │ (Supabase) │
└─────────────┘                            └──────────────┘                      └────────────┘
       │                                          │
       │                                          ├──► Cloudinary  (image storage/CDN)
       └──► Leaflet / OpenStreetMap               └──► OpenAI      (embeddings, optional)
```

- **Frontend** — Next.js App Router with TypeScript, Tailwind, shadcn/ui (Radix primitives),
  and Zustand for state. A custom fetch wrapper auto-attaches tokens and transparently refreshes
  them on expiry.
- **Backend** — Layered Express API (routes → controllers → services), a singleton Prisma
  client to prevent connection-pool exhaustion, centralized error handling, request validation,
  rate limiting, and Helmet security headers.
- **Database** — PostgreSQL with a normalized 13-model Prisma schema (users, items, images,
  matches, claims, chats, messages, comments, notifications, reports, refresh tokens) and
  indexed lookups.
- **Real-time** — A Socket.io server sharing the same JWT auth; users auto-join a private room
  for targeted notifications.

---

## The Matching Algorithm

Each candidate lost/found pair is scored 0–100. Candidates are pre-filtered by category before
full scoring for performance.

| Factor | Weight | Method |
|--------|--------|--------|
| Category | 25 | Exact match |
| Keywords | 25 | Jaccard similarity on title + description |
| Location | 20 | Haversine distance (GPS) with label-similarity fallback |
| Date | 15 | Exponential decay over a 30-day window |
| Color + brand | 10 | Per-attribute exact match |
| AI embedding | 5 | Cosine similarity of OpenAI embeddings |

Pairs scoring **≥ 30** are stored; pairs scoring **≥ 60** notify both item owners.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| State | Zustand |
| Backend | Node.js, Express 4, Socket.io 4 |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (access + rotating refresh tokens), bcrypt |
| Images | Cloudinary (CDN + storage) |
| Maps | Leaflet, react-leaflet, OpenStreetMap |
| AI | OpenAI `text-embedding-3-small` |
| Security | Helmet, express-rate-limit, express-validator, CORS |
| Testing | Jest, Supertest |
| Deployment | Vercel (frontend), Render (backend), Supabase (database) |

---

## Engineering Highlights

These are the points worth talking through in an interview:

- **Designed a weighted, multi-factor matching algorithm** that combines structured signals
  (category, location, dates) with unstructured AI embeddings — and made the AI an *optional*
  enhancement so the system never hard-depends on a third-party API.
- **Built a fraud-resistant verification flow** by treating verification hints as a security
  boundary: stripped from every public response and answerable only by the legitimate owner.
- **Implemented production-grade auth** with short-lived access tokens, rotating refresh tokens,
  and silent client-side refresh — balancing security with a seamless user experience.
- **Engineered for resilience and performance** — async match computation that doesn't block
  responses, category pre-filtering, a singleton DB client to avoid pool exhaustion, indexed
  queries, and layered rate limiting.
- **Delivered real-time features end-to-end** — shared JWT auth across REST and WebSocket,
  per-user notification rooms, typing indicators, and read receipts.
- **Owned the full lifecycle** — schema design, API, frontend, and deployment across three
  cloud providers.

---

## For Your CV

**One-liner (résumé bullet):**

> Built **ReClaim**, a full-stack Lost & Found platform (Next.js, Node/Express, PostgreSQL)
> featuring a weighted AI-assisted matching algorithm, real-time chat via Socket.io, and a
> fraud-resistant claim-verification flow; deployed on Vercel, Render, and Supabase.

**Two–three bullets (project section):**

> **ReClaim — Smart Lost & Found Platform** · *Next.js, Node.js, Express, PostgreSQL, Prisma, Socket.io*
> - Designed a weighted matching engine scoring lost/found pairs 0–100 across six factors
>   (category, keywords, GPS proximity, date, attributes, and OpenAI semantic embeddings),
>   computed asynchronously to keep the API responsive.
> - Engineered a fraud-resistant claim-verification flow and JWT authentication with rotating
>   refresh tokens and transparent client-side refresh.
> - Built real-time chat and push notifications with Socket.io and a full admin moderation
>   suite; deployed across Vercel, Render, and Supabase.

**LinkedIn / portfolio summary (1 paragraph):**

> ReClaim is a smart Lost & Found platform that reunites people with their missing belongings.
> Users post lost or found items, and a weighted matching algorithm — combining category,
> keywords, GPS location, dates, item attributes, and AI semantic embeddings — automatically
> surfaces likely matches and notifies both parties in real time. A hidden verification-question
> system prevents fraudulent claims before items change hands. I built the entire stack:
> a Next.js/TypeScript frontend, a Node.js/Express API with a PostgreSQL/Prisma database,
> real-time chat and notifications via Socket.io, and a full admin moderation panel, deployed
> on Vercel, Render, and Supabase.

**Skills demonstrated:** Full-stack development · REST API design · Real-time systems (WebSockets) ·
Relational data modeling · Authentication & security · Algorithm design · AI/LLM integration ·
Cloud deployment · TypeScript · React/Next.js · Node.js

---

## Further Reading

- [`README.md`](README.md) — setup and quick start
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system architecture
- [`docs/API.md`](docs/API.md) — full API reference
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deployment guide
