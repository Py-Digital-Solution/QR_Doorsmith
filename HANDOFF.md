# DoorSmith — AI Handoff Document

**Project:** DoorSmith Carpenter Rewards Platform  
**Client:** LR Enterprises  
**Agency:** Gati Growth Labs  
**Contract value:** INR 45,000 (inclusive GST)  
**Generated:** 2026-06-14  

---

## 1. Project Overview

DoorSmith is a **QR-code-based carpenter rewards (khati) platform**. Carpenters scan QR codes on door hardware products to earn points, then redeem them. The system runs on Next.js (Vercel), MongoDB (Oracle Always Free VM), MinIO (file storage), and a self-hosted WhatsApp bridge (Baileys) on the Oracle VM.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js App Router (latest — read `node_modules/next/dist/docs/` before touching routing) |
| Database | MongoDB via Mongoose (Oracle VM, `141.148.206.190`) |
| Auth | NextAuth v5 (Auth.js) — JWT sessions, no DB adapter |
| Storage | MinIO (Oracle VM) — S3-compatible, bucket `doorsmith` |
| WhatsApp | Self-hosted Baileys bridge at `whatsapp-service/index.mjs` (port 3099) |
| OTP | Firebase Phone Auth (production), magic code `1111` (dev) |
| Styling | Tailwind CSS v4 — custom design system in `src/components/ui/` |
| Process mgr | PM2 on Oracle VM |

### Environment Variables (`.env.local`)
```
MONGODB_URI=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
WA_SERVICE_URL=http://localhost:3099        # change to Oracle VM IP in prod
WA_SERVICE_SECRET=123456789qwertyuiopasdfghjklzxcvbnm
OTP_DEV_MODE=false
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
S3_ENDPOINT=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=doorsmith
CRON_SECRET=...                             # protects /api/cron/nightly-summary
```

---

## 3. Role Hierarchy (SOW 1.2)

```
admin
  └── sales_rep / distributor
        └── counter
              └── khati (carpenter)
```

- **admin** — full system access
- **sales_rep** — manages counters, approves khati KYC
- **distributor** — same as sales_rep (optional, toggled in settings)
- **counter** — registers khatis, scans returns, settles redemptions
- **khati** — scans QR codes, earns points, redeems rewards

### Route Protection
Route gating is **layout-level** (NOT middleware). Each area has a layout calling `requireRole()`:
- `src/app/admin/layout.tsx` → `requireRole(["admin"])`
- `src/app/approvals/layout.tsx` → `requireRole(["admin","sales_rep","distributor"])` ← shared KYC page
- `src/app/counter/layout.tsx` → `requireRole(["counter"])`
- `src/app/sales/layout.tsx` → `requireRole(["sales_rep","distributor"])`
- `src/app/khati/layout.tsx` → `requireRole(["khati"])`
- `src/app/register/[token]/` — **public**, no auth

`src/lib/rbac.ts` has `AREA_ROLES` and `canAccessPath()` but these are **not wired to middleware** (no `middleware.ts` file exists). They are only used by `requireRole()` indirectly via `session.ts`.

---

## 4. Data Models

### `User` (`src/models/User.ts`)
All roles are stored in a single `users` collection.

Key fields:
- `role`: `"admin" | "sales_rep" | "distributor" | "counter" | "khati"`
- `status`: `"pending" | "active" | "suspended"`
- `phone` — sparse unique, khati login identifier
- `email` — sparse unique, staff login identifier
- `passwordHash` — staff only
- `counterId` — khati → their counter (explicit link)
- `createdBy` — who created this user
- `points` — current redeemable balance
- `lifetimePoints` — all-time earned (never decremented)
- `photoUrl` — MinIO URL (uploaded via registration form)
- `address`, `dob` — collected on registration form
- `kycStatus`: `"not_submitted" | "pending_counter" | "pending_sales_rep" | "pending_admin" | "approved" | "rejected"`
- `registrationToken` — one-time base64url token, cleared on KYC approval

### `QrCode` (`src/models/QrCode.ts`)
- `type`: `"master" | "small" | "product"`
- `status`: `"inactive" | "active" | "scanned"`
- `parentQrId` — small→master or product→small
- `rewardPoints` — points awarded on scan
- `scannedByKhatiId`, `scannedAt`
- `returned`, `returnedAt`
- `counterId` — which counter this code belongs to

