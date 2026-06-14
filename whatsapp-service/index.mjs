/**
 * DoorSmith WhatsApp Bridge
 * ─────────────────────────
 * Runs as a standalone process on the Oracle VM.
 * The Next.js app calls this service via HTTP to:
 *   - GET  /status       → current connection state
 *   - GET  /qr           → QR code PNG (base64) while connecting
 *   - POST /connect      → start / restart connection
 *   - POST /disconnect   → clear session and stop
 *   - POST /send         → { phone, message } → sends WhatsApp message
 *
 * Auth: every request must carry  Authorization: Bearer <WA_SERVICE_SECRET>
 * Set WA_SERVICE_SECRET and WA_SERVICE_PORT in environment (or .env file).
 *
 * Node 12 compatible — no ??, no ?., no fs.rm (use rmdir recursive instead).
 */

import express from "express";
import qrcode from "qrcode";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, promises as fsPromises } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ─── Config ───────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.WA_SERVICE_PORT || 3099);
const SECRET = process.env.WA_SERVICE_SECRET || "";
const AUTH_DIR = resolve(__dir, "auth_info");

if (!SECRET) {
  console.warn(
    "[wa] WA_SERVICE_SECRET is not set — the service is open to anyone on the network!",
  );
}

// Minimal pino-compatible logger for Baileys — avoids pino's node:os dependency
// which requires Node 14.18+. Baileys only calls child() + warn/error at runtime.
const noop = function() {};
const logger = {
  level: "silent",
  trace: noop, debug: noop, info: noop,
  warn: noop,  error: noop, fatal: noop,
  child: function() { return logger; },
};

// ─── State ────────────────────────────────────────────────────────────────────
/** @type {"disconnected"|"connecting"|"connected"} */
let status = "disconnected";
let currentQr = null;       // base64 PNG data-URI
let connectedPhone = null;  // e.g. "+919876543210"
let sock = null;

// ─── Baileys session ──────────────────────────────────────────────────────────
async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  status = "connecting";
  currentQr = null;

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,
    browser: ["DoorSmith", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // New QR code available — convert to data-URI PNG
      currentQr = await qrcode.toDataURL(qr);
      status = "connecting";
      console.log("[wa] QR refreshed — waiting for scan");
    }

    if (connection === "open") {
      const user = sock.user || {};
      const jid = user.id || "";
      // jid is like "919876543210:0@s.whatsapp.net" — extract the number
      connectedPhone = "+" + jid.split(":")[0].split("@")[0];
      status = "connected";
      currentQr = null;
      console.log("[wa] Connected as " + connectedPhone);
    }

    if (connection === "close") {
      const boomError = lastDisconnect && lastDisconnect.error;
      const reason = new Boom(boomError).output.statusCode;
      console.log("[wa] Disconnected — reason: " + reason);

      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
        // Session invalidated or corrupted — delete auth then reconnect fresh for QR
        console.log("[wa] Bad/expired session — clearing auth, reconnecting for fresh QR");
        status = "disconnected";
        connectedPhone = null;
        sock = null;
        await fsPromises.rmdir(AUTH_DIR, { recursive: true }).catch(function() {});
        await startSocket();
      } else if (reason !== DisconnectReason.connectionReplaced) {
        // Transient error — reconnect automatically
        console.log("[wa] Reconnecting…");
        await startSocket();
      }
    }
  });
}

async function stopSocket() {
  if (sock) {
    try { sock.end(); } catch (_) {}
    sock = null;
  }
  status = "disconnected";
  currentQr = null;
  connectedPhone = null;
}

// Auto-connect on startup if auth already exists
if (existsSync(AUTH_DIR + "/creds.json")) {
  console.log("[wa] Existing session found — reconnecting");
  startSocket().catch(console.error);
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Auth middleware
app.use((req, res, next) => {
  if (!SECRET) return next(); // dev: no secret set
  const auth = req.headers["authorization"] || "";
  if (auth === "Bearer " + SECRET) return next();
  res.status(401).json({ error: "Unauthorized" });
});

app.get("/status", (_req, res) => {
  res.json({ status, phone: connectedPhone });
});

app.get("/qr", (_req, res) => {
  if (!currentQr) {
    return res.status(404).json({ error: "No QR code available" });
  }
  res.json({ qr: currentQr });
});

app.post("/connect", async (_req, res) => {
  if (status === "connected") {
    return res.json({ status, phone: connectedPhone });
  }
  if (status === "connecting") {
    return res.json({ status });
  }
  await startSocket();
  res.json({ status });
});

app.post("/disconnect", async (_req, res) => {
  await stopSocket();
  // Delete saved auth so next connect shows a fresh QR
  // fs.rmdir with recursive works on Node 12.10+ (fs.rm requires Node 14.14+)
  await fsPromises.rmdir(AUTH_DIR, { recursive: true }).catch(function() {});
  res.json({ status: "disconnected" });
});

app.post("/send", async (req, res) => {
  if (status !== "connected" || !sock) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }

  const body = req.body || {};
  const phone = body.phone;
  const message = body.message;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  // Normalise to JID: strip non-digits, append @s.whatsapp.net
  const digits = String(phone).replace(/\D/g, "");
  const jid = digits + "@s.whatsapp.net";

  try {
    await sock.sendMessage(jid, { text: String(message) });
    res.json({ ok: true });
  } catch (err) {
    console.error("[wa] Send error", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.listen(PORT, () => {
  console.log("[wa] WhatsApp service listening on port " + PORT);
});
