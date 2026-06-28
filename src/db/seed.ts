import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { Settings, User, Sequence } from "../models";
import { hashPassword } from "../lib/password";

/**
 * Idempotent seed. Run with: npm run db:seed
 *
 * Seeds:
 *  1. Global defaults — notably the Distributor toggle, OFF by default
 *     per SOW 1.2 (admin activates it later).
 *  2. Demo data — a couple of counters and several karigars so the app is
 *     usable immediately after a fresh deploy. Karigars log in by phone with
 *     the dev OTP `1111`. Re-running never duplicates (matched by email/phone).
 */

const ROLE_PREFIX: Record<string, string> = {
  khati: "KH",
  sales_rep: "SR",
  counter: "CN",
  admin: "AD",
  distributor: "DT",
};

/** Same atomic, gap-free displayId allocator the app uses (see services/users.ts). */
async function nextDisplayId(role: string): Promise<string> {
  const prefix = ROLE_PREFIX[role] ?? "US";
  const seq = await Sequence.findByIdAndUpdate(
    `user_id_${role}`,
    { $inc: { value: 1 } },
    { upsert: true, new: true },
  );
  return `${prefix}-${String(seq!.value).padStart(4, "0")}`;
}

async function seedSettings() {
  await Settings.updateOne(
    { key: "distributor_enabled" },
    {
      $setOnInsert: {
        value: false,
        description:
          "SOW 1.2 — Distributor role deactivated by default; admin can enable.",
      },
    },
    { upsert: true },
  );
}

/** Ensure a counter exists (matched by email). Returns its _id. */
async function ensureCounter(opts: {
  name: string;
  email: string;
  password: string;
  address: string;
  createdBy: mongoose.Types.ObjectId;
}): Promise<mongoose.Types.ObjectId> {
  const email = opts.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`ℹ️  Counter exists: ${email}`);
    return existing._id as mongoose.Types.ObjectId;
  }
  const passwordHash = await hashPassword(opts.password);
  const displayId = await nextDisplayId("counter");
  const doc = await User.create({
    role: "counter",
    name: opts.name,
    email,
    passwordHash,
    address: opts.address,
    status: "active",
    counterKycCompletedAt: new Date(), // skip first-login KYC for demo counters
    createdBy: opts.createdBy,
    displayId,
  });
  console.log(`✅ Counter created: ${email} (password: ${opts.password})`);
  return doc._id as mongoose.Types.ObjectId;
}

/** Ensure a karigar exists (matched by phone). */
async function ensureKarigar(opts: {
  name: string;
  phone: string;
  counterId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  points?: number;
}): Promise<void> {
  const existing = await User.findOne({ phone: opts.phone });
  if (existing) {
    console.log(`ℹ️  Karigar exists: ${opts.phone}`);
    return;
  }
  const displayId = await nextDisplayId("khati");
  const points = opts.points ?? 0;
  await User.create({
    role: "khati",
    name: opts.name,
    phone: opts.phone,
    counterId: opts.counterId,
    counterIds: [opts.counterId],
    points,
    lifetimePoints: points,
    status: "active",
    kycStatus: "approved",
    createdBy: opts.createdBy,
    displayId,
  });
  console.log(`✅ Karigar created: ${opts.name} (${opts.phone}) — login OTP 1111`);
}

async function seedDemoUsers() {
  // Use any existing admin as the creator; fall back to the first user.
  const admin =
    (await User.findOne({ role: "admin" })) ?? (await User.findOne({}));
  if (!admin) {
    console.log("⚠️  No admin found — run `npm run db:create-admin` first. Skipping demo users.");
    return;
  }
  const adminId = admin._id as mongoose.Types.ObjectId;

  const counter1 = await ensureCounter({
    name: "Sharma Hardware",
    email: "counter1@doorsmith.in",
    password: "Counter@123",
    address: "12 MG Road, Indore, MP",
    createdBy: adminId,
  });
  const counter2 = await ensureCounter({
    name: "Verma Timber Mart",
    email: "counter2@doorsmith.in",
    password: "Counter@123",
    address: "5 Station Road, Bhopal, MP",
    createdBy: adminId,
  });

  await ensureKarigar({ name: "Ramesh Kumar", phone: "+919000000001", counterId: counter1, createdBy: adminId, points: 120 });
  await ensureKarigar({ name: "Suresh Yadav", phone: "+919000000002", counterId: counter1, createdBy: adminId, points: 80 });
  await ensureKarigar({ name: "Mahesh Patel", phone: "+919000000003", counterId: counter1, createdBy: adminId, points: 0 });
  await ensureKarigar({ name: "Dinesh Sharma", phone: "+919000000004", counterId: counter2, createdBy: adminId, points: 200 });
  await ensureKarigar({ name: "Rajesh Singh", phone: "+919000000005", counterId: counter2, createdBy: adminId, points: 45 });
  await ensureKarigar({ name: "Mukesh Gupta", phone: "+919000000006", counterId: counter2, createdBy: adminId, points: 0 });
}

async function main() {
  await connectDB();
  await seedSettings();
  await seedDemoUsers();
  console.log("✅ Seed complete.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
