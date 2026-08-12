import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://pydigitalsolution:pydigisolu@141.148.206.190:27017/GGPL_DEMO?authSource=admin";

async function inspectOrgs() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB database");

  const db = mongoose.connection.db;
  if (!db) throw new Error("No DB");
  const orgsCol = db.collection("organizations");
  const orgs = await orgsCol.find({}).toArray();

  console.log("Found organizations:");
  for (const org of orgs) {
    console.log(`- ID: ${org._id}, Name: ${org.name}, Slug: ${org.slug}`);
    console.log(`  Branding logo len: ${org.branding?.logo?.length || 0}`);
    console.log(`  Branding favicon len: ${org.branding?.favicon?.length || 0}`);
  }

  // Reset Default Organization branding logo if it contains Py Digital Solution logo
  const defaultOrg = orgs.find((o) => o.slug === "default");
  if (defaultOrg) {
    await orgsCol.updateOne(
      { _id: defaultOrg._id },
      {
        $set: {
          "branding.logo": "",
          "branding.favicon": "",
          "branding.brandColor": "#f6821f",
          "branding.brandSecondary": "#0d1f38",
        },
      }
    );
    console.log("SUCCESS: Reset Default Organization branding to default.");
  }

  await mongoose.disconnect();
}

inspectOrgs().catch(console.error);
