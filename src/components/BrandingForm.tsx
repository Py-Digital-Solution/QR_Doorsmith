"use client";

import { useActionState, useRef, useState, useId } from "react";
import { Building2, Upload, X } from "lucide-react";
import { saveBrandingAction, type BrandingState } from "@/actions/branding";
import { displayPhone } from "@/lib/phone";
import type { CompanyBranding } from "@/services/branding";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const MAX_BYTES = 500 * 1024; // 500 KB  keeps MongoDB doc size sane

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function BrandingForm({ initial }: { initial: CompanyBranding }) {
  const [state, formAction, pending] = useActionState<BrandingState, FormData>(
    saveBrandingAction,
    {},
  );

  // Controlled so React 19 action submission doesn't wipe field values
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [phone, setPhone] = useState(displayPhone(initial.phone ?? ""));
  const [email, setEmail] = useState(initial.email);
  const [website, setWebsite] = useState(initial.website);
  const [address, setAddress] = useState(initial.address);
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(initial.facebookUrl || "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl || "");

  const [logoUrl, setLogoUrl] = useState(initial.logo);
  const [faviconUrl, setFaviconUrl] = useState(initial.favicon || "");
  const [converting, setConverting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const faviconFileRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const faviconInputId = useId();

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"].includes(file.type)) {
      setUploadError("Only PNG, JPEG, and ICO/SVG files are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Logo must be under 500 KB.");
      return;
    }

    setUploadError("");
    setConverting(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      setLogoUrl(dataUrl);
    } catch {
      setUploadError("Could not read the file. Please try again.");
    } finally {
      setConverting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      setUploadError("Favicon must be under 200 KB.");
      return;
    }

    try {
      const dataUrl = await readAsDataUrl(file);
      setFaviconUrl(dataUrl);
    } catch {
      setUploadError("Could not read the favicon file.");
    } finally {
      if (faviconFileRef.current) faviconFileRef.current.value = "";
    }
  }

  const [brandColor, setBrandColor] = useState(initial.brandColor || "#f6821f");
  const [brandSecondary, setBrandSecondary] = useState(initial.brandSecondary || "#0d1f38");
  const [brandDark, setBrandDark] = useState(initial.brandDark || "#d96d10");
  const [brandLight, setBrandLight] = useState(initial.brandLight || "#FFF3E8");
  const [fontFamily, setFontFamily] = useState(initial.fontFamily || "geist");

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Logo */}
        <div>
          <Label>Company logo</Label>
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Building2 className="size-8 text-gray-300" />
              )}
            </div>
            <div className="space-y-1.5">
              <input
                ref={fileRef}
                id={fileInputId}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                disabled={converting}
                onChange={handleLogoChange}
              />
              <label
                htmlFor={fileInputId}
                className={`focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-card transition-colors hover:bg-gray-50 hover:text-gray-900 ${converting ? "pointer-events-none opacity-50" : ""}`}
              >
                {converting ? (
                  <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <Upload className="size-3.5" />
                )}
                {converting ? "Reading…" : "Upload logo"}
              </label>
              <p className="text-xs text-gray-400">PNG or JPEG · max 500 KB</p>
              {logoUrl && (
                <button
                  type="button"
                  onClick={() => setLogoUrl("")}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                >
                  <X className="size-3" /> Remove
                </button>
              )}
            </div>
          </div>
          <input type="hidden" name="company_logo" value={logoUrl} />
        </div>

        {/* Favicon */}
        <div>
          <Label>Website Favicon</Label>
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={faviconUrl}
                  alt="Favicon"
                  className="size-8 object-contain"
                />
              ) : (
                <Building2 className="size-6 text-gray-300" />
              )}
            </div>
            <div className="space-y-1.5">
              <input
                ref={faviconFileRef}
                id={faviconInputId}
                type="file"
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                className="sr-only"
                onChange={handleFaviconChange}
              />
              <label
                htmlFor={faviconInputId}
                className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-card transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Upload className="size-3.5" /> Upload Favicon
              </label>
              <p className="text-xs text-gray-400">ICO, PNG or SVG · max 200 KB</p>
              {faviconUrl && (
                <button
                  type="button"
                  onClick={() => setFaviconUrl("")}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline"
                >
                  <X className="size-3" /> Remove
                </button>
              )}
            </div>
          </div>
          <input type="hidden" name="company_favicon" value={faviconUrl} />
        </div>
      </div>
      {uploadError && (
        <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
      )}

      {/* Brand Theme Customization */}
      <div className="space-y-4 pt-2 border-t border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Brand Colors & Theme Styling</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Primary Brand Color</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                name="company_brand_color_picker"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
              />
              <Input
                name="company_brand_color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#F97316"
                className="uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Secondary Brand Color</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                name="company_brand_secondary_picker"
                value={brandSecondary}
                onChange={(e) => setBrandSecondary(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
              />
              <Input
                name="company_brand_secondary"
                value={brandSecondary}
                onChange={(e) => setBrandSecondary(e.target.value)}
                placeholder="#0D1F38"
                className="uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Hover / Dark Accent</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                name="company_brand_dark_picker"
                value={brandDark}
                onChange={(e) => setBrandDark(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
              />
              <Input
                name="company_brand_dark"
                value={brandDark}
                onChange={(e) => setBrandDark(e.target.value)}
                placeholder="#D96D10"
                className="uppercase font-mono"
              />
            </div>
          </div>

          <div>
            <Label>Light Background Tint</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                name="company_brand_light_picker"
                value={brandLight}
                onChange={(e) => setBrandLight(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
              />
              <Input
                name="company_brand_light"
                value={brandLight}
                onChange={(e) => setBrandLight(e.target.value)}
                placeholder="#FFF3E8"
                className="uppercase font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <Label>Typography / Font Family</Label>
          <select
            name="company_font_family"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand focus:outline-none"
          >
            <option value="geist">Geist Sans (Modern & Clean - Default)</option>
            <option value="inter">Inter (Sleek Tech Standard)</option>
            <option value="poppins">Poppins (Friendly & Geometric)</option>
            <option value="roboto">Roboto (Classic Enterprise)</option>
            <option value="jakarta">Plus Jakarta Sans (Premium SaaS)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-gray-100">
        <div>
          <Label>Company name</Label>
          <Input
            name="company_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Hardware"
          />
        </div>
        <div>
          <Label>Tagline / slogan</Label>
          <Input
            name="company_tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g. Quality doors, trusted service"
          />
        </div>
        <div>
          <Label>Contact phone</Label>
          <input type="hidden" name="company_phone" value={phone.length > 0 ? `+91${phone}` : ""} />
          <div className="flex">
            <span className="flex items-center rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 select-none">+91</span>
            <Input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="98765 43210"
              autoComplete="tel"
              className="rounded-l-none"
            />
          </div>
        </div>
        <div>
          <Label>Email</Label>
          <Input
            name="company_email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="info@company.com"
          />
        </div>
        <div>
          <Label>Website</Label>
          <Input
            name="company_website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://company.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2 border-t border-gray-100">
        <div>
          <Label>Instagram Page URL</Label>
          <Input
            name="company_instagram_url"
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourbrand"
          />
        </div>
        <div>
          <Label>Facebook Page URL</Label>
          <Input
            name="company_facebook_url"
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/yourbrand"
          />
        </div>
        <div>
          <Label>YouTube Channel URL</Label>
          <Input
            name="company_youtube_url"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/@yourbrand"
          />
        </div>
      </div>

      <div>
        <Label>Address</Label>
        <Textarea
          name="company_address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={3}
          placeholder="123 Main Street, City, State 400001"
        />
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Branding saved.</Alert>}

      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}
