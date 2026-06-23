# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build           # Build for production
npm run start           # Run production build locally
npm run typecheck       # Check types without emitting
npm run lint            # Run ESLint

# Database operations
npm run db:seed         # Seed database
npm run db:indexes      # Sync MongoDB indexes
npm run db:create-admin # Create admin user
npm run db:migrate-display-ids  # Backfill displayId on users
```

## Project Overview

**DoorSmith**: QR-code-based carpenter (khati) rewards platform. Carpenters scan QR codes on products to earn points, then redeem them.

- **Framework**: Next.js 16.2 (App Router) on Vercel
- **Database**: MongoDB via Mongoose on Oracle Always Free VM (`141.148.206.190`)
- **Auth**: NextAuth v5 (Auth.js) with JWT sessions, no DB adapter
- **Storage**: MinIO (S3-compatible) on Oracle VM, bucket `doorsmith`
- **WhatsApp**: Self-hosted Baileys bridge at `whatsapp-service/index.mjs` (port 3099)
- **OTP**: Firebase Phone Auth (production), magic code `1111` (dev)
- **Styling**: Tailwind CSS v4 + custom design system in `src/components/ui/`

**⚠️ IMPORTANT**: Next.js 16.2 has breaking changes. Read `node_modules/next/dist/docs/` before writing routing or API code. Heed deprecation notices.

## Role Hierarchy

```
admin
  ├── sales_rep / distributor
  │     └── counter
  │           └── khati (carpenter)
```

Route protection is **layout-level only** (no middleware.ts):
- `src/app/admin/layout.tsx` → requires admin
- `src/app/approvals/layout.tsx` → requires admin/sales_rep/distributor (shared KYC page)
- `src/app/counter/layout.tsx` → requires counter
- `src/app/sales/layout.tsx` → requires sales_rep/distributor
- `src/app/khati/layout.tsx` → requires khati
- `src/app/register/[token]/` → public (no auth)

## Key Data Models

| Model | Key Fields | Location |
|---|---|---|
| **User** | `role` (admin/sales_rep/distributor/counter/khati), `phone`, `email`, `passwordHash`, `counterId`, `points`, `lifetimePoints`, `kycStatus` | `src/models/User.ts` |
| **QrCode** | `type` (master/small/product), `status`, `rewardPoints`, `scannedByKhatiId`, `returned` | `src/models/QrCode.ts` |
| **PointTransaction** | `khatiId`, `qrCodeId`, `type` (scan_product/scan_small_box/return_reversal/redemption_lock/etc), `points`, `balanceAfter` | `src/models/PointTransaction.ts` |
| **AuditLog** | `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `meta` | `src/models/AuditLog.ts` |
| **WaLog** | `phone`, `message`, `type`, `status` (sent/failed) | `src/models/WaLog.ts` |

## KYC Registration Flow

1. Admin/counter creates khati → `status: "pending"`, `kycStatus: "not_submitted"`, `registrationToken` generated
2. WhatsApp sent with link: `{appUrl}/register/{token}` (bilingual Hindi+English)
3. Khati fills form at `/register/[token]` → photo upload to MinIO at `avatars/{userId}-{timestamp}.{ext}`
4. On submit → `kycStatus: "pending_counter"`, WhatsApp to counter
5. **Counter approves** → `pending_sales_rep` or `pending_admin` (if no sales_rep)
6. **Sales rep/Admin approves** → `approved` + `status: active` (immediate, no further approval needed)

**KYC Pages**: `/counter/kyc` (counter view) and `/approvals` (admin/sales_rep/distributor shared view). The old `/admin/kyc` is dead code.

## WhatsApp Integration

- All messages are **bilingual** (Hindi + English)
- Phone normalization runs on every `waSend()`: 10-digit → `+91XXXXXXXXXX`
- Messages include: OTP login, registration link, approval notifications, nightly summary (11:30 PM IST)
- Failures logged to `WaLog` as `"failed"` + email alert to `notification_email` setting
- Logic in `src/services/whatsapp.ts`

## Nightly Cron

- **Schedule**: `0 18 * * *` UTC = 11:30 PM IST (configured in `vercel.json`)
- **Route**: `POST /api/cron/nightly-summary` with `Authorization: Bearer {CRON_SECRET}`
- **Logic**: Sums today's `PointTransaction` for each active khati, sends bilingual WA summary
- **Skips** khatis with 0 today + 0 balance to avoid spam

## Common Flows

### Phone Scan (Earn Points)
```
POST /api/khati/scan { serialNo }
  → src/services/khati.ts: processQrScan()
    → validates QR (active, belongs to khati's counter)
    → marks QrCode as scanned
    → $inc user.points + lifetimePoints
    → creates PointTransaction (non-blocking)
```

