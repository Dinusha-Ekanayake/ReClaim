# ReClaim — Find what matters. Return what's lost.

A smart Lost & Found platform with AI-assisted matching, real-time chat, and admin moderation.

## 🏗️ Project Structure

```
reclaim/
├── frontend/     # Next.js 14 + Tailwind CSS + shadcn/ui
├── backend/      # Node.js + Express + Prisma
└── docs/         # Architecture diagrams
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or Supabase account)
- Cloudinary account
- (Optional) OpenAI API key for AI matching

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/reclaim.git
cd reclaim

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Environment Variables

**Backend** — copy `backend/.env.example` to `backend/.env` and fill in:
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-super-secret-key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
OPENAI_API_KEY=...          # optional, for AI matching
FRONTEND_URL=http://localhost:3000
PORT=5000
```

**Frontend** — copy `frontend/.env.local.example` to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=...   # optional
```

### 3. Database Setup

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed       # seeds admin user
```

### 4. Run Development

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend → http://localhost:3000  
Backend API → http://localhost:5000/api  
Admin panel → http://localhost:3000/admin  

## 🔑 Default Admin Credentials (after seed)
- Email: `admin@reclaim.app`
- Password: `Admin@123`  
> ⚠️ Change this immediately in production!

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend
vercel --prod
```

### Backend → Render
1. Connect your GitHub repo on render.com
2. Set root directory to `backend`
3. Build command: `npm install && npx prisma migrate deploy`
4. Start command: `npm start`
5. Add all env variables

### Database → Supabase
1. Create project on supabase.com
2. Copy the PostgreSQL connection string to `DATABASE_URL`

## 📚 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express.js, Socket.io |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT (access + refresh tokens) |
| Images | Cloudinary |
| Maps | Leaflet.js + OpenStreetMap |
| AI Matching | OpenAI text-embedding-3-small |
| Real-time | Socket.io |
| Deployment | Vercel + Render + Supabase |

## ✨ Features

- 🔍 Smart item matching (category, keywords, location, date, AI embeddings)
- 💬 Real-time in-app chat with message history
- 🗺️ Location-based filtering with map view
- 🛡️ Verification questions to prevent fake claims
- 📸 Multi-image upload with Cloudinary
- 🔔 In-app notifications
- 💬 Comment sections on items
- 👮 Admin panel with full moderation tools
- 📊 Analytics dashboard for admins
- 🌓 Dark/light mode
