import type { UserDTO } from "@/services/users";
import { UserActions } from "./UserActions";
import { Badge, statusTone } from "./ui/Badge";
import { Avatar } from "./Avatar";
import {
  TableWrapper,
  Table,
  THead,
  TH,
  TR,
  TD,
  MobileCardList,
  MobileCard,
} from "./ui/Table";
import { EmptyState } from "./ui/EmptyState";

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserDTO[];
  currentUserId: string;
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-card">
        <EmptyState
          icon="users"
          title="No users yet"
          description="Created accounts will appear here."
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <MobileCardList>
        {users.map((u) => (
          <MobileCard
            key={u.id}
            title={u.name || "—"}
            badge={<Badge tone="brand">{u.role}</Badge>}
            actions={<UserActions user={u} isSelf={u.id === currentUserId} size="md" />}
          >
            {u.displayId && (
              <p className="font-mono text-xs text-gray-400">{u.displayId}</p>
            )}
            {u.rank ? <p className="text-xs text-gray-500">Rank #{u.rank}</p> : null}
            {u.email && <p className="break-all text-sm text-gray-600">{u.email}</p>}
            {u.phone && <p className="text-sm text-gray-600">{u.phone}</p>}
            {!u.email && !u.phone && <p className="text-sm text-gray-400"></p>}
            <Badge tone={statusTone(u.status)}>{u.status}</Badge>
          </MobileCard>
        ))}
      </MobileCardList>

      {/* Desktop: table */}
      <TableWrapper>
        <Table>
          <THead>
            <TH>Name</TH>
            <TH>Role</TH>
            <TH>Rank</TH>
            <TH>Email</TH>
            <TH>Phone</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </THead>
          <tbody>
            {users.map((u) => (
              <TR key={u.id} interactive>
                <TD>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} photoUrl={u.photoUrl} size={32} />
                    <span className="font-medium text-gray-900">{u.name || "—"}</span>
                  </div>
                </TD>
                <TD>
                  <Badge tone="brand">{u.role}</Badge>
                  {u.displayId && (
                    <p className="mt-0.5 font-mono text-xs text-gray-400">{u.displayId}</p>
                  )}
                </TD>
                <TD className="text-gray-600">
                  {u.rank ? <span className="font-medium text-gray-900">#{u.rank}</span> : "—"}
                </TD>
                <TD className="text-gray-600">{u.email || ""}</TD>
                <TD className="text-gray-600">{u.phone || ""}</TD>
                <TD>
                  <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                </TD>
                <TD>
                  <UserActions user={u} isSelf={u.id === currentUserId} />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    </>
  );
}
