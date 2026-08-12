import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/SwRegister";
import { getCompanyBranding } from "@/services/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getCompanyBranding();
  const faviconUrl = branding.favicon ? branding.favicon : "/api/favicon";
  const name = branding.name || "GGPL";

  return {
    title: `${name} | Karigar Rewards`,
    description: `${name} Karigar Rewards - scan QR codes and earn points`,
    icons: {
      icon: [
        { url: faviconUrl },
      ],
      shortcut: [faviconUrl],
      apple: [faviconUrl],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#f6821f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getCompanyBranding();
  const brandColor = branding.brandColor || "#f6821f";
  const brandSecondary = branding.brandSecondary || "#0F2444";
  const brandDark = branding.brandDark || "#D96D10";
  const brandLight = branding.brandLight || "#FFF3E8";
  const faviconUrl = branding.favicon ? branding.favicon : "/api/favicon";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={
        {
          "--brand-color": brandColor,
          "--brand-secondary": brandSecondary,
          "--brand-dark": brandDark,
          "--brand-light": brandLight,
        } as React.CSSProperties
      }
    >
      <body className="flex min-h-full flex-col">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
