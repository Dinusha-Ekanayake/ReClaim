# ReClaim Production UX and Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a cohesive, responsive, multilingual ReClaim experience whose core item, claim, notification, and realtime workflows stay consistent with the Express/Prisma backend.

**Architecture:** Keep Next.js pages thin and consolidate visual behavior in shared CSS/components; keep the URL canonical for public search state; retain the existing REST API and Socket.IO boundaries while adding acknowledgements, token recovery, and explicit lifecycle invariants. Preserve the existing Prisma model unless a durable invariant requires a schema index or migration, and never fabricate user-facing metrics.

**Tech Stack:** Next.js 16, React 18, Tailwind CSS 3, shadcn/Radix primitives, Framer Motion, Zustand, Express 4, Socket.IO 4, Prisma, PostgreSQL, Jest.

---

### Task 1: Codify the shared visual system and shell geometry

**Files:**
- Create: `.stitch/DESIGN.md`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/template.tsx`
- Modify: `frontend/components/layout/CommunityBackdrop.tsx`
- Modify: `frontend/components/layout/PublicLayout.tsx`
- Modify: `frontend/components/layout/Navbar.tsx`

- [ ] **Step 1: Record the semantic design system**

Use the correct `logo.png`/`favicon.png`, one blue interactive accent, green/red only as Found/Lost functional colors, Outfit + DM Sans + JetBrains Mono, 44px touch targets, transform/opacity-only motion, and reduced-motion fallbacks in `.stitch/DESIGN.md`.

- [ ] **Step 2: Remove duplicate and unstable route offsets**

Make the navbar's 80px spacer the only public offset and ensure the route animation ends with no retained transform:

```css
.route-enter { animation: route-enter 240ms cubic-bezier(.16,1,.3,1); }
@keyframes route-enter { from { opacity: 0; } to { opacity: 1; } }
```

- [ ] **Step 3: Standardize interaction primitives**

Split static surfaces from interactive cards, use consistent 16/24/32px radii, keep focus-visible rings, prevent the global active transform from overriding positioned controls, and enforce mobile `overflow-x: clip` plus `min-width: 0` where needed.

- [ ] **Step 4: Make the community background contextual and restrained**

Keep it non-interactive and privacy-safe, expose connection/activity semantics through accessible foreground UI, and render route-aware network paths without exact user coordinates or fake metrics.

- [ ] **Step 5: Verify shell geometry**

Run: `npm.cmd run lint`

Expected: exit 0 with no warnings.

### Task 2: Make browse/search state URL-canonical and mobile-safe

**Files:**
- Modify: `frontend/app/items/page.tsx`
- Modify: `frontend/app/search/page.tsx`
- Modify: `frontend/components/layout/Navbar.tsx`
- Modify: `frontend/components/shared/Pagination.tsx`

- [ ] **Step 1: Reproduce the stale-filter defect**

Navigate `/items?type=LOST` to `/items?type=FOUND` without a full reload and confirm the result request follows the old state.

- [ ] **Step 2: Derive filters from `useSearchParams` and write changes through the router**

Use one canonical `search` parameter, preserve only validated filter values, reset `page=1` when a filter changes, and call `router.replace()` with the serialized state.

- [ ] **Step 3: Close overlays on query-only navigation**

Include `searchParams.toString()` in the navbar close effect and explicitly close the mobile sheet when a link is activated.

- [ ] **Step 4: Add accessible state to view and pagination controls**

Provide `aria-label`, `aria-pressed`, and current-page semantics; calculate a window around the current page rather than always rendering pages 1-7.

- [ ] **Step 5: Run lint and an HTTP/browser smoke test**

Expected: Lost/Found requests and active navigation always agree at desktop and 390px widths.

### Task 3: Repair authentication, notification, and failure-state continuity

**Files:**
- Create: `frontend/app/error.tsx`
- Modify: `frontend/app/auth/login/page.tsx`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/store/authStore.ts`
- Modify: `frontend/lib/store/notificationStore.ts`
- Modify: `frontend/app/dashboard/layout.tsx`
- Modify: `frontend/app/admin/layout.tsx`
- Modify: affected dashboard/admin pages with missing catches
- Modify: `backend/src/routes/notifications.js`

