import type { Metadata } from "next";
import InstallClient from "./InstallClient";
import { getCompanyBranding } from "@/services/branding";

export const metadata: Metadata = {
  title: "Install Karigar Rewards App",
  description: "Download and install the app on your mobile device to scan QR codes, track, and redeem reward points instantly.",
  applicationName: "Karigar Rewards",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rewards",
  },
  openGraph: {
    title: "Install Rewards App",
    description: "Scan product QR codes and earn reward points with the app.",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "DoorSmith PWA App",
      },
    ],
  },
};

export default async function InstallPage() {
  const branding = await getCompanyBranding();
  return <InstallClient companyName={branding.name} logo={branding.logo} phone={branding.phone} />;
}
