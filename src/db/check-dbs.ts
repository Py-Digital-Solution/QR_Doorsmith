import "./load-env";
import mongoose from "mongoose";

async function main() {
  const uri = "mongodb://pydigitalsolution:pydigisolu@141.148.206.190:27017/admin?authSource=admin";
  const conn = await mongoose.connect(uri);
  const adminDb = conn.connection.db!.admin();
  const dbs = await adminDb.listDatabases();
  console.log("DATABASES_LIST:", dbs.databases.map(d => d.name));
  await mongoose.disconnect();
}

main().catch(console.error);