- [ ] **Step 1: Add tests for owned/missing notification updates**

The owned notification must return 200; missing or foreign IDs must return 404 without mutating another account.

- [ ] **Step 2: Assign the `updateMany` result before checking `count`**

```js
const result = await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
if (!result.count) return res.status(404).json({ error: 'Notification not found' });
```

- [ ] **Step 3: Reset account-scoped stores on logout and deduplicate socket events**

Clear notification rows/count/error when identity changes; increment unread only when the incoming ID is new.

- [ ] **Step 4: Preserve validated internal return destinations**

Redirect protected actions to `/auth/login?next=<internal path>`, show expired-session context, and return to the safe internal path after login.

- [ ] **Step 5: Replace blank guards and silent failures**

Render session-loading skeletons, route error boundaries, and inline retry states instead of zero metrics, stale rows, or unconditional redirects.

### Task 4: Make Socket.IO and chat delivery-safe

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/components/providers/SocketProvider.tsx`
- Modify: `frontend/app/chat/[[...id]]/page.tsx`
- Modify: `backend/src/socket.js`
- Modify: `backend/src/routes/chats.js`

- [ ] **Step 1: Add an explicit session refresh function for realtime recovery**

Export a coalesced `refreshSession()` that always rotates the access token/cookie rather than returning early for an in-memory token.

- [ ] **Step 2: Recover after server-forced token expiry**

On `connect_error` or `io server disconnect`, refresh once and reconnect; stop and surface a session error when refresh fails.

- [ ] **Step 3: Add acknowledged sends**

Change `chat:send` to accept an acknowledgement callback and return `{ ok: true, messageId }` or `{ ok: false, error }`. Keep the draft until acknowledgement, disable duplicate sends, time out visibly, and permit retry.

- [ ] **Step 4: Synchronize the conversation list**

Update last-message previews, ordering, and unread counts on message/read events; show item context and add older-message pagination using the existing API metadata.

- [ ] **Step 5: Respect IME and connection state**

Do not submit while `event.nativeEvent.isComposing`; disable send while disconnected and show a reconnecting status.

### Task 5: Complete the item, location, ownership, and comment workflows

**Files:**
- Modify: `frontend/app/items/new/page.tsx`
- Modify: `frontend/app/items/[id]/edit/page.tsx`
- Modify: `frontend/app/items/[id]/page.tsx`
- Modify: `frontend/components/items/ClaimModal.tsx`
- Modify: `frontend/components/items/LeafletMap.tsx`
- Modify: `frontend/components/items/CommentSection.tsx`
- Modify: `backend/src/controllers/itemsController.js`
- Modify: `backend/src/routes/claims.js`
- Modify: `backend/src/routes/comments.js`

- [ ] **Step 1: Use local-calendar dates**

Build `YYYY-MM-DD` from local year/month/day instead of `toISOString()` for defaults and maxima.

- [ ] **Step 2: Expose all submitted item fields**

Add controls for area, subcategory, size, optional coordinates, browser geolocation, and a privacy explanation. Validate latitude/longitude pairs and never expose an exact public location when an approximate area is available.

- [ ] **Step 3: Bundle Leaflet markers locally**

Remove `unpkg.com` marker URLs and use package/local assets allowed by CSP.

- [ ] **Step 4: Align ownership questions end-to-end**

Treat `verificationHints` as finder-authored question text, expose a safe `verificationQuestions` projection to claimants, submit answers keyed by stable question index, and render question text beside every answer for owner/admin review.

- [ ] **Step 5: Complete owner controls**

Add a confirmed delete action; allow edit of coordinates, area, size, subcategory, questions, and existing images without losing unaffected fields.

- [ ] **Step 6: Preserve comment threads and API limits**

Use a visible `[deleted]` parent shell when replies exist, align the UI maximum to 500, hide/redirect reply controls for logged-out users, and keep controls visible on touch/focus.

### Task 6: Enforce backend security and lifecycle invariants

**Files:**
- Modify: `backend/src/controllers/authController.js`
- Modify: `backend/src/controllers/itemsController.js`
- Modify: `backend/src/routes/admin.js`
- Modify: `backend/src/routes/claims.js`
- Modify: `backend/src/routes/reports.js`
- Modify: `backend/src/routes/comments.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/index.js`
- Modify: `backend/src/services/matchingService.js`
- Modify: `backend/src/services/notificationService.js`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/.env.example`
- Modify: `render.yaml`
- Test: `backend/tests/*.test.js`

