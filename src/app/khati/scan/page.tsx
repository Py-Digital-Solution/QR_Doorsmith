import { KhatiScanPanel } from "@/components/KhatiScanPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default function KhatiScanPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Scan QR Code"
        description="Point your camera at a product QR code to earn points."
      />
      <KhatiScanPanel />
    </div>
  );
}
