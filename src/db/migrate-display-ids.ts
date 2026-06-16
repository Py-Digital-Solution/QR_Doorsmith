/**
 * One-time migration: assign displayId values to all existing users that
 * don't have one yet. Idempotent — safe to run multiple times.
 *
 * Run with: npm run db:migrate-display-ids
 */
import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { User } from "../models/User";
import { Sequence } from "../models/Sequence";

const ROLE_PREFIX: Record<string, string> = {
  khati: "KH",
  sales_rep: "SR",
  counter: "CN",
  admin: "AD",
  distributor: "DT",
};

function pad(n: number): string {
  return String(n).padStart(4, "0");
}

async function migrateRole(role: string): Promise<number> {
  const prefix = ROLE_PREFIX[role] ?? "US";
  const seqKey = `user_id_${role}`;

  // Find users of this role without a displayId, oldest first
  const users = await User.find({
    role: role as "admin",
    $or: [{ displayId: { $exists: false } }, { displayId: null }, { displayId: "" }],
  })
    .sort({ createdAt: 1 })
    .select("_id")
    .lean();

  if (users.length === 0) {
    console.log(`  ${role}: nothing to migrate.`);
    return 0;
  }

  // Get the current sequence value (0 if the key doesn't exist yet)
  const existing = await Sequence.findById(seqKey).lean();
  let counter = existing?.value ?? 0;

  // Build bulk ops: assign each user the next ID in creation order
  const bulkOps = users.map((u) => {
    counter += 1;
    return {
      updateOne: {
        filter: { _id: u._id },
        update: { $set: { displayId: `${prefix}-${pad(counter)}` } },
      },
    };
  });

  await User.bulkWrite(bulkOps);

  // Advance the sequence counter to cover the IDs we just assigned
  await Sequence.findByIdAndUpdate(
    seqKey,
    { $set: { value: counter } },
    { upsert: true },
  );

  console.log(`  ${role}: assigned ${users.length} IDs (${prefix}-${pad(counter - users.length + 1)} → ${prefix}-${pad(counter)})`);
  return users.length;
}

async function main() {
  await connectDB();
  console.log("Migrating displayIds for existing users…\n");

  let total = 0;
  for (const role of Object.keys(ROLE_PREFIX)) {
    total += await migrateRole(role);
  }

  console.log(`\n✅ Migration complete. ${total} user(s) updated.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Migration failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
