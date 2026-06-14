import { isDistributorEnabled, getSetting } from "@/services/settings";
import { getCompanyBranding } from "@/services/branding";
import { DistributorToggle } from "@/components/DistributorToggle";
import { MinPointsForm } from "@/components/MinPointsForm";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { BrandingForm } from "@/components/BrandingForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabNav } from "@/components/ui/Tabs";

const BASE = "/admin/settings";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "general" } = await searchParams;

  const tabs = [
    { href: `${BASE}?tab=general`, label: "General", active: tab === "general" },
    { href: `${BASE}?tab=branding`, label: "Branding", active: tab === "branding" },
    { href: `${BASE}?tab=whatsapp`, label: "WhatsApp", active: tab === "whatsapp" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System-wide configuration." />
      <TabNav tabs={tabs} />

      <div className="max-w-2xl">
        {tab === "general" && <GeneralTab />}
        {tab === "branding" && <BrandingTab />}
        {tab === "whatsapp" && <WhatsAppTab />}
      </div>
    </div>
  );
}

async function GeneralTab() {
  const [distributorEnabled, minPoints] = await Promise.all([
    isDistributorEnabled(),
    getSetting<number>("min_redemption_points", 0),
  ]);
  return (
    <div className="space-y-3">
      <DistributorToggle initial={distributorEnabled} />
      <MinPointsForm initial={minPoints} />
    </div>
  );
}

async function BrandingTab() {
  const branding = await getCompanyBranding();
  return (
    <div>
      <p className="mb-5 text-sm text-gray-500">
        This information appears in PDF exports and Excel downloads.
      </p>
      <BrandingForm initial={branding} />
    </div>
  );
}

function WhatsAppTab() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        Link a WhatsApp number to send OTPs, welcome messages, and redemption
        notifications directly to users.
      </p>
      <WhatsAppPanel />
    </div>
  );
}
