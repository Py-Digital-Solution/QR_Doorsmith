# Security Hardening — DoorSmith

Status of the current setup and the steps to harden it before go-live. Items
marked **[app]** are done in code; **[infra]** require action on the Oracle VM.

---

## Current state (must fix before production)
- 🔴 **MongoDB**: public IP, port 27017, **no TLS**, credentials shared in plaintext.
- 🔴 **MinIO**: `secure=False` (plain HTTP), default-style key `minioadmin`.
- 🟡 **No replica set** → multi-document transactions don't work yet (needed for
  the points ledger in Phase 4).

---

## 1. Rotate credentials **[infra]**
Both the Mongo password and the MinIO keys were shared in plaintext — rotate them.

**MongoDB** (in `mongosh`, authenticated as admin):
```js
use admin
db.changeUserPassword("pydigitalsolution", "<NEW_STRONG_PASSWORD>")
```

**MinIO**: set new root credentials and restart the service:
```bash
# in the MinIO systemd env file (e.g. /etc/default/minio)
MINIO_ROOT_USER=doorsmith_admin
MINIO_ROOT_PASSWORD=<NEW_STRONG_SECRET>
sudo systemctl restart minio
```
Then update `.env.local` (local) and the **Vercel project env vars** (prod):
`MONGODB_URI`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.

---

## 2. Enable a single-node replica set (transactions) **[infra]**
Required so the points ledger can write atomically (Phase 4).

`/etc/mongod.conf`:
```yaml
replication:
  replSetName: rs0
security:
  authorization: enabled
```
Restart, then in `mongosh`:
```js
rs.initiate({
  _id: "rs0",
  members: [{ _id: 0, host: "141.148.206.190:27017" }]  // public IP so Vercel can reach the member
})
```
> ⚠️ The member `host` must be an address the app (on Vercel) can resolve/reach.
> If it's `localhost`, external clients can't use the replica set.

Then set the URI to include the replica set:
```
mongodb://USER:PASS@141.148.206.190:27017/doorsmith?replicaSet=rs0&authSource=admin&tls=true
```

---

## 3. Enable TLS **[infra]**
**MongoDB** — `/etc/mongod.conf`:
```yaml
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongo/mongo.pem
```
Connect with `?tls=true` in the URI (already in `.env.example`).

**MinIO** — drop a cert + key into the certs dir and restart:
```bash
~/.minio/certs/public.crt
~/.minio/certs/private.key
sudo systemctl restart minio
```
Then change `S3_ENDPOINT` from `http://…:9000` to `https://…:9000`.

Use a real cert (Let's Encrypt via a domain pointing at the VM) or a private CA.

---

## 4. Network / firewall **[infra]**
- Lock the OCI **security list / NSG** ingress to only the ports you need
  (27017, 9000, plus 443/80 if serving).
- Vercel's egress IPs are **dynamic** on Hobby, so you can't IP-allowlist the
  app. Rely on **TLS + strong SCRAM auth**. For stronger isolation, consider a
  tunnel (Tailscale/WireGuard) or a thin API in front of Mongo.
- Install **fail2ban** to throttle brute-force on SSH/Mongo.

---

## What's already handled in code **[app]**
- ✅ Passwords hashed with **bcrypt**; `passwordHash` never leaves the server (DTOs omit it).
- ✅ **OTP throttle**: 30s cooldown between sends per phone; max 5 verify attempts; codes stored hashed with a 5-min TTL.
- ✅ **Auth.js JWT** sessions; role gating in edge middleware + per-area layout checks.
- ✅ **Service-layer access control** (Mongo has no RLS): counters/sales can only
  manage users they created; admin-only guards on products/QR actions.
- ✅ Env vars validated at startup (`src/lib/env.ts`); secrets git-ignored.

## Known limitations (future)
- A suspended/deleted user keeps access until their JWT expires (no live
  session revocation yet). Mitigate by shortening session lifetime if needed.
- No automated DB backups yet — script `mongodump` to MinIO/R2 on a cron.