### `QrBatch` (`src/models/QrBatch.ts`)
- Groups of generated QR codes
- `status`: `"inactive" | "active" | "dispatched"`

### `PointTransaction` (`src/models/PointTransaction.ts`) ← NEW
- `khatiId`, `qrCodeId`, `returnId`, `redemptionId`
- `type`: `"scan_product" | "scan_small_box" | "return_reversal" | "redemption_lock" | "redemption_unlock" | "manual_adjustment"`
- `points` — positive = earned, negative = deducted
- `balanceAfter` — running balance snapshot
- `sku`, `serialNo`, `description`

### `AuditLog` (`src/models/AuditLog.ts`) ← NEW
- `actorId`, `actorRole`, `actorName`
- `action`: `"kyc_approve" | "kyc_reject" | "user_create" | "user_delete" | "dispatch_create" | "return_create" | "redemption_settle"` (etc.)
- `entityType`, `entityId`, `meta` (mixed JSON)

### `WaLog` (`src/models/WaLog.ts`)
- Logs every WhatsApp send attempt
- `phone`, `message`, `type`, `status: "sent" | "failed"`, `error`

### `Dispatch`, `Return`, `Redemption`, `Product`, `Settings`, `Otp`, `Sequence`
Standard models. See `src/models/`.

---

## 5. KYC Registration Flow

### Flow
1. Admin/counter **creates khati** → `status: "pending"`, `kycStatus: "not_submitted"`, `registrationToken` generated
2. WhatsApp sent to khati with link: `{appUrl}/register/{token}` (bilingual Hindi+English)
3. Khati fills form at `/register/[token]` — address, DOB, optional email, optional photo (upload or camera)
4. Photo uploaded to MinIO at `avatars/{userId}-{timestamp}.{ext}`
5. On submit → `kycStatus: "pending_counter"`, WhatsApp sent to counter

### Approval Chain
- **Counter approves** → `pending_sales_rep` (WA to sales rep + WA to khati "counter approved, awaiting sales rep") OR `pending_admin` if no sales rep (WA to admin + WA to khati)
- **Sales rep approves** → **immediately `approved` + `status: active`** (WA congratulations to khati)
- **Admin approves** → **immediately `approved` + `status: active`** (WA congratulations to khati)
- **Any role rejects** → `kycStatus: "rejected"` (WA rejection + reason to khati)

### KYC Pages
- `/counter/kyc` — counter sees `pending_counter` khatis
- `/approvals` — shared layout; admin sees `pending_admin`, sales_rep sees `pending_sales_rep`
  - **IMPORTANT**: `/approvals` uses its own layout (`src/app/approvals/layout.tsx`) — not the admin layout. The old `/admin/kyc` page still exists but is unused.
- Both pages have: search bar, pagination, View button (SlideOver with full details + photo), Approve/Reject actions
- `KycCard` client component (`src/components/KycCard.tsx`) handles the card + drawer

---

## 6. WhatsApp Integration

### Architecture
- `whatsapp-service/index.mjs` — standalone Express server using Baileys (WhatsApp Web protocol)
- `WA_SERVICE_URL` points to this service; Next.js calls it via `waSend()` in `src/services/whatsapp.ts`
- Session stored in `whatsapp-service/auth_info/`

### Phone Normalization
`normalizePhone()` in `src/services/whatsapp.ts` runs on **every** `waSend()` call:
- 10-digit → `+91XXXXXXXXXX`
- 12-digit starting with `91` → `+91XXXXXXXXXX`
- Already has `+` → unchanged

### All Messages Are Bilingual (Hindi + English)
Every WhatsApp message includes both languages. Messages sent:
1. **OTP login code** — sent to khati on login
2. **Welcome + registration link** — on khati account creation
3. **Resend registration link** — manual resend from admin
4. **Counter notification** — new khati submitted registration
5. **Khati: counter approved** — WA to khati when counter approves
6. **Sales rep notification** — counter approved, needs review
7. **Khati: sales rep approved / final approval** — congratulations, account ready
8. **Admin notification** — final approval needed
9. **Rejection** — with reason
10. **Nightly summary** — 11:30 PM IST, points today + balance

