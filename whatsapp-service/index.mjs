/**
 * DoorSmith WhatsApp Bridge
 * ─────────────────────────
 * Runs as a standalone process on the Oracle VM.
 * The Next.js app calls this service via HTTP to:
 *   - GET  /status       → current connection state
 *   - GET  /qr           → QR code PNG (base64) while connecting
 *   - GET  /messages/:id/status → saved delivery and retry status
 *   - POST /connect      → start / restart connection
 *   - POST /disconnect   → clear session and stop
 *   - POST /send         → { phone, message, imageUrl? } → sends a WhatsApp
 *                          message and returns its message ID for status checks
 *
 * Auth: every request must carry  Authorization: Bearer <WA_SERVICE_SECRET>
 * Set WA_SERVICE_SECRET and WA_SERVICE_PORT in environment (or .env file).
 *
 * Runs as a standalone Node.js service; it does not start a Next.js server.
 */

import express from "express";
import qrcode from "qrcode";
import { createHash } from "node:crypto";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { existsSync, promises as fsPromises } from "fs";
import { isAbsolute, relative, resolve, dirname, sep } from "path";
import { fileURLToPath } from "url";
import { MessageStore } from "./message-store.mjs";
import { createDelivery } from "./delivery.mjs";

// ─── Config ───────────────────────────────────────────────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.WA_SERVICE_PORT || 3099);
const SECRET = process.env.WA_SERVICE_SECRET || "";
const AUTH_DIR = resolve(__dir, "auth_info");
const MESSAGE_DIR = resolve(__dir, process.env.WA_MESSAGE_DIR || "auth_info-messages");
const MESSAGE_TTL_HOURS = Number(process.env.WA_MESSAGE_TTL_HOURS || 24);
if (!Number.isFinite(MESSAGE_TTL_HOURS) || MESSAGE_TTL_HOURS < 1 || MESSAGE_TTL_HOURS > 168) {
  throw new Error("WA_MESSAGE_TTL_HOURS must be between 1 and 168");
}
const relativeMessageDir = relative(AUTH_DIR, MESSAGE_DIR);
if (!relativeMessageDir || (!relativeMessageDir.startsWith(`..${sep}`) && relativeMessageDir !== ".." && !isAbsolute(relativeMessageDir))) {
  throw new Error("WA_MESSAGE_DIR must be outside the WhatsApp auth directory");
}

if (!SECRET) {
  console.warn(
    "[wa] WA_SERVICE_SECRET is not set  the service is open to anyone on the network!",
  );
}

// Minimal pino-compatible logger for Baileys  avoids pino's node:os dependency
// which requires Node 14.18+. Baileys only calls child() + warn/error at runtime.
const noop = function() {};
const logger = {
  level: "silent",
  trace: noop, debug: noop, info: noop,
  warn: noop,  error: noop, fatal: noop,
  child: function() { return logger; },
};

const messageStore = await new MessageStore(MESSAGE_DIR, { ttlMs: MESSAGE_TTL_HOURS * 3_600_000 }).init();
const cleanupTimer = setInterval(() => {
  messageStore.cleanup().catch((err) => console.error("[wa] Message-store cleanup failed:", err.message));
}, 60_000);
cleanupTimer.unref();

// ─── State ────────────────────────────────────────────────────────────────────
/** @type {"disconnected"|"connecting"|"connected"} */
let status = "disconnected";
let currentQr = null;       // base64 PNG data-URI
let connectedPhone = null;  // e.g. "+919876543210"
let sock = null;
let delivery = null;

