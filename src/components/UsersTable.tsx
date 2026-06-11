import type { UserDTO } from "@/services/users";
import { UserActions } from "./UserActions";
import { Badge, statusTone } from "./ui/Badge";
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
            actions={<UserActions user={u} isSelf={u.id === currentUserId} />}
          >
            <p className="break-all text-gray-600">{u.email || u.phone || "—"}</p>
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
            <TH>Email / Phone</TH>
            <TH>Status</TH>
            <TH align="right">Actions</TH>
          </THead>
          <tbody>
            {users.map((u) => (
              <TR key={u.id} interactive>
                <TD className="font-medium text-gray-900">{u.name || "—"}</TD>
                <TD>
                  <Badge tone="brand">{u.role}</Badge>
                </TD>
                <TD className="text-gray-600">{u.email || u.phone || "—"}</TD>
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
