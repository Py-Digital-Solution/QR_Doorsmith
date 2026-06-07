import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import * as models from "../models";

/**
 * Build/sync all model indexes against MongoDB. Run with: npm run db:indexes
 *
 * MongoDB has no migrations like SQL; instead we declare indexes on the schemas
 * and sync them here (e.g. after deploys). `syncIndexes` creates missing
 * indexes and drops ones no longer declared.
 */
async function main() {
  await connectDB();

  for (const [name, value] of Object.entries(models)) {
    const model = value as mongoose.Model<unknown>;
    if (model?.syncIndexes) {
      await model.syncIndexes();
      console.log(`  ✓ indexes synced: ${name}`);
    }
  }

  console.log("✅ Index sync complete.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ Index sync failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
