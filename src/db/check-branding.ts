import "./load-env";
import { connectDB } from "./mongoose";
import { Settings } from "../models/Settings";

async function main() {
  await connectDB();
  const settings = await Settings.find({ key: { $regex: "company_" } }).lean();
  console.log("BRANDING_SETTINGS_IN_DB:", settings);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