### Return QR Code
```
POST /api/counter/return { serialNo }
  → src/services/khati.ts: returnQrCode()
    → validates (scanned, belongs to counter's khatis)
    → $inc user.points by -pts
    → marks QrCode as active again (returned: true)
    → creates Return record + PointTransaction
```

### Approve KYC
```
src/services/kyc.ts: approveKyc(khatiId, approverId)
  → updates User.kycStatus = "approved", User.status = "active"
  → clears registrationToken
  → logs to AuditLog
  → sends congratulations WhatsApp (bilingual)
```

## Key Files Quick Reference

| What | Where |
|---|---|
| Role hierarchy + `requireRole()` | `src/lib/rbac.ts` |
| Nav items per role | `src/lib/nav.ts` |
| All WhatsApp sends + normalization | `src/services/whatsapp.ts` |
| KYC approval logic | `src/services/kyc.ts` |
| Scan + points logic | `src/services/khati.ts` |
| Audit logging helper | `src/services/audit.ts` |
| Registration form (public) | `src/app/register/[token]/RegisterForm.tsx` |
| KYC card component | `src/components/KycCard.tsx` |
| Design system (UI components) | `src/components/ui/` |
| Admin users CRUD | `src/app/admin/users/` |
| KYC approval pages | `/counter/kyc` and `/approvals` |
| Nightly cron job | `src/app/api/cron/nightly-summary/route.ts` |
| WhatsApp service (Express) | `whatsapp-service/index.mjs` |

## Important Gotchas

1. **No middleware.ts**: Route protection is layout-level only. The `authorized` callback in `auth.config.ts` exists but is unused.

2. **`/approvals` vs `/admin/kyc`**: KYC for sales_rep/distributor/admin lives at `/approvals` with its own layout. `/admin/kyc` still exists but is dead (admin layout blocks non-admins). **Do not add links to `/admin/kyc`**.

3. **Phone normalization in `waSend()`**: All phone numbers are normalized at send time via `normalizePhone()`. Khati phones are normalized on user creation; counter/sales_rep phones may be stored as 10-digit and normalized when sending WA.

4. **Mongoose model caching**: In Next.js dev hot-reload, old compiled models can be cached. If schema changes don't appear, **full server restart required**.

5. **No MongoDB transactions**: Standalone MongoDB (no replica set). All point writes use individual `$inc` operations. Points consistency relies on app-layer ordering.

6. **MinIO photos are public**: Bucket policy allows public GET on `avatars/*`. Photo URLs are direct MinIO URLs in `user.photoUrl`.

7. **Sales rep approves = final**: When sales_rep approves a khati, the khati is immediately `approved` + `active`. No admin approval needed unless the counter's chain goes directly to admin.

8. **PointTransaction writes are non-blocking**: `.catch()` logs but doesn't throw. A failed write will not fail the scan.

9. **AuditLog writes are fire-and-forget**: `logAudit()` never throws. Missing audit entries are possible if DB is down.

## Environment Variables

Required in `.env.local`:
- `MONGODB_URI` → MongoDB connection string
- `NEXTAUTH_SECRET` → Auth signing key
- `NEXTAUTH_URL` → App base URL (e.g., http://localhost:3000)
- `WA_SERVICE_URL` → WhatsApp bridge URL (http://localhost:3099 in dev)
- `WA_SERVICE_SECRET` → Shared secret with WhatsApp service
- `OTP_DEV_MODE` → false in production, true to use magic code 1111
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` → Firebase phone auth
- `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` → MinIO config
- `CRON_SECRET` → Protects `/api/cron/nightly-summary`

## Pending Work (Not Yet Implemented)

- **Redemption status enum**: SOW calls for `pending → locked → ready_for_delivery → delivered → cancelled` + auto token `RDM-XXXXXX`. Current schema has `pending/approved/rejected`.
- **Broader AuditLog**: Currently only kyc_approve/reject and user_create/delete. Missing: dispatch_create, return_create, redemption_settle, qr_batch_create, scan_qr.
- **PointTransaction for redemptions**: Redemption point lock/unlock should create `PointTransaction` of type `redemption_lock`/`redemption_unlock`.
- **Confidentiality controls**: Counter must NOT see khati's total balance or point history. Currently counter redemption page shows point info — needs audit and restriction.

## Deployment

Deployed on **Vercel** (Next.js SSR/hybrid). Netlify build settings in `netlify.toml` as backup. MongoDB and MinIO run on **Oracle Always Free VM**.