### Failure Handling
- On send failure: logged to `WaLog` as `"failed"` + email alert to `notification_email` setting
- On send success: logged to `WaLog` as `"sent"`
- All KYC notification failures log to console as `[kyc] ...`

---

## 7. Admin Features

### Users (`/admin/users`)
- Full CRUD with role-based creation hierarchy
- Role bubble filter pills (All, Admin, Sales Rep, Distributor, Counter, Khati)
- Search by name, pagination
- Avatar in table rows (MinIO photo or initials)
- User detail SlideOver: avatar, name, role, email, phone, status badge, **KYC approval status** (for khatis)
- "Resend Link" button on pending khatis

### Settings (`/admin/settings`)
- WhatsApp tab: connection panel, notification email config, WA audit log (paginated, side drawer)
- Distributor role toggle
- Branding settings

### Audit Log (`/admin/audit`) ← NEW
- All admin/system events with actor, action, entity, timestamp
- Filterable by action type, searchable by actor name
- Side drawer for full event details
- Currently wired: kyc_approve, kyc_reject, user_create, user_delete

### Dashboards ← NEW
Three custom dashboards at `/admin/dashboards/`:
1. **Overview** (`/overview`) — active khatis, scans today, points distributed today, pending KYC, returns today
2. **QR Activity** (`/qr-activity`) — active/scanned/returned counts, return rate %, top 5 earners leaderboard
3. **Returns & Fraud** (`/returns-fraud`) — 30-day/7-day return counts, reactivated QR codes (fraud signal), top returners table

---

## 8. Nightly Cron (`/api/cron/nightly-summary`)

- **Schedule**: `0 18 * * *` UTC = 11:30 PM IST
- **Config**: `vercel.json` at project root
- **Auth**: `Authorization: Bearer {CRON_SECRET}` header (set env var)
- **Logic**: Queries all active khatis → sums today's `PointTransaction` with `points > 0` → sends bilingual WA summary
- **Skips** khatis with 0 today + 0 balance to avoid spam

---

## 9. Phone Scan Flow

```
POST /api/khati/scan  { serialNo }
  → processQrScan() in src/services/khati.ts
    → validates code (active, belongs to khati's counter)
    → marks QrCode as scanned
    → $inc user.points + lifetimePoints
    → creates PointTransaction (non-blocking)
    → returns { pointsEarned, newBalance, sku, type }
```

Returns flow:
```
POST /api/counter/return  { serialNo }
  → returnQrCode() in src/services/khati.ts
    → validates (scanned, belongs to counter)
    → $inc user.points by -pts
    → marks QrCode as active again (returned=true)
    → creates Return record
    → creates PointTransaction (type: "return_reversal", points: negative)
```

---

## 10. Design System

All UI uses a custom Tailwind design system in `src/components/ui/`:
- `Button`, `Input`, `Select`, `Textarea`, `Field`, `Label`, `FieldError`
- `Alert` (success/error/info)
- `Badge` with `statusTone()` helper
- `Card`, `CardHeader`, `CardBody`
- `Table`, `THead`, `TH`, `TR`, `TD`, `MobileCardList`, `MobileCard`
- `Modal`, `SlideOver`
- `Pagination` — URL-based, `?page=N`
- `FilterBar` — debounced search + page size + Excel/PDF export
- `StatCard` — tones: default, brand, green, blue, yellow, red
- `PageHeader`, `EmptyState`
- `icons.ts` — lucide-react icon map keyed by string name

**Colors**: brand `#f6821f`, brand-dark `#d96d10`, brand-light `#fff3e8`, navy `#0f2444`

---

## 11. Known Architecture Decisions & Gotchas

1. **No middleware.ts** — Route protection is layout-level only. The `authorized` callback in `auth.config.ts` exists but is unused (no middleware file).

2. **`/approvals` vs `/admin/kyc`** — KYC for sales_rep/distributor/admin lives at `/approvals` with its own layout. The old `/admin/kyc` page still exists but is a dead route (admin layout would block non-admins). **Do not add links to `/admin/kyc`**.

3. **Phone normalization in `waSend`** — All phone numbers are normalized at send time. Counter/sales_rep phones may be stored without country code (10-digit) since only khati creation normalizes on save.

