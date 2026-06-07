import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getMyProfile } from "@/services/profile";
import { Avatar } from "@/components/Avatar";
import { NameForm, PhotoForm, PasswordForm } from "@/components/ProfileForms";

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 py-2 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const profile = await getMyProfile(session.user.id);
  if (!profile) redirect("/login");

  const isStaff = profile.role !== "khati";

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">My profile</h1>

      {/* Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-4">
          <Avatar name={profile.name || profile.email} photoUrl={profile.photoUrl} size={56} />
          <div>
            <p className="font-medium">{profile.name || "—"}</p>
            <p className="text-sm text-gray-500">{profile.role}</p>
          </div>
        </div>
        <div className="mt-4">
          <Detail label="Email" value={profile.email} />
          <Detail label="Phone" value={profile.phone} />
          <Detail label="Status" value={profile.status} />
        </div>
      </div>

      <NameForm defaultName={profile.name} />
      <PhotoForm />
      {isStaff && <PasswordForm />}
    </div>
  );
}
