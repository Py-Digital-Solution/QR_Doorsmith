import mongoose from "mongoose";
import { env } from "../lib/env";

/**
 * MongoDB connection (self-hosted on the Oracle Cloud VM).
 *
 * Oracle's mongod is configured as a SINGLE-NODE REPLICA SET so that
 * multi-document transactions work  these are required for safe point-ledger
 * updates (credit + balance write must be atomic; see Docs/PROJECT_PLAN.md).
 *
 * On Vercel many short-lived serverless instances run concurrently, so we cache
 * the connection promise on globalThis to avoid opening a new connection per
 * invocation (and exhausting the server).
 */
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as {
  __mongoose?: MongooseCache;
};

const cached: MongooseCache =
  globalForMongoose.__mongoose ?? { conn: null, promise: null };
globalForMongoose.__mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    // Re-throw as a plain Error so it serializes cleanly to the error boundary
    // (Mongoose errors carry non-serializable class/Map props that crash the
    // server→client error handoff with "Only plain objects can be passed").
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Database unavailable. ${reason}`);
  }

  return cached.conn;
}
