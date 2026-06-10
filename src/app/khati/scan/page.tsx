import { KhatiScanPanel } from "@/components/KhatiScanPanel";

export default function KhatiScanPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Scan QR Code</h1>
        <p className="text-sm text-gray-500">
          Point your camera at a product QR code to earn points.
        </p>
      </div>
      <KhatiScanPanel />
    </div>
  );
}
