import "./load-env";
import { connectDB } from "./mongoose";
import { User } from "../models/User";
import { Sequence } from "../models/Sequence";

async function main() {
  await connectDB();
  const roles = ["admin", "sales_rep", "counter", "khati", "distributor"];

  for (const role of roles) {
    const prefix = role === "admin" ? "AD" : role === "sales_rep" ? "SR" : role === "counter" ? "CN" : role === "khati" ? "KH" : "DT";
    const regex = new RegExp(`^${prefix}-(\\d+)$`);
    
    const users = await User.find({ displayId: regex }).select("displayId").lean();
    let max = 0;
    for (const u of users) {
      if (u.displayId) {
        const match = u.displayId.match(regex);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
    }

    console.log(`Role ${role} (${prefix}): found max existing displayId number = ${max}`);

    await Sequence.findByIdAndUpdate(
      `user_id_${role}`,
      { $set: { value: max } },
      { upsert: true }
    );
  }

  console.log("✅ Sequences synced successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
