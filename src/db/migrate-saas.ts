import "./load-env";
import mongoose from "mongoose";
import { connectDB } from "./mongoose";
import { Organization } from "../models/Organization";
import { User } from "../models/User";
import { hashPassword } from "../lib/password";

async function main() {
  await connectDB();
  console.log("Connected to database for SaaS migration...");

  // 1. Ensure the Default Organization exists
  let defaultOrg = await Organization.findOne({ slug: "default" });
  if (!defaultOrg) {
    defaultOrg = await Organization.create({
      name: "Default Organization",
      slug: "default",
      status: "active",
    });
    console.log(`✅ Default Organization created: ${defaultOrg._id}`);
  } else {
    console.log(`ℹ️ Default Organization already exists: ${defaultOrg._id}`);
  }

  // 2. Ensure Super Admin exists
  const superAdminEmail = "superadmin@doorsmith.in";
  let superAdmin = await User.findOne({ email: superAdminEmail });
  if (!superAdmin) {
    const passwordHash = await hashPassword("SuperAdmin@123");
    superAdmin = await User.create({
      role: "super_admin",
      name: "Super Administrator",
      email: superAdminEmail,
      passwordHash,
      status: "active",
    });
    console.log(`✅ Super Admin created: ${superAdminEmail} (password: SuperAdmin@123)`);
  } else {
    console.log(`ℹ️ Super Admin already exists: ${superAdminEmail}`);
  }

  // 3. Update all collections to refer to the Default Org (if they don't have orgId already)
  const collectionsToMigrate = [
    { name: "users", filter: { role: { $ne: "super_admin" }, orgId: { $exists: false } } },
    { name: "qrcodes", filter: { orgId: { $exists: false } } },
    { name: "qrbatches", filter: { orgId: { $exists: false } } },
    { name: "products", filter: { orgId: { $exists: false } } },
    { name: "settings", filter: { orgId: { $exists: false } } },
    { name: "pointtransactions", filter: { orgId: { $exists: false } } },
    { name: "redemptions", filter: { orgId: { $exists: false } } },
    { name: "returns", filter: { orgId: { $exists: false } } },
    { name: "settlements", filter: { orgId: { $exists: false } } },
    { name: "auditlogs", filter: { orgId: { $exists: false } } },
  ];

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection object not found");
  }

  for (const col of collectionsToMigrate) {
    const res = await db.collection(col.name).updateMany(col.filter, {
      $set: { orgId: defaultOrg._id },
    });
    console.log(`📊 Migrated ${res.modifiedCount} documents in collection "${col.name}"`);
  }

  console.log("🎉 SaaS migration complete!");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error("❌ SaaS migration failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
