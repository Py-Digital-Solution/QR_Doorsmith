import { notFound } from "next/navigation";
import { getDraftDispatch } from "@/services/dispatch";
import { listCounters } from "@/services/users";
import { DispatchClient } from "@/components/DispatchClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function EditDraftDispatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [draft, counters] = await Promise.all([getDraftDispatch(id), listCounters()]);
  if (!draft) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit draft dispatch"
        description="Change the destination counter or the scanned QR codes before dispatching."
      />

      <DispatchClient counters={counters} editDraft={draft} />
    </div>
  );
}
