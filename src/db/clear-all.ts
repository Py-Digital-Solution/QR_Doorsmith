import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { User } from "../models";

/**
 * Wipe all transactional data, keeping:
 *   - products       (all product definitions)
 *   - settings       (app config)
 *   - admin user     (role === "admin")
 *
 * Run with: npx tsx src/db/clear-all.ts
 */

const PRESERVE_COLLECTIONS = new Set(["products", "settings"]);

async function main() {
  await connectDB();

  try {
    // Find the admin user so we can exclude it when clearing users
    const admin = await User.findOne({ role: "admin" });
    const adminId = admin?._id;
    if (adminId) {
      console.log(`  ℹ️  Keeping admin: ${admin?.email ?? String(adminId)}`);
    } else {
      console.log("  ⚠️  No admin user found — users collection will be fully cleared");
    }

    const collections = await mongoose.connection.db?.listCollections().toArray();
    if (!collections) {
      throw new Error("Could not list collections");
    }

    for (const col of collections) {
      if (PRESERVE_COLLECTIONS.has(col.name)) {
        console.log(`  ⏭  Skipped ${col.name} (preserved)`);
        continue;
      }

      if (col.name === "users") {
        if (adminId) {
          const result = await mongoose.connection.db
            ?.collection("users")
            .deleteMany({ _id: { $ne: adminId } });
          console.log(`  ✓ Cleared users (kept admin, removed ${result?.deletedCount ?? 0})`);
        } else {
          const result = await mongoose.connection.db?.collection("users").deleteMany({});
          console.log(`  ✓ Cleared users (${result?.deletedCount ?? 0} removed, no admin to keep)`);
        }
        continue;
      }

      const result = await mongoose.connection.db?.collection(col.name).deleteMany({});
      console.log(`  ✓ Cleared ${col.name} (${result?.deletedCount ?? 0} docs removed)`);
    }

    const userCount = await User.countDocuments();
    console.log(`\n✅ Clear complete. Users remaining: ${userCount}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Clear failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
