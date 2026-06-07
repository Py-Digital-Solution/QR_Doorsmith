import type { UserDTO } from "@/services/users";
import { UserActions } from "./UserActions";

function StatusText({ status }: { status: string }) {
  return (
    <span
      className={
        status === "active"
          ? "text-green-600"
          : status === "suspended"
            ? "text-red-600"
            : "text-gray-500"
      }
    >
      {status}
    </span>
  );
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserDTO[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return <p className="text-sm text-gray-500">No users yet.</p>;
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {users.map((u) => (
          <div key={u.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{u.name || "—"}</span>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                {u.role}
              </span>
            </div>
            <p className="mt-1 break-all text-sm text-gray-600">
              {u.email || u.phone || "—"}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <StatusText status={u.status} />
              <UserActions user={u} isSelf={u.id === currentUserId} />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Email / Phone</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2">{u.name || "—"}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-2">{u.email || u.phone || "—"}</td>
                <td className="px-4 py-2">
                  <StatusText status={u.status} />
                </td>
                <td className="px-4 py-2">
                  <UserActions user={u} isSelf={u.id === currentUserId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
