import { PageHeader } from "@/components/ui/PageHeader";
import { CounterReturnPanel } from "@/components/CounterReturnPanel";

export default function CounterReturnsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Process Return"
        description="Scan a product QR code to reverse the khati's points and reactivate it for resale."
      />
      <CounterReturnPanel />
    </div>
  );
}