- [ ] **Step 1: Add multilingual matching regression tests**

Identical Sinhala and Tamil descriptions must receive keyword points; coordinate zero must be treated as valid.

- [ ] **Step 2: Normalize Unicode tokens**

Use `normalize('NFKC')`, Unicode letter/number matching (`/[^\p{L}\p{N}\s]/gu`), and explicit null/finite coordinate checks.

- [ ] **Step 3: Make refresh sessions unique**

Add `crypto.randomUUID()` as JWT `jti`, keep rotation atomic, and add a same-second session test.

- [ ] **Step 4: Centralize item state transitions**

Reject owner reopening after an approved claim, do not reactivate returned/closed items during moderation, and apply claim/item updates transactionally.

- [ ] **Step 5: Harden moderation and validation**

Revoke sessions/disconnect sockets when banning, validate IDs before Prisma, set `resolvedAt` only for terminal reports, and collect truthful admin notes.

- [ ] **Step 6: Improve operational behavior**

Mount health checks before rate limiting, close Socket.IO before HTTP/Prisma shutdown, document the IPv4-compatible Supavisor session-mode `DIRECT_URL`, and add short caching to public aggregate stats.

- [ ] **Step 7: Add query indexes without inventing data**

Add composite indexes for notification inbox, report queue, comment threads, user ordering, and matching candidates; validate the schema and produce a migration when a safe database connection is available.

### Task 7: Correct copy, localization, accessibility, and performance drift

**Files:**
- Modify: `frontend/lib/i18n.ts`
- Modify: `frontend/components/providers/LanguageProvider.tsx`
- Modify: `frontend/lib/utils.ts`
- Modify: public/auth/dashboard route copy identified by the audit
- Modify: `frontend/components/home/*.tsx`

- [ ] **Step 1: Remove unsupported claims and fake affordances**

Use only API-backed metrics; correct 60% match copy, deletion/privacy text, global-vs-nearby wording, and vendor-processing disclosure.

- [ ] **Step 2: Replace product emoji icons with Lucide icons**

Retain emoji only in user content, never in core navigation, status, or action controls.

- [ ] **Step 3: Expand typed translations for core tasks**

Cover authentication, browse/search, item creation, claims, chat, dashboard, errors, and dates for English/Sinhala/Tamil; format relative/date/number output with the selected locale.

- [ ] **Step 4: Finish accessibility semantics**

Add a skip link, landmarks, labels/IDs, accessible names and pressed states, 44px targets, visible focus/touch actions, and `MotionConfig reducedMotion="user"`.

- [ ] **Step 5: Reduce render and image overhead**

Add `sizes` to fill images, remove unconditional logo priority, replace render-blocking font import with a production-safe font strategy, and keep animated client islands small.

### Task 8: Fresh production verification

**Files:**
- Verify all modified frontend/backend/config files.

- [ ] **Step 1: Frontend static checks**

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: both exit 0 with no warnings/errors.

- [ ] **Step 2: Backend checks**

Run: `npm.cmd test -- --runInBand`

Run: `npx.cmd prisma validate`

Run JavaScript syntax checks for every `backend/src/**/*.js` file.

Expected: unit tests pass; DB integration tests run only with an isolated `TEST_DATABASE_URL` and are reported honestly if skipped.

- [ ] **Step 3: Dependency and service checks**

Run production dependency audits, `/api/health`, `/api/health/ready`, public stats/items requests, and frontend route smoke checks.

- [ ] **Step 4: Browser verification**

Capture fresh desktop and 390px screenshots for home, browse, login, posting, dashboard, chat, and admin where authentication permits. Confirm no horizontal overflow, duplicate offsets, hidden controls, or error overlay.

- [ ] **Step 5: Reconcile requirements and diff**

Review this checklist, inspect `git diff --check` and `git status --short`, and report any external-only production requirement (for example Render `DIRECT_URL`) without claiming it was changed.
