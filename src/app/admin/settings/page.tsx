import { isDistributorEnabled } from "@/services/settings";
import { DistributorToggle } from "@/components/DistributorToggle";

export default async function SettingsPage() {
  const distributorEnabled = await isDistributorEnabled();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-sm text-gray-500">System-wide configuration.</p>
      </div>

      <div className="max-w-2xl space-y-3">
        <DistributorToggle initial={distributorEnabled} />
      </div>
    </div>
  );
}
