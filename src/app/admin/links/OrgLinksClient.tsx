"use client";

import { useState } from "react";
import { 
  Link2, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Smartphone, 
  Download, 
  Users, 
  QrCode, 
  ShieldCheck,
  Building2,
  Sparkles
} from "lucide-react";

export type OrgLinkItem = {
  id: string;
  title: string;
  category: "Karigar" | "Counter" | "Staff" | "App";
  description: string;
  url: string;
  iconName: "phone" | "download" | "users" | "scan" | "shield";
  whatsappTemplate: string;
  recommendedFor: string;
};

export function OrgLinksClient({
  orgName,
  orgSlug,
  baseUrl,
}: {
  orgName: string;
  orgSlug: string;
  baseUrl: string;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const links: OrgLinkItem[] = [
    {
      id: "org-karigar-login",
      title: `${orgName} Karigar & Counter Login`,
      category: "Karigar",
      description: `Direct branded portal for Karigars and Retail Counter partners to sign in with their phone number & OTP.`,
      url: `${baseUrl}/org/${orgSlug}/login`,
      iconName: "phone",
      recommendedFor: "Send to Karigars and Counter partners to log in.",
      whatsappTemplate: `नमस्ते! *${orgName}* रिवार्ड्स पोर्टल में लॉग इन करने के लिए नीचे दिए गए लिंक पर क्लिक करें:\n\n${baseUrl}/org/${orgSlug}/login\n\nअपना फोन नंबर डालकर OTP से आसानी से लॉगिन करें।`,
    },
    {
      id: "org-app-install",
      title: `${orgName} Official App Download`,
      category: "App",
      description: `Dedicated PWA install and "Add to Home Screen" page branded for ${orgName}.`,
      url: `${baseUrl}/org/${orgSlug}/install`,
      iconName: "download",
      recommendedFor: "Share with new users to install the app on mobile.",
      whatsappTemplate: `📱 *${orgName}* का आधिकारिक रिवार्ड्स ऐप अपने फोन में इंस्टॉल करें:\n\n${baseUrl}/org/${orgSlug}/install\n\nतेज़ QR स्कैनिंग और रिवार्ड्स ट्रैक करने के लिए इसे अपनी होम स्क्रीन पर जोड़ें।`,
    },
    {
      id: "org-staff-login",
      title: "Staff & Management Portal",
      category: "Staff",
      description: `Direct sign-in portal with email and password for Organization Admins and Sales Representatives.`,
      url: `${baseUrl}/org/${orgSlug}/login`,
      iconName: "users",
      recommendedFor: "Admin & Sales Rep access.",
      whatsappTemplate: `*${orgName}* मैनेजमेंट व स्टाफ लॉगिन पोर्टल:\n\n${baseUrl}/org/${orgSlug}/login`,
    },
    {
      id: "common-khati-scan",
      title: "Karigar Quick QR Scanner",
      category: "Karigar",
      description: "Direct link to the camera and photo upload QR scanner.",
      url: `${baseUrl}/khati/scan`,
      iconName: "scan",
      recommendedFor: "Quick access for logged-in karigars to scan products.",
      whatsappTemplate: `*${orgName}* QR कोड स्कैन करने के लिए यहाँ क्लिक करें:\n\n${baseUrl}/khati/scan`,
    },
    {
      id: "counter-kyc",
      title: "Retail Counter First-Time KYC",
      category: "Counter",
      description: "Onboarding page for new retail counter partners to complete their profile and address.",
      url: `${baseUrl}/counter-kyc`,
      iconName: "shield",
      recommendedFor: "Send to newly enrolled counters.",
      whatsappTemplate: `नमस्ते! *${orgName}* के साथ अपना काउंटर KYC पूरा करने के लिए नीचे दिए लिंक पर जाएँ:\n\n${baseUrl}/counter-kyc`,
    },
  ];

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  }

  function shareOnWhatsApp(text: string) {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case "phone":
        return <Smartphone className="size-5 text-brand" />;
      case "download":
        return <Download className="size-5 text-emerald-600" />;
      case "users":
        return <Users className="size-5 text-blue-600" />;
      case "scan":
        return <QrCode className="size-5 text-purple-600" />;
      case "shield":
        return <ShieldCheck className="size-5 text-amber-600" />;
      default:
        return <Link2 className="size-5 text-brand" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-brand/5 to-white p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
              <Building2 className="size-4" />
              <span>{orgName} Portal Links</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Shareable Organization Links
            </h1>
            <p className="text-xs text-gray-600 max-w-2xl">
              All official, dedicated URLs branded specifically for <strong>{orgName}</strong> (Slug: <code className="bg-brand/10 text-brand-dark px-1.5 py-0.5 rounded font-mono text-[11px]">{orgSlug}</code>). Easily copy and share these links with Karigars, Retail Counters, and Staff.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${baseUrl}/org/${orgSlug}/login`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
            >
              <ExternalLink className="size-3.5" />
              Visit Org Portal
            </a>
          </div>
        </div>
      </div>

      {/* Links Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => {
          const isCopied = copiedId === link.id;
          return (
            <div
              key={link.id}
              className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-card transition hover:border-brand/40 hover:shadow-card-hover"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 border border-gray-100">
                      {renderIcon(link.iconName)}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 leading-snug">
                        {link.title}
                      </h2>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {link.category}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  {link.description}
                </p>

                {/* URL box */}
                <div className="relative flex items-center rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2">
                  <span className="truncate font-mono text-xs text-gray-700 select-all">
                    {link.url}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 italic">
                  💡 {link.recommendedFor}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(link.url, link.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition ${
                    isCopied
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="size-3.5 text-green-600" strokeWidth={2.5} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5 text-gray-500" />
                      Copy Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => shareOnWhatsApp(link.whatsappTemplate)}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  title="Share on WhatsApp"
                >
                  <Share2 className="size-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                  title="Open Link in New Tab"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
