# DM + Link Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the automated Instagram DM + link collection service with a shared backend powering DM policies, CTA templates, and the public user-facing link page.

**Architecture:** Express/TypeScript server exposes IG webhook handlers, policy CRUD APIs, and product endpoints; React-based single-page app hosts the back office and a separate link page that consume those APIs.

**Tech Stack:** Node.js + TypeScript, Express, Prisma/SQLite for persistence, Jest + Testing Library for automated checks, React (Vite) for front/back UI, IG Graph API REST client.

---

## Chunk 1: Persistence & Policy Domain

### Task 1: Define schema + persistence helpers

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/src/db.ts`
- Create: `server/src/models/policy.ts`

- [ ] **Step 1: Author Prisma schema** to capture `PostPolicy`, `Template`, `Product`, `Link`, `CommentReply`, `DeliveryLog` tables with the columns described in the spec, including enum for `policy_mode` and relations between templates/products.

- [ ] **Step 2: Generate client and helper types** with `npx prisma generate` and expose typed helpers in `server/src/db.ts` for `getPolicyByPostId`, `listProducts`, etc.

- [ ] **Step 3: Run schema verification** via `npx prisma migrate dev --name init` (expect success) and `npm run test -- policy` once the data helper tests exist to ensure the schema matches the code.

## Chunk 2: Backend APIs & DM pipeline

### Task 2: Implement IG event handler + DM dispatcher

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/routes/comments.ts`
- Create: `server/src/services/igClient.ts`
- Create: `server/src/services/dmDispatcher.ts`
- Create: `server/src/controllers/commentController.ts`

- [ ] **Step 1: Wire Express app** with a `/events/comments` POST endpoint that validates payload shape, logs headers, and delegates to the controller. Expect `npm start` to fail until handler exists.

- [ ] **Step 2: Implement dispatch logic** to load policy, compare `exact_match` string case-insensitively, resolve template and reply set, and call `igClient.sendDM` + `igClient.reply`. Include unit tests under `server/tests/commentController.test.ts` asserting mode selection and reply randomness.

- [ ] **Step 3: Hook logging/auditing** by inserting `delivery_logs` records within the dispatcher and adding `dmDispatcher` tests that expect `delivery_logs` insert attempts when `igClient` throws.

### Task 3: Back office CRUD APIs

**Files:**
- Create: `server/src/routes/admin.ts`
- Create: `server/src/controllers/adminController.ts`
- Create: `server/src/validators/admin.ts`

- [ ] **Step 1: Add CRUD routes** (`GET /admin/posts`, `POST /admin/posts/:id/policy`, `GET/POST /admin/templates`, `GET/POST /admin/products`) that validate bodies with `zod` and return structured JSON.

- [ ] **Step 2: Implement controllers** that call the persistence helpers for posts, templates, links, and comment replies.

- [ ] **Step 3: Add integration tests** (supertest) verifying that policy updates persist and failing requests return 400 when required fields missing.

## Chunk 3: Back office UI pages

### Task 4: Build admin interface (Vite + React)

**Files:**
- Create: `admin/package.json`
- Create: `admin/src/App.tsx`
- Create: `admin/src/components/PostPolicyEditor.tsx`
- Create: `admin/src/components/TemplateEditor.tsx`
- Create: `admin/src/components/ProductManager.tsx`
- Create: `admin/src/api/client.ts`

- [ ] **Step 1: Bootstrap Vite React project** (scripts `npm run dev`, `npm run build`) and configure `proxy` or base URL to talk to Express APIs.

- [ ] **Step 2: Implement policy editor** with post list, mode toggle, exact-match input, template selection dropdown, link selection (registered links or manual URL), and comment reply list (max 3 + random toggle). Add `postId` selection, `mode` buttons, and dispatch to API.

- [ ] **Step 3: Build template and product managers** to edit CTA text, select affiliate link, manage product image/title/link, and reorder display via drag/arrow buttons. Each change should call the admin API and refresh product cache.

- [ ] **Step 4: Add unit tests** using Testing Library for components to assert mode toggle state and template output before wiring real backend.

## Chunk 4: Public Link Page

### Task 5: Build user-facing link page

**Files:**
- Create: `link-page/package.json`
- Create: `link-page/src/App.tsx`
- Create: `link-page/src/components/ProductGrid.tsx`
- Create: `link-page/src/api/products.ts`

- [ ] **Step 1: Bootstrap Vite React project** with profile + intro data fetched from backend (`/products/profile`). Front page should display product image, title, and CTA button linking to `link_id` destination.

- [ ] **Step 2: Implement `ProductGrid`** with `button_text` CTA, ensuring clicking uses `target` `_blank` and `rel="noopener"` for affiliate links. Write snapshot test verifying markup.

- [ ] **Step 3: Add caching/fallback** logic so the page shows a message (“상품을 곧 업데이트합니다”) if no products returned. Unit test for empty state.

## Chunk 5: Delivery observability & IG integration

### Task 6: Delivery logging + IG permission prep

**Files:**
- Modify: `server/src/services/igClient.ts`
- Modify: `server/src/services/dmDispatcher.ts`

- [ ] **Step 1: Collect delivery logs** from DM controller and persist `status`, `meta_error`, `sent_at`. Verify via unit test that `delivery_logs` entry is created for both success and failure.

- [ ] **Step 2: Prepare IG Graph API config** (env variables for tokens/page IDs, CLI command snippet for token refresh). Document the required scopes and expected error-handling behavior in `docs/superpowers/notes/ig-permissions.md` for future reviewers.

- [ ] **Step 3: Add a health check** endpoint (`GET /health`) that ensures DB connection and ability to reach IG (mocked). Tests should call `/health` and expect 200 with `{status:'ok'}`.

---

Plan complete and saved to `docs/superpowers/plans/2026-03-18-dm-linkpage-plan.md`. Ready to execute?
