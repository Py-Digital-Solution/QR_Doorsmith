"use client";

import { useState, useTransition } from "react";
import { Button, Input, Field, Card } from "@/components/ui";
import { saveSuperAdminSettingsAction } from "@/actions/saas";

export default function SuperAdminSettingsClient({
  initialBranding,
}: {
  initialBranding: {
    name: string;
    logo: string;
    favicon?: string;
    phone: string;
    email: string;
    brandColor: string;
    brandSecondary?: string;
    brandDark?: string;
    brandLight?: string;
    fontFamily?: string;
  };
}) {
  const [name, setName] = useState(initialBranding.name);
  const [logo, setLogo] = useState(initialBranding.logo);
  const [favicon, setFavicon] = useState(initialBranding.favicon || "");
  const [phone, setPhone] = useState(initialBranding.phone);
  const [email, setEmail] = useState(initialBranding.email);
  const [brandColor, setBrandColor] = useState(initialBranding.brandColor || "#F97316");
  const [brandSecondary, setBrandSecondary] = useState(initialBranding.brandSecondary || "#0F2444");
  const [brandDark, setBrandDark] = useState(initialBranding.brandDark || "#D96D10");
  const [brandLight, setBrandLight] = useState(initialBranding.brandLight || "#FFF3E8");
  const [fontFamily, setFontFamily] = useState(initialBranding.fontFamily || "geist");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo image size must be less than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      alert("Favicon size must be less than 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFavicon(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("company_name", name);
      formData.set("company_logo", logo);
      formData.set("company_favicon", favicon);
      formData.set("company_phone", phone);
      formData.set("company_email", email);
      formData.set("company_brand_color", brandColor);
      formData.set("company_brand_secondary", brandSecondary);
      formData.set("company_brand_dark", brandDark);
      formData.set("company_brand_light", brandLight);
      formData.set("company_font_family", fontFamily);

      const res = await saveSuperAdminSettingsAction({ error: "" }, formData);
      if (res.error) {
        setMessage({ type: "error", text: res.error });
      } else {
        setMessage({ type: "success", text: "Global SaaS Platform Branding saved successfully!" });
      }
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">SaaS Platform Settings</h1>
        <p className="text-sm text-gray-500">
          Customize global platform branding, default logo, favicon, primary & secondary colors, typography, and support contacts.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div
              className={`p-4 text-sm rounded-lg border ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Platform Identity, Logo & Favicon
            </h2>

            <Field label="Platform Name" hint="Default name displayed on generic login & public pages.">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. DoorSmith SaaS"
                required
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Platform Logo" hint="Upload a logo (PNG, SVG or JPEG, max 2MB).">
                <div className="flex items-center gap-4 pt-1">
                  {logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo}
                      alt="Logo Preview"
                      className="h-12 w-auto max-w-[140px] object-contain rounded border border-gray-200 p-1"
                    />
                  ) : (
                    <div className="h-12 w-28 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
                      No logo
                    </div>
                  )}

                  <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                    Upload Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </Field>

              <Field label="Website Favicon" hint="Upload browser favicon (ICO, PNG or SVG, max 500KB).">
                <div className="flex items-center gap-4 pt-1">
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favicon}
                      alt="Favicon Preview"
                      className="h-10 w-10 object-contain rounded border border-gray-200 p-1"
                    />
                  ) : (
                    <div className="h-10 w-10 bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center text-xs text-gray-400">
                      Icon
                    </div>
                  )}

                  <label className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
                    Upload Favicon
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </Field>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Brand Colors & Complete Theme Customization
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Primary Brand Color" hint="Main accent color for buttons and active highlights.">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#0038A8"
                    className="w-full uppercase font-mono"
                  />
                </div>
              </Field>

              <Field label="Secondary Brand Color" hint="Dark sidebars, navigation headers, and hero banners.">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandSecondary}
                    onChange={(e) => setBrandSecondary(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
                  />
                  <Input
                    value={brandSecondary}
                    onChange={(e) => setBrandSecondary(e.target.value)}
                    placeholder="#0F2444"
                    className="w-full uppercase font-mono"
                  />
                </div>
              </Field>

              <Field label="Hover / Dark Accent Color" hint="Button hover states and dark contrast accents.">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandDark}
                    onChange={(e) => setBrandDark(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
                  />
                  <Input
                    value={brandDark}
                    onChange={(e) => setBrandDark(e.target.value)}
                    placeholder="#002B82"
                    className="w-full uppercase font-mono"
                  />
                </div>
              </Field>

              <Field label="Light Tint Background" hint="Soft background tint for active menu items and badges.">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandLight}
                    onChange={(e) => setBrandLight(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
                  />
                  <Input
                    value={brandLight}
                    onChange={(e) => setBrandLight(e.target.value)}
                    placeholder="#FFF3E8"
                    className="w-full uppercase font-mono"
                  />
                </div>
              </Field>
            </div>

            <Field label="Platform Typography / Font Family" hint="Select the primary typeface for the application.">
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none"
              >
                <option value="geist">Geist Sans (Modern & Clean - Default)</option>
                <option value="inter">Inter (Sleek Tech Standard)</option>
                <option value="poppins">Poppins (Friendly & Geometric)</option>
                <option value="roboto">Roboto (Classic Enterprise)</option>
                <option value="jakarta">Plus Jakarta Sans (Premium SaaS)</option>
              </select>
            </Field>
          </div>

          <div className="space-y-4 pt-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Support Contacts
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Support Phone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 89504 83393"
                />
              </Field>

              <Field label="Support Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="support@doorsmith.in"
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Platform Settings"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
