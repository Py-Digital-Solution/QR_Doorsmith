import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/db/mongoose";
import { User, Settings } from "@/models";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

/**
 * POST /api/admin/reset-seed
 * ⚠️ DANGEROUS: Clears database and creates new admin
 * Admin only. Requires confirmation via X-Confirm header.
 *
 * Usage:
 * curl -X POST https://app.doorsmith.in/api/admin/reset-seed \
 *   -H "X-Confirm: I understand this will clear the database" \
 *   -H "Content-Type: application/json"
 */
export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const confirm = req.headers.get("x-confirm");
  if (!confirm?.includes("clear")) {
    return NextResponse.json(
      {
        error: "Confirmation required",
        instruction:
          'Add header: X-Confirm: "I understand this will clear the database"',
      },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    // Clear all collections
    const collections = await mongoose.connection.db?.listCollections().toArray();
    if (collections) {
      for (const col of collections) {
        await mongoose.connection.db?.collection(col.name).deleteMany({});
      }
    }

    // Create admin user
    const adminPassword = "DoorSmith@123"; // Change this!
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const admin = await User.create({
      role: "admin",
      name: "DoorSmith Admin",
      email: "admin@doorsmith.in",
      passwordHash,
      status: "active",
      displayId: "AD-0001",
    });

    // Seed settings
    await Settings.updateOne(
      { key: "distributor_enabled" },
      {
        $setOnInsert: {
          value: false,
          description: "Distributor role deactivated by default",
        },
      },
      { upsert: true },
    );

    return NextResponse.json({
      ok: true,
      message: "Database reset and seeded",
      admin: {
        id: String(admin._id),
        email: admin.email,
        tempPassword: adminPassword,
        warningn: "⚠️ Change password immediately after login!",
      },
    });
  } catch (err) {
    console.error("Reset/seed failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reset failed" },
      { status: 500 },
    );
  }
}
