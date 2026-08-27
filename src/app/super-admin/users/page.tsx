import { connectDB } from "@/db/mongoose";
import { User } from "@/models/User";
import { Organization } from "@/models/Organization";
import AdminsClient from "./AdminsClient";

export const metadata = {
  title: "Manage System Admins - SaaS Super Admin",
};

export default async function SystemAdminsPage() {
  await connectDB();
  
  // Fetch admins (who manage individual organizations)
  const adminDocs = await User.find({ role: "admin" })
    .populate("orgId")
    .sort({ createdAt: -1 })
    .lean();

  const admins = adminDocs.map((doc) => {
    const org = doc.orgId as any;
    return {
      _id: String(doc._id),
      displayId: String(doc.displayId ?? "N/A"),
      name: String(doc.name ?? ""),
      email: String(doc.email ?? ""),
      phone: String(doc.phone ?? ""),
      status: String(doc.status),
      orgId: org ? String(org._id || org) : undefined,
      orgName: org ? String(org.name) : "No Org",
      createdAt: String(doc.createdAt),
    };
  });

  // Fetch all organizations for dropdown
  const orgDocs = await Organization.find({ status: "active" }).select("name").sort({ name: 1 }).lean();
  const organizations = orgDocs.map((doc) => ({
    _id: String(doc._id),
    name: String(doc.name),
  }));

  return <AdminsClient admins={admins} organizations={organizations} />;
}
