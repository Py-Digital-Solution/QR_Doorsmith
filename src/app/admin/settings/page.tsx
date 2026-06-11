import { isDistributorEnabled } from "@/services/settings";
import { getSetting } from "@/services/settings";
import { DistributorToggle } from "@/components/DistributorToggle";
import { MinPointsForm } from "@/components/MinPointsForm";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function SettingsPage() {
  const [distributorEnabled, minPoints] = await Promise.all([
    isDistributorEnabled(),
    getSetting<number>("min_redemption_points", 0),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System-wide configuration." />

      <div className="max-w-2xl space-y-3">
        <DistributorToggle initial={distributorEnabled} />
        <MinPointsForm initial={minPoints} />
      </div>
    </div>
  );
}
