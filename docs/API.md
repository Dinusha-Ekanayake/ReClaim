# ReClaim API Reference

Base URL: `http://localhost:5000/api`  
All protected routes require: `Authorization: Bearer <accessToken>`

---

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login, returns tokens |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Yes | Logout + invalidate refresh token |
| GET | `/auth/me` | Yes | Get current user profile |

### POST /auth/register
```json
{ "name": "Jane Doe", "email": "jane@email.com", "password": "Secret123" }
```

### POST /auth/login
```json
{ "email": "jane@email.com", "password": "Secret123" }
```
Response: `{ user, accessToken, refreshToken }`

---

## Items

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/items` | Optional | List items with filters |
| GET | `/items/:id` | Optional | Get single item |
| POST | `/items` | Yes | Create item |
| PUT | `/items/:id` | Yes (owner/admin) | Update item |
| DELETE | `/items/:id` | Yes (owner/admin) | Delete item |
| PATCH | `/items/:id/status` | Yes (owner/admin) | Update status |

### GET /items Query Params
| Param | Type | Example |
|-------|------|---------|
| type | LOST\|FOUND | `LOST` |
| category | string | `Electronics` |
| status | string | `ACTIVE` |
| search | string | `iphone 15` |
| color | string | `Black` |
| brand | string | `Apple` |
| page | number | `1` |
| limit | number | `12` |
| sort | string | `createdAt` |
| order | asc\|desc | `desc` |

### POST /items Body
```json
{
  "type": "LOST",
  "title": "Black iPhone 15 Pro",
  "description": "Lost my black iPhone 15 Pro near campus...",
  "category": "Electronics",
  "brand": "Apple",
  "color": "Black",
  "locationLabel": "Near University of Colombo",
  "locationLat": 6.9022,
  "locationLng": 79.8613,
  "dateLostFound": "2025-04-20",
  "showContactInfo": false,
  "imageUrls": ["https://res.cloudinary.com/..."],
  "imagePublicIds": ["reclaim/items/abc123"],
  "verificationHints": ["Has a crack on bottom-left corner"]
}
```

---

## Matches

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/matches/:itemId` | Yes (owner/admin) | Get matches for item |
| POST | `/matches/:itemId/refresh` | Yes (owner/admin) | Recompute matches |

---

## Chats & Messages

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chats` | Yes | Get all chats for current user |
| GET | `/chats/:id` | Yes | Get chat + paginated messages |
| POST | `/chats` | Yes | Create or get existing chat |

### POST /chats Body
```json
{ "recipientId": "uuid", "itemId": "uuid (optional)" }
```

**Real-time events (Socket.io):**
- `chat:join` — join a chat room
- `chat:send` — `{ chatId, content }`
- `chat:typing` — `{ chatId }`
- `chat:read` — `{ chatId }`

---

## Comments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/comments/:itemId` | No | Get comments for item |
| POST | `/comments/:itemId` | Yes | Post a comment |
| DELETE | `/comments/:id` | Yes (owner/admin) | Delete comment |

### POST /comments/:itemId Body
```json
{ "content": "Has anyone seen this near the library?", "parentId": "optional" }
```

---

## Claims

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/claims` | Yes | Submit a claim for a FOUND item |
| GET | `/claims/my` | Yes | Get claims submitted by current user |
| GET | `/claims/item/:itemId` | Yes (owner/admin) | Get claims for an item |
| PATCH | `/claims/:id` | Yes (owner/admin) | Approve or reject a claim |

### POST /claims Body
```json
{
  "itemId": "uuid",
  "verificationAnswers": {
    "q0": "It's black with a cracked bottom corner",
    "q1": "Has a blue floral sticker on the back",
    "q2": "Mawatha Road, near the pharmacy"
  },
  "message": "This is my phone, I lost it on Monday morning."
}
```

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Yes | Get notifications |
| PATCH | `/notifications/:id/read` | Yes | Mark one as read |
| PATCH | `/notifications/read-all` | Yes | Mark all as read |

**Real-time:** `notification:new` event pushed via Socket.io.

---

## Reports

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/reports` | Yes | Report an item |

### POST /reports Body
```json
{
  "itemId": "uuid",
  "reason": "FAKE",
  "description": "This listing is a duplicate of another post."
}
```
Reason options: `FAKE | INAPPROPRIATE | SPAM | WRONG_CATEGORY | OTHER`

---

## Upload

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload/images` | Yes | Upload up to 5 item images (multipart) |
| POST | `/upload/avatar` | Yes | Upload profile avatar (multipart) |

Form field name: `images` (array) or `avatar`  
Response: `{ images: [{ url, publicId }] }`

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/:id` | No | Public profile |
| GET | `/users/:id/items` | No | User's public items |
| PATCH | `/users/me` | Yes | Update profile |
| POST | `/users/me/avatar` | Yes | Upload avatar |

---

## Admin (requires ADMIN or SUPER_ADMIN role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/stats` | Dashboard statistics |
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:id/ban` | Ban / unban user |
| PATCH | `/admin/users/:id/role` | Change user role (SUPER_ADMIN only) |
| GET | `/admin/items` | List all items |
| PATCH | `/admin/items/:id/approve` | Approve / reject item |
| DELETE | `/admin/items/:id` | Hard delete item |
| GET | `/admin/reports` | List reports |
| PATCH | `/admin/reports/:id` | Resolve / dismiss report |
