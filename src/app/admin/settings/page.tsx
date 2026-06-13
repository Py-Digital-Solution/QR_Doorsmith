import { isDistributorEnabled } from "@/services/settings";
import { getSetting } from "@/services/settings";
import { DistributorToggle } from "@/components/DistributorToggle";
import { MinPointsForm } from "@/components/MinPointsForm";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function SettingsPage() {
  const [distributorEnabled, minPoints] = await Promise.all([
    isDistributorEnabled(),
    getSetting<number>("min_redemption_points", 0),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System-wide configuration." />

      <div className="max-w-2xl space-y-6">
        {/* General */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            General
          </h2>
          <DistributorToggle initial={distributorEnabled} />
          <MinPointsForm initial={minPoints} />
        </section>

        {/* WhatsApp */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              WhatsApp
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Link a WhatsApp number to send OTPs, welcome messages, and redemption
              notifications directly to users.
            </p>
          </div>
          <WhatsAppPanel />
        </section>
      </div>
    </div>
  );
}
