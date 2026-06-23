import { Coins } from "lucide-react";
import type { CounterKhatiRow } from "@/services/users";
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

const MEDAL: Record<number, string> = {
  1: "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm",
  2: "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-sm",
  3: "bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-sm",
};

function RankBadge({ rank }: { rank: number }) {
  if (!rank) return <span className="text-gray-300">—</span>;
  const medal = MEDAL[rank];
  return (
    <span
      className={`inline-flex size-8 items-center justify-center rounded-full text-sm font-bold ${
        medal ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {rank}
    </span>
  );
}

function Points({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-semibold text-brand-dark">
      <Coins className="size-4 text-amber-500" aria-hidden />
      {value.toLocaleString()}
    </span>
  );
}

export function CounterKhatisTable({
  khatis,
  currentUserId,
}: {
  khatis: CounterKhatiRow[];
  currentUserId: string;
}) {
  if (khatis.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-card">
        <EmptyState
          icon="users"
          title="No khatis yet"
          description="Khatis registered at your counter will appear here."
        />
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <MobileCardList>
        {khatis.map((u) => (
          <MobileCard
            key={u.id}
            title={u.name || "—"}
            badge={<RankBadge rank={u.rank} />}
            actions={<UserActions user={u} isSelf={u.id === currentUserId} hideDelete hideEdit />}
          >
            {u.displayId && (
              <p className="font-mono text-xs text-gray-400">{u.displayId}</p>
            )}
            {u.phone && <p className="text-sm text-gray-600">{u.phone}</p>}
            <div className="mt-1 flex items-center justify-between">
              <Badge tone={statusTone(u.status)}>{u.status}</Badge>
              <Points value={u.totalPoints} />
            </div>
          </MobileCard>
        ))}
      </MobileCardList>

      {/* Desktop: table */}
      <TableWrapper>
        <Table>
          <THead>
            <TH align="center">Rank</TH>
            <TH>Name</TH>
            <TH>Phone</TH>
            <TH>Status</TH>
            <TH align="right">Total points</TH>
            <TH align="right">Actions</TH>
          </THead>
          <tbody>
            {khatis.map((u) => (
              <TR key={u.id} interactive>
                <TD align="center">
                  <RankBadge rank={u.rank} />
                </TD>
                <TD>
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} photoUrl={u.photoUrl} size={36} />
                    <div className="leading-tight">
                      <span className="font-medium text-gray-900">{u.name || "—"}</span>
                      {u.displayId && (
                        <p className="font-mono text-xs text-gray-400">{u.displayId}</p>
                      )}
                    </div>
                  </div>
                </TD>
                <TD className="text-gray-600">{u.phone || ""}</TD>
                <TD>
                  <Badge tone={statusTone(u.status)}>{u.status}</Badge>
                </TD>
                <TD align="right">
                  <Points value={u.totalPoints} />
                </TD>
                <TD>
                  <UserActions user={u} isSelf={u.id === currentUserId} hideDelete hideEdit />
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </TableWrapper>
    </>
  );
}