// ─── Baileys session ──────────────────────────────────────────────────────────
async function startSocket() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const identityKey = state.creds.signedIdentityKey && state.creds.signedIdentityKey.public;
  if (!identityKey) throw new Error("WhatsApp session identity key is unavailable");
  const session = createHash("sha256").update(identityKey).digest("hex");
  const socketDelivery = createDelivery({
    store: messageStore,
    session,
    logger,
    log: (...args) => console.log("[wa]", ...args),
  });

  status = "connecting";
  currentQr = null;

  const socket = makeWASocket({
    version,
    auth: state,
    logger,
    getMessage: socketDelivery.getMessage,
    maxMsgRetryCount: 5,
    printQRInTerminal: true,
    browser: ["DoorSmith", "Chrome", "1.0.0"],
  });
  sock = socket;
  delivery = socketDelivery;

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("messages.update", (updates) => {
    if (sock !== socket) return;
    for (const { key, update } of updates) {
      socketDelivery.update(key, update).catch((err) => console.error("[wa] Could not save message receipt:", err.message));
    }
  });
  socket.ev.on("messages.upsert", ({ messages }) => {
    if (sock !== socket) return;
    for (const message of messages) {
      socketDelivery.remember(message).catch((err) => console.error("[wa] Could not save outgoing message:", err.message));
    }
  });

  socket.ev.on("connection.update", async (update) => {
    if (sock !== socket) return;
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // New QR code available  convert to data-URI PNG
      currentQr = await qrcode.toDataURL(qr);
      status = "connecting";
      console.log("[wa] QR refreshed  waiting for scan");
    }

    if (connection === "open") {
      const user = socket.user || {};
      const jid = user.id || "";
      // jid is like "919876543210:0@s.whatsapp.net"  extract the number
      connectedPhone = "+" + jid.split(":")[0].split("@")[0];
      status = "connected";
      currentQr = null;
      console.log("[wa] Connected as " + connectedPhone);
    }

    if (connection === "close") {
      const boomError = lastDisconnect && lastDisconnect.error;
      const reason = new Boom(boomError).output.statusCode;
      console.log("[wa] Disconnected  reason: " + reason);

      if (reason === DisconnectReason.loggedOut || reason === DisconnectReason.badSession) {
        // Session invalidated or corrupted  delete auth then reconnect fresh for QR
        console.log("[wa] Bad/expired session  clearing auth, reconnecting for fresh QR");
        status = "disconnected";
        connectedPhone = null;
        sock = null;
        delivery = null;
        await fsPromises.rmdir(AUTH_DIR, { recursive: true }).catch(function() {});
        await startSocket();
      } else if (reason !== DisconnectReason.connectionReplaced) {
        // Transient error  reconnect automatically
        console.log("[wa] Reconnecting…");
        sock = null;
        delivery = null;
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
  delivery = null;
}

// Auto-connect on startup if auth already exists
if (existsSync(AUTH_DIR + "/creds.json")) {
  console.log("[wa] Existing session found  reconnecting");
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

app.get("/messages/:id/status", async (req, res) => {
  if (!delivery || !/^[A-Za-z0-9_-]{1,200}$/.test(req.params.id)) {
    return res.status(404).json({ error: "Message not found." });
  }
  try {
    const result = await delivery.status(req.params.id);
    if (!result) return res.status(404).json({ error: "Message not found or expired." });
    res.json(result);
  } catch {
    res.status(503).json({ error: "Message status unavailable." });
  }
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
  if (status !== "connected" || !sock || !delivery) {
    return res.status(503).json({ error: "WhatsApp not connected" });
  }

  const body = req.body || {};
  const phone = body.phone;
  const message = body.message;
  const imageUrl = body.imageUrl; // optional: send as an image with message as caption
  const checkExists = body.checkExists === true; // opt-in: used by the OTP path only
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  // Normalise to JID: strip non-digits, append @s.whatsapp.net
  const digits = String(phone).replace(/\D/g, "");
  const jid = digits + "@s.whatsapp.net";

  // Only the OTP flow asks us to verify the number is actually on WhatsApp, so
  // the caller can fall back to SMS. Other message types send unconditionally.
  if (checkExists) {
    try {
      const results = await sock.onWhatsApp(digits);
      const exists = Array.isArray(results) && results.length > 0 && results[0] && results[0].exists;
      if (!exists) {
        return res.status(422).json({ error: "Number not on WhatsApp", code: "not_registered" });
      }
    } catch (e) {
      // If the existence check itself fails, don't block  fall through and try to send.
      console.error("[wa] onWhatsApp check failed", e);
    }
  }

  try {
    const sendingSocket = sock;
    const sendingDelivery = delivery;
    const content = imageUrl
      ? { image: { url: String(imageUrl) }, caption: String(message) }
      : { text: String(message) };
    const result = await sendingDelivery.send(sendingSocket, jid, content);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[wa] Send error", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

app.listen(PORT, () => {
  console.log("[wa] WhatsApp service listening on port " + PORT);
});
