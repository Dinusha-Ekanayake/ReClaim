# ReClaim API Reference

Base URL: `http://localhost:5000/api`  
Protected routes accept the HttpOnly access cookie used by the web app or `Authorization: Bearer <accessToken>` for non-browser clients.

The browser client does not call that backend origin directly. It requests the
frontend's same-origin `/api` path, which Next.js rewrites server-side to
`NEXT_PUBLIC_API_URL`. This keeps the `SameSite=Lax` access/refresh cookies
first-party. Direct backend URLs in this reference are for server-to-server or
non-browser API clients.

---

## Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Create an unverified account and send a verification link |
| POST | `/auth/verify-email` | No | Consume a single-use email-verification token |
| POST | `/auth/resend-verification` | No | Request another verification link |
| POST | `/auth/login` | No | Login after verification and issue a session |
| POST | `/auth/forgot-password` | No | Request a single-use reset link |
| POST | `/auth/reset-password` | No | Reset password and revoke active sessions |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | Cookie/Bearer optional | Logout + invalidate refresh token |
| GET | `/auth/me` | Yes | Get current user profile |

### POST /auth/register
```json
{ "name": "Jane Doe", "email": "jane@email.com", "password": "Secret123" }
```

Success (`201`):
```json
{
  "message": "Account created. Check your email to verify it before signing in.",
  "requiresVerification": true,
  "emailSent": true
}
```

Registration does not create a session. If delivery is unavailable in a
non-production environment, the response can include `devVerificationUrl` for
local testing. Production never returns that bearer link.

### POST /auth/verify-email
```json
{ "token": "64-character hexadecimal token from the verification link" }
```

Success: `{ "message": "Email verified. Sign in to continue." }`

### POST /auth/resend-verification
```json
{ "email": "jane@email.com" }
```

The endpoint returns the same accepted response whether or not the address
belongs to an account that needs verification. In production, email delivery
must be configured or this endpoint returns `503`.

### POST /auth/login
```json
{ "email": "jane@email.com", "password": "Secret123" }
```
Only verified, non-banned accounts can log in. Response: `{ user, accessToken }`
plus HttpOnly access and refresh cookies. The refresh token is never exposed to
browser JavaScript.

---

## Items

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/items` | Optional | List items with filters |
| GET | `/items/:id` | Optional | Get single item |
| POST | `/items` | Yes | Submit an item report for moderation |
| PUT | `/items/:id` | Yes (owner/admin) | Update item; material owner edits require re-approval |
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
  "type": "FOUND",
  "title": "Black iPhone 15 Pro",
  "description": "Found a black iPhone 15 Pro near campus...",
  "category": "Electronics",
  "brand": "Apple",
  "color": "Black",
  "locationLabel": "Near University of Colombo",
  "locationArea": "Colombo 03",
  "locationLat": 6.9022,
  "locationLng": 79.8613,
  "dateLostFound": "2025-04-20",
  "showContactInfo": false,
  "imageUrls": ["https://res.cloudinary.com/..."],
  "imagePublicIds": ["reclaim/items/abc123"],
  "imageUploadTokens": ["signed-single-use-upload-receipt"],
  "verificationQuestions": ["Describe a distinctive mark or accessory not visible in the photos."]
}
```

Obtain each image triple from `POST /upload/images` and submit it before its
one-hour receipt expires. Receipts are bound to the authenticated user and can
be consumed only once. For found items, `verificationQuestions` are intentionally
returned to public item viewers; raw legacy `verificationHints` are not. Claim
answers never appear in public item responses.

`locationArea` is required. A successful submission is returned to its owner
with `isApproved: false`; it is not included in public item listings until an
administrator approves it. Approval queues asynchronous matching. Material
owner edits return an approved report to moderation and remove stale matches.

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
| GET | `/chats` | Yes | Get the 100 most recently active chats |
| GET | `/chats/:id` | Yes | Get chat + paginated messages |
| POST | `/chats` | Yes | Create or get existing chat |

### POST /chats Body
```json
{ "recipientId": "uuid", "itemId": "uuid" }
```

Both IDs are required. The approved item must involve the recipient or current
user as owner, and a claim relationship is required before claimant/finder chat.

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
| GET | `/claims/my?page=1&limit=20` | Yes | Get paginated claims submitted by current user |
| GET | `/claims/received?page=1&limit=20` | Yes | Get paginated claims on the current user's items |
| GET | `/claims/item/:itemId?page=1&limit=20` | Yes (owner/admin) | Get paginated claims for an item |
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

The request keys are positional and must cover every question currently shown.
On acceptance, the backend snapshots the displayed question text with each
answer. Those stored answers are available only through authenticated claim
workflows for the claimant, item owner, or administrators as appropriate; they
are not part of public item data.

Claim list responses use `{ claims, total, page, limit, pages, hasNext,
hasPrev }`. Limits are capped at 50.

---

## Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications?page=1&limit=20` | Yes | Get paginated notifications and unread count |
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
| DELETE | `/upload/images` | Yes | Clean up unattached uploads using signed receipts |

Form field name: `images` (array).
Response: `{ images: [{ url, publicId, uploadToken }] }`. The signed upload token must accompany the image fields when creating an item.
The backend persists ownership in `PendingUpload` before uploading, expires the
receipt after one hour, consumes it atomically when the image is attached, and
cleans up expired or explicitly abandoned assets. A consumed receipt cannot be
replayed to attach or delete an item image.

---

## Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/:id` | No | Public name, avatar, bio, and profile location |
| GET | `/users/:id/items` | No | User's public items |
| GET | `/users/me/dashboard` | Yes | Current user's exact dashboard totals and recent items |
| GET | `/users/me/items` | Yes | Paginated private owner item list |
| PATCH | `/users/me` | Yes | Update profile |
| POST | `/users/me/avatar` | Yes | Upload avatar |
| DELETE | `/users/me` | Yes | Permanently delete a regular user account |

---

## Contact

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/contact` | No | Submit a validated support message |

---

## Health and statistics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Process liveness |
| GET | `/health/ready` | No | Application readiness including database connectivity |
| GET | `/stats` | No | Live public community statistics |

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
| GET | `/admin/contacts` | Paginated support inbox |
| PATCH | `/admin/contacts/:id` | Update support-message status or internal note |
