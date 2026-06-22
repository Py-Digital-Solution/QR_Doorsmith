# DoorSmith Khati Rewards  Project Plan

Implementation plan for the QR-based khati rewards web application defined in
`GGL_WEB_APPLICATION_DEVELOPMENT_AND_SERVICES_AGREEMENT_V3.pdf` (the SOW).

**Database:** MongoDB, self-hosted on Oracle Cloud Always Free (chosen by Client).

---

## 1. Architecture (locked)

```
        ┌─────────────────────────────────────────────┐
        │  Clients (installable PWA + web)            │
        │  Admin · Sales Rep · Distributor · Counter · │
        │  Khati                                       │
        └───────────────┬─────────────────────────────┘
                        │ HTTPS
        ┌───────────────▼─────────────────────────────┐
        │  Next.js (App Router) on VERCEL              │
        │  • UI (React + Tailwind)                     │
        │  • API routes / Server Actions               │
        │  • Auth.js (NextAuth) sessions               │
        │  • Service layer (enforces access + refs)    │
        └───────┬───────────────────────┬──────────────┘
                │ MongoDB (TLS, pooled)  │ HTTPS
        ┌───────▼───────────┐   ┌────────▼───────────────┐
        │ ORACLE CLOUD       │   │ Meta WhatsApp Cloud API│
        │ Always Free VM     │   │ Firebase (SMS OTP)     │
        │ (4 OCPU/24GB/200GB)│   └────────────────────────┘
        │ • MongoDB          │  ← single-node REPLICA SET (enables transactions)
        │ • MinIO (S3 files) │  ← khati photos, product PDFs, QR print PDFs
        │ • system cron jobs │  ← 23:30 WhatsApp summary + nightly archive
        │ • QR/PDF worker    │  ← heavy batch QR PDF generation
        └────────────────────┘
```

**Why this shape**
- Vercel hosts the stateless app (SOW requires Vercel deployment).
- The Oracle VM holds everything stateful and free-for-life: MongoDB (200 GB room),
  file storage (MinIO), scheduled jobs (system cron), and the heavy QR-PDF worker
  (Vercel serverless limits make big PDF batches unreliable).
- **MongoDB runs as a single-node replica set** so multi-document transactions are
  available  required for atomic point-ledger updates.

**What MongoDB does NOT give us (vs a SQL DB)  we handle it in the app layer:**
- *No row-level security* → confidentiality (SOW 1.6) enforced by a service layer that
  always scopes queries by role/counter. Client never touches collections directly.
- *No foreign keys* → reference integrity (QR hierarchy, ownership) validated in
  Mongoose + service code.
- *Transactions need a replica set* → use Mongoose sessions for ledger writes.

---

## 2. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| Installable app | PWA (manifest + service worker)  camera + "install" per SOW 1.3 |
| DB | MongoDB (self-hosted, Oracle Always Free, single-node replica set) |
| DB access | Mongoose (schemas + validation + transactions) |
| Auth | Auth.js (NextAuth)  credentials for staff, phone OTP for khatis |
| OTP/SMS | Firebase (SOW-named, ≤1,000/day) |
| WhatsApp | Meta WhatsApp Cloud API (Client provides business number) |
| QR scan | `@zxing/library` / `html5-qrcode` in-browser |
| QR generation | `qrcode` + server-side PDF (`@react-pdf/renderer` / Puppeteer) on VM worker |
| File storage | MinIO on the Oracle VM (S3-compatible) |
| Scheduled jobs | Linux cron on the Oracle VM |

---

## 3. Data model (MongoDB collections)

Maps every SOW clause. Mongoose schemas give validation; uniqueness via unique
indexes; references validated in the service layer (Mongo has no FKs).

### Identity & hierarchy (SOW 1.2)
- **users**  `role(admin|sales_rep|distributor|counter|khati), name, phone (unique,
  sparse), email (unique, sparse), passwordHash, photoUrl, status, createdBy`
- **counters**  `name, ownerUserId, registeredByUserId, salesRepId, distributorId,
  location, status` (registered by sales rep/distributor; SOW 1.2)
- **khatis**  `userId, phone, photoUrl, registeringCounterId,
  approvedByCounterAt, approvedByAdminAt, status, balancePoints`
  - 2-way auth = counter approval then admin/sales-rep approval (SOW 1.3)
  - `balancePoints` = running wallet (kept hot; never archived)
- Distributor: global flag `settings.distributor_enabled = false` by default (SOW 1.2);
  distributors may register counters but **cannot** approve khatis.

