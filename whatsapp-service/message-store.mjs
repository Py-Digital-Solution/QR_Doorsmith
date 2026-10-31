import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, open, readFile, readdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { serialize, deserialize } from "node:v8";

/** Encrypted, expiring Baileys retry records. Names contain no message IDs or phone numbers. */
export class MessageStore {
  constructor(directory, { ttlMs = 86_400_000, now = Date.now } = {}) {
    this.directory = directory;
    this.ttlMs = ttlMs;
    this.now = now;
    this.pending = Promise.resolve();
  }

  async init() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const keyPath = path.join(this.directory, "key.bin");
    try {
      const file = await open(keyPath, "wx", 0o600);
      try { await file.writeFile(randomBytes(32)); await file.sync(); }
      finally { await file.close(); }
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    this.key = await readFile(keyPath);
    if (this.key.length !== 32) throw new Error("Invalid WhatsApp message-store encryption key");
    await this.cleanup();
    return this;
  }

  run(operation) {
    const result = this.pending.then(operation);
    this.pending = result.catch(() => {});
    return result;
  }

  fileFor(session, id) {
    const hash = createHash("sha256").update(JSON.stringify([session, id])).digest("hex");
    return path.join(this.directory, `${hash}.msg`);
  }

  async read(file) {
    try {
      const data = await readFile(file);
      const decipher = createDecipheriv("aes-256-gcm", this.key, data.subarray(0, 12));
      decipher.setAuthTag(data.subarray(12, 28));
      const record = deserialize(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]));
      if (record.expiresAt <= this.now()) {
        await unlink(file);
        return undefined;
      }
      return record;
    } catch (err) {
      if (err.code === "ENOENT") return undefined;
      throw err;
    }
  }

  async write(file, record) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(serialize(record)), cipher.final()]);
    const temporary = `${file}.${randomUUID()}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try { await handle.writeFile(Buffer.concat([iv, cipher.getAuthTag(), encrypted])); await handle.sync(); }
    finally { await handle.close(); }
    try { await rename(temporary, file); }
    finally { await unlink(temporary).catch((err) => { if (err.code !== "ENOENT") throw err; }); }
  }

  save(session, id, messageBytes) {
    return this.run(async () => {
      const file = this.fileFor(session, id);
      const existing = await this.read(file);
      // A later own-message event must not reset expiry or erase delivery receipts.
      if (existing) return;
      await this.write(file, {
        content: Buffer.from(messageBytes),
        status: 1,
        retryRequests: 0,
        createdAt: this.now(),
        updatedAt: this.now(),
        expiresAt: this.now() + this.ttlMs,
      });
    });
  }

  get(session, id) {
    return this.run(() => this.read(this.fileFor(session, id)));
  }

  update(session, id, patch) {
    return this.run(async () => {
      const file = this.fileFor(session, id);
      const record = await this.read(file);
      if (!record) return undefined;
      if (patch.retry) record.retryRequests++;
      if (Number.isInteger(patch.status) && patch.status >= 0 && patch.status <= 5) {
        // Receipts can arrive before relayMessage resolves, or arrive out of order.
        if (patch.status > record.status || (patch.status === 0 && record.status < 3)) record.status = patch.status;
      }
      record.updatedAt = this.now();
      await this.write(file, record);
      return record;
    });
  }

  cleanup() {
    return this.run(async () => {
      for (const name of await readdir(this.directory)) {
        if (/^[a-f0-9]{64}\.msg$/.test(name)) await this.read(path.join(this.directory, name));
        else if (/^[a-f0-9]{64}\.msg\.[a-f0-9-]+\.tmp$/.test(name)) await unlink(path.join(this.directory, name));
      }
    });
  }
}
