import { isDistributorEnabled, getSetting } from "@/services/settings";
import { getCompanyBranding } from "@/services/branding";
import { getBannerSettings } from "@/services/banner";
import { listWaLogs } from "@/services/walog";
import { DistributorToggle } from "@/components/DistributorToggle";
import { MinPointsForm } from "@/components/MinPointsForm";
import { BannerForm } from "@/components/BannerForm";
import { WhatsAppPanel } from "@/components/WhatsAppPanel";
import { TestWhatsAppForm } from "@/components/TestWhatsAppForm";
import { BrandingForm } from "@/components/BrandingForm";
import { NotificationEmailForm } from "@/components/NotificationEmailForm";
import { WaLogTable } from "@/components/WaLogTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabNav } from "@/components/ui/Tabs";

const BASE = "/admin/settings";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; waPage?: string }>;
}) {
  const { tab = "general", waPage } = await searchParams;

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
        {tab === "whatsapp" && <WhatsAppTab waPage={Number(waPage ?? "1") || 1} />}
      </div>
    </div>
  );
}

async function GeneralTab() {
  const [distributorEnabled, minPoints, banner] = await Promise.all([
    isDistributorEnabled(),
    getSetting<number>("min_redemption_points", 0),
    getBannerSettings(),
  ]);
  return (
    <div className="space-y-3">
      <DistributorToggle initial={distributorEnabled} />
      <MinPointsForm initial={minPoints} />

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
        <p className="text-sm font-medium text-gray-900">Karigar app banner</p>
        <p className="mb-4 text-sm text-gray-500">
          Upload a promotional banner that floats at the top of the karigar app. Toggle it off to hide it without deleting it.
        </p>
        <BannerForm initial={banner} />
      </div>
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

async function WhatsAppTab({ waPage }: { waPage: number }) {
  const [notificationEmail, logsData] = await Promise.all([
    getSetting<string>("notification_email", ""),
    listWaLogs(waPage, 20),
  ]);

  const basePath = `/admin/settings?tab=whatsapp`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Link a WhatsApp number to send OTPs, welcome messages, and redemption
          notifications directly to users.
        </p>
        <WhatsAppPanel />
      </div>

      <TestWhatsAppForm />

      <NotificationEmailForm initial={notificationEmail} />

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Message audit log</h2>
        <WaLogTable
          items={logsData.items}
          page={logsData.page}
          pageCount={logsData.pageCount}
          total={logsData.total}
          basePath={basePath}
        />
      </div>
    </div>
  );
}
