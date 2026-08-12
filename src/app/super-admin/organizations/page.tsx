import { connectDB } from "@/db/mongoose";
import { Organization } from "@/models/Organization";
import OrgClient from "./OrgClient";

export const metadata = {
  title: "Manage Organizations - SaaS Super Admin",
};

export default async function OrganizationsPage() {
  await connectDB();
  const orgDocs = await Organization.find().sort({ createdAt: -1 }).lean();

  const orgs = orgDocs.map((doc) => ({
    _id: String(doc._id),
    name: String(doc.name),
    slug: String(doc.slug),
    status: String(doc.status),
    createdAt: String(doc.createdAt),
  }));

  return <OrgClient orgs={orgs} />;
}
