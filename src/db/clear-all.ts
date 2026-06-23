import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { User } from "../models";

/**
 * Clear all collections except admin user.
 * Run with: npx tsx src/db/clear-all.ts
 */
async function main() {
  await connectDB();

  try {
    // Get the admin user to preserve
    const admin = await User.findOne({ role: "admin" });
    const adminId = admin?._id;

    // List all collections
    const collections = await mongoose.connection.db?.listCollections().toArray();
    if (collections) {
      for (const col of collections) {
        if (col.name === "users") {
          // Keep only admin
          if (adminId) {
            await mongoose.connection.db
              ?.collection("users")
              .deleteMany({ _id: { $ne: adminId } });
            console.log(`  ✓ Cleared users (kept admin)`);
          } else {
            await mongoose.connection.db?.collection("users").deleteMany({});
            console.log(`  ✓ Cleared users (no admin found)`);
          }
        } else {
          // Delete all other collections
          await mongoose.connection.db?.collection(col.name).deleteMany({});
          console.log(`  ✓ Cleared ${col.name}`);
        }
      }
    }

    // Count what's left
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
