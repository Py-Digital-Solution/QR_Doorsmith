import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { User } from "../models/User";
import { hashPassword } from "../lib/password";
import { env } from "../lib/env";

/**
 * Bootstrap the first Admin account. Run with: npm run db:create-admin
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD from .env.local. Idempotent.
 */
async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local first.");
  }

  await connectDB();
  const email = env.ADMIN_EMAIL.toLowerCase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`ℹ️  Admin already exists: ${email}`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
  await User.create({
    role: "admin",
    name: "Administrator",
    email,
    passwordHash,
    status: "active",
  });

  console.log(`✅ Admin created: ${email}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ create-admin failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
