import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://pydigitalsolution:pydigisolu@141.148.206.190:27017/GGPL_DEMO?authSource=admin";

async function resetTheme() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB database");

  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB handle");

  const settingsCol = db.collection("settings");

  const defaultSettings = [
    { key: "company_name", value: "GGPL", description: "Global SaaS Platform Name" },
    { key: "company_logo", value: "", description: "Global SaaS Platform Logo" },
    { key: "company_favicon", value: "/logo.svg", description: "Global SaaS Platform Favicon" },
    { key: "company_brand_color", value: "#f6821f", description: "Platform Primary Brand Color" },
    { key: "company_brand_secondary", value: "#0d1f38", description: "Platform Secondary Brand Color" },
    { key: "company_brand_dark", value: "#d96d10", description: "Platform Hover Accent Color" },
    { key: "company_brand_light", value: "#FFF3E8", description: "Platform Background Tint Color" },
    { key: "company_font_family", value: "geist", description: "Platform Font Family" },
    { key: "company_phone", value: "+91 89504 83393", description: "Support Phone Number" },
    { key: "company_email", value: "support@gatigrowthlabs.in", description: "Support Email Address" },
  ];

  for (const s of defaultSettings) {
    await settingsCol.updateOne(
      { key: s.key },
      { $set: { value: s.value, description: s.description, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  console.log("SUCCESS: All SaaS theme and branding settings have been reset!");
  await mongoose.disconnect();
}

resetTheme().catch(console.error);