### Products & QR generation (SOW 1.8)
- **products**  `sku (unique), name, mrp, salesPrice, rewardPoints, description, status`
- **qrBatches**  `createdBy, count, sheetConfig, status` (batch audit; "In Warehouse –
  Inactive" default)
- **qrCodes**  `serialNo (UNIQUE index), type(master|small|product),
  parentQrId, productId, batchId,
  status(inactive|active|scanned|disabled|returned|reactivated),
  points, mrp, salesPrice, scannedByKhatiId, scannedAt`
  - unique index on `serialNo` = preventive serialization guard (SOW 1.8)
  - `parentQrId` = Master → Small → Product traceability (SOW 1.8)

### Points ledger (SOW 1.4)  **HOT/COLD**
- **pointTransactions**  `khatiId, qrCodeId, counterId,
  type(credit|debit|reversal|redemption|return_incentive), points(signed),
  balanceAfter, note, createdAt`
  - Written inside a Mongoose transaction together with the khati balance update.
  - **Hot:** recent rows (UI needs last 20, SOW 1.3).
  - **Cold:** older docs archived nightly to MinIO/R2 (compressed) then purged.

### Redemption (SOW 1.5)
- **redemptions**  `token (UNIQUE, e.g. RDM-784512), khatiId, pointsLocked,
  rewardName, status(pending|locked|ready_for_delivery|delivered|cancelled),
  requestedAt, verifiedCounterId, settledByAdminId, deliveredAt`
  - Points locked until counter marks txn complete; **only admin settles** (SOW 1.5).

### Returns & reactivation (SOW 1.7)
- **returns**  `qrCodeId, khatiId, counterId, pointsReversed,
  returnIncentivePoints, status, processedByAdminId`
  - Reverses points, admin reactivates QR, no permanent duplication.

### Content, notifications, audit, dashboards
- **mediaLinks**  `type(video|offering), platform, url, fileUrl, title, active`
  (installation videos + product offerings, SOW 1.3)
- **notifications**  `userId, channel(inapp|whatsapp|sms), message, status, sentAt`
- **auditLog**  `actorUserId, action, entityType, entityId, details, createdAt`
  (admin monitoring of fraud/misuse, SOW 1.7 & 1.8)
- **dashboards**  `name, config, roleVisibility` (up to 3 custom, SOW 1.9)
- **settings**  global flags (distributor toggle, point rules, …)

### Confidentiality (SOW 1.6)
MongoDB has no row-level security, so **all reads go through a service layer** that
scopes by role/counter (a counter can never query other counters' sales, wallets, or
scan history). The browser never queries collections directly.

---

## 4. Hot / Cold archive strategy (keeps it free forever)

The Oracle VM has 200 GB, so storage pressure is low  but we still archive to keep
queries fast and backups small.
- Nightly cron rolls up + exports old `pointTransactions` to compressed files in MinIO
  (and optionally Cloudflare R2, 10 GB free, zero egress).
- Resolved QR codes / closed redemptions likewise archived.
- Hot DB stays small and fast; full audit history preserved cheaply.

---

## 5. Build phases

| Phase | Scope | SOW |
|---|---|---|
| **0. Infra** ✅ scaffold done | Next.js app, Mongoose connection + models, env, seed/index scripts. Remaining: Oracle VM (MongoDB replica set + MinIO), Vercel project, `doorsmith.in` subdomain, backups | 3.2 |
| **1. Auth & roles** | 5-role hierarchy, staff credentials, khati phone OTP, admin user mgmt, distributor toggle | 1.2 |
| **2. Products & QR portal** | SKU/MRP/points, batch gen, Master→Small→Product linking, serialization guard, print-ready PDF export | 1.8 |
| **3. Registration flows** | Counter registers khati, photo capture, 2-way approval | 1.2, 1.3 |
| **4. Scanning & ledger** | 3 QR types, small-box disables inner QRs, credit points (transaction), in-app notification | 1.4 |
| **5. Redemption** | Lock points, generate RDM token, counter verify view, admin settle | 1.5 |
| **6. Returns & reactivation** | Scan return, reverse points, reactivate QR, return incentive, audit | 1.7 |
| **7. Confidentiality & dashboards** | Service-layer access control, admin/sales dashboards + 3 custom | 1.6, 1.9 |
| **8. Notifications** | 23:30 WhatsApp daily summary cron, in-app notifications | 1.4 |
| **9. PWA, test, launch** | Installable PWA polish, QA, go-live, 3-month hyper-care | 1.9 |

---

## 6. Key risks / open items
- **Exposing MongoDB to Vercel securely**  Vercel Hobby egress IPs are dynamic, so IP
  allowlisting is hard. Plan: enforce TLS + SCRAM auth + strong creds + host firewall +
  fail2ban; bind mongod only to the needed interface. Consider a thin data API on the VM.
- **Transactions require a replica set**  a standalone mongod has none. Configure a
  single-node replica set (`rs.initiate()`, URI `?replicaSet=rs0`).
- **App-layer integrity & confidentiality**  Mongo enforces neither FKs nor RLS; the
  service layer must validate references and scope every read (SOW 1.6/1.7). Higher test
  burden here.
- **Oracle idle reclamation**  Always Free ARM VMs can be reclaimed if idle; production
  traffic + keepalive prevents this. We own backups (scripted `mongodump` to MinIO/R2).
- **Oracle A1 capacity**  the free ARM shape is often "out of capacity"; may need region
  choice / retries to provision.
- **WhatsApp Cloud API**  needs Client-provided business number + Meta template approval;
  variable costs billed to Client (SOW 3.4).
- **QR print PDF at scale**  2,000/day; run on VM worker, not Vercel serverless.
- Client must provide: media assets (videos), WhatsApp number, domain access (SOW §2).