4. **Mongoose model caching** — In Next.js dev hot-reload, old compiled models can be cached. If schema changes don't appear, **full server restart required**.

5. **MongoDB standalone** — No replica set configured. Multi-document transactions (`session.startTransaction()`) will fail. All writes use individual `$inc` operations. Points consistency relies on app-layer ordering, not DB transactions.

6. **MinIO photos are public** — Bucket policy allows public GET on `avatars/*`. Photo URLs are direct MinIO URLs embedded in `user.photoUrl`.

7. **`AREA_ROLES` order matters** — `/admin/kyc` must come before `/admin` in the object to match first in `areaForPath()`. Current order is correct.

8. **Sales rep approves = final** — When sales_rep approves a khati, the khati is immediately `approved` + `active`. No admin approval needed unless the counter's chain goes directly to admin (no sales rep).

9. **PointTransaction writes are non-blocking** — `.catch()` logs but doesn't throw. A failed write will not fail the scan.

10. **AuditLog writes are fire-and-forget** — `logAudit()` never throws. Missing audit entries are possible if DB is down.

---

## 12. Pending Work (SOW Items Not Yet Built)

### High Priority
| Item | Detail |
|---|---|
| **Redemption status enum** | SOW calls for `pending → locked → ready_for_delivery → delivered → cancelled` + auto-generated token `RDM-XXXXXX`. Current schema has `pending/approved/rejected`. Needs model migration + UI update. |
| **Wire AuditLog more broadly** | Currently only kyc_approve/reject and user_create/delete are logged. Missing: dispatch_create, return_create, redemption_settle, qr_batch_create, scan_qr. |
| **Wire PointTransaction for redemptions** | Redemption point lock/unlock should create `PointTransaction` of type `redemption_lock` / `redemption_unlock`. |
| **MongoDB replica set** | Required for any future multi-document atomic operations. Configure on Oracle VM. |

### Medium Priority
| Item | Detail |
|---|---|
| **Confidentiality controls (SOW 1.6)** | Counter must NOT see khati's total balance, purchase history, or points balance. Currently the counter redemption page shows point info — need to audit and restrict. |
| **Return incentive points** | SOW mentions optional bonus points on return. `Return` model has no `returnIncentivePoints` field. |
| **Distributor-specific routes** | Toggle exists, distributor shares `/sales` with sales_rep, but no distinct distributor views. |

### Infrastructure (Pre-Production Blockers)
| Item | Detail |
|---|---|
| MongoDB TLS | Currently plain TCP, public IP — enable TLS before launch |
| MinIO HTTPS | Plain HTTP — enable TLS |
| Credential rotation | Secrets in `.env` files on Oracle VM — rotate before launch |
| `CRON_SECRET` | Must be set in Vercel env vars for nightly cron protection |
| WhatsApp service on Oracle VM | `whatsapp-service/` — deploy with PM2, set `.env` with `WA_SERVICE_PORT=3099` and `WA_SERVICE_SECRET` |

---

## 13. Key Files Quick Reference

| What | Where |
|---|---|
| Role hierarchy + route permissions | `src/lib/rbac.ts` |
| Nav items per role | `src/lib/nav.ts` |
| All WhatsApp sends | `src/services/whatsapp.ts` → `waSend()` |
| KYC approval logic | `src/services/kyc.ts` → `approveKyc()`, `rejectKyc()` |
| Scan + points logic | `src/services/khati.ts` → `processQrScan()` |
| Audit log helper | `src/services/audit.ts` → `logAudit()` |
| Registration form | `src/app/register/[token]/RegisterForm.tsx` |
| KYC card component | `src/components/KycCard.tsx` |
| Nightly cron | `src/app/api/cron/nightly-summary/route.ts` |
| WA service | `whatsapp-service/index.mjs` |
| WhatsApp bridge env | `whatsapp-service/.env` |

---

## 14. SOW Free Tier Limits

- Up to 10,000 Carpenter accounts
- Up to 100,000 QR scans/day
- Up to 2,000 QR code generations/day
- Up to 1,000 WhatsApp messages/day

Hosting on Vercel free tier; Agency bears additional costs for Year 1 if within thresholds.
