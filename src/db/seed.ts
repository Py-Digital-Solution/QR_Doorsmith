import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { Settings } from "../models";

/**
 * Idempotent seed. Run with: npm run db:seed
 * Seeds global defaults  notably the Distributor toggle, OFF by default
 * per SOW 1.2 (admin activates it later).
 */
async function main() {
  await connectDB();

  await Settings.updateOne(
    { key: "distributor_enabled" },
    {
      $setOnInsert: {
        value: false,
        description:
          "SOW 1.2  Distributor role deactivated by default; admin can enable.",
      },
    },
    { upsert: true },
  );

  console.log("✅ Seed complete.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
