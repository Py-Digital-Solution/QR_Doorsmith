import { KhatiScanPanel } from "@/components/KhatiScanPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default function KhatiScanPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Scan QR Code"
        description="Scan with your camera or upload a QR code photo to earn points."
      />
      <KhatiScanPanel />
    </div>
  );
}
