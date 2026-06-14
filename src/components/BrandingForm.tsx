"use client";

import { useActionState, useRef, useState, useId } from "react";
import { Building2, Upload, X } from "lucide-react";
import { saveBrandingAction, type BrandingState } from "@/actions/branding";
import type { CompanyBranding } from "@/services/branding";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const MAX_BYTES = 500 * 1024; // 500 KB — keeps MongoDB doc size sane

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
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [website, setWebsite] = useState(initial.website);
  const [address, setAddress] = useState(initial.address);

  const [logoUrl, setLogoUrl] = useState(initial.logo);
  const [converting, setConverting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setUploadError("Only PNG and JPEG files are supported.");
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

  return (
    <form action={formAction} className="space-y-5">
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
              accept="image/png,image/jpeg"
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
        {uploadError && (
          <p className="mt-1.5 text-xs text-red-600">{uploadError}</p>
        )}
        {/* Logo is saved as a base64 data URL along with the rest of the form */}
        <input type="hidden" name="company_logo" value={logoUrl} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label>Company name</Label>
          <Input
            name="company_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. DoorSmith Hardware"
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
          <Input
            name="company_phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
          />
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
