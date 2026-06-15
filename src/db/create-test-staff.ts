import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { User } from "../models/User";
import { hashPassword } from "../lib/password";

/**
 * Dev-only: create a linked sales_rep + counter for mobile UI verification.
 * Idempotent. Run with: npx tsx src/db/create-test-staff.ts
 * Delete the two accounts afterwards (emails below) if not needed.
 */
const PASSWORD = "Test@1234";
const SALES_EMAIL = "salesrep.test@doorsmith.local";
const COUNTER_EMAIL = "counter.test@doorsmith.local";

async function ensure(
  email: string,
  role: "sales_rep" | "counter",
  name: string,
  createdBy?: mongoose.Types.ObjectId,
) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`ℹ️  ${role} already exists: ${email}`);
    return existing;
  }
  const passwordHash = await hashPassword(PASSWORD);
  const doc = await User.create({ role, name, email, passwordHash, status: "active", createdBy });
  console.log(`✅ ${role} created: ${email}`);
  return doc;
}

async function main() {
  await connectDB();
  const sales = await ensure(SALES_EMAIL, "sales_rep", "Test Sales Rep");
  await ensure(COUNTER_EMAIL, "counter", "Test Counter", sales._id);
  console.log(`\nLogin with password: ${PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ create-test-staff failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
