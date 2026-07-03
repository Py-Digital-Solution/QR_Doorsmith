import type { Metadata } from "next";
import InstallClient from "./InstallClient";

export const metadata: Metadata = {
  title: "Install DoorSmith Karigar Rewards App",
  description: "Download and install the DoorSmith app on your mobile device to scan QR codes, track, and redeem reward points instantly.",
  applicationName: "DoorSmith Karigar Rewards",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DoorSmith",
  },
  openGraph: {
    title: "Install DoorSmith App",
    description: "Scan product QR codes and earn reward points with the DoorSmith Karigar Rewards app.",
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

export default function InstallPage() {
  return <InstallClient />;
}
