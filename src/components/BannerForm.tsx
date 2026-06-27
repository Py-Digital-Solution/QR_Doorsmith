"use client";

import { useActionState, useRef, useState, useId } from "react";
import { ImageIcon, Upload, X, ToggleLeft, ToggleRight } from "lucide-react";
import { saveBannerAction, type BannerActionState } from "@/actions/banner";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function BannerForm({
  initial,
}: {
  initial: { image: string; enabled: boolean };
}) {
  const [state, formAction, pending] = useActionState<BannerActionState, FormData>(
    saveBannerAction,
    {},
  );

  const [image, setImage] = useState(initial.image);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [converting, setConverting] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) {
      setUploadError("Only PNG, JPEG, GIF, or WebP files are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Banner must be under 2 MB.");
      return;
    }

    setUploadError("");
    setConverting(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      setImage(dataUrl);
      setEnabled(true);
    } catch {
      setUploadError("Could not read the file. Please try again.");
    } finally {
      setConverting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Hidden fields */}
      <input type="hidden" name="banner_image" value={image} />
      {enabled && <input type="hidden" name="banner_enabled" value="on" />}

      {/* Preview */}
      <div>
        {image ? (
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt="Banner preview"
              className="max-h-48 w-full object-cover"
            />
            <button
              type="button"
              onClick={() => { setImage(""); setEnabled(false); }}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              title="Remove banner"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
            <div className="text-center">
              <ImageIcon className="mx-auto size-8 text-gray-300" aria-hidden />
              <p className="mt-1 text-xs text-gray-400">No banner uploaded</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload button */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileRef}
          id={fileInputId}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="sr-only"
          disabled={converting}
          onChange={handleFileChange}
        />
        <label
          htmlFor={fileInputId}
          className={`focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-card transition-colors hover:bg-gray-50 ${converting ? "pointer-events-none opacity-50" : ""}`}
        >
          {converting ? (
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {converting ? "Reading…" : image ? "Replace banner" : "Upload banner"}
        </label>
        <p className="text-xs text-gray-400">PNG · JPEG · GIF · WebP · max 2 MB</p>
      </div>

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {/* Enable / disable toggle */}
      {image && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled((v) => !v)}
            style={{ backgroundColor: enabled ? "var(--color-brand)" : undefined }}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? "" : "bg-gray-300"}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="flex items-center gap-1.5 text-sm text-gray-700">
            {enabled ? (
              <><ToggleRight className="size-4 text-brand" aria-hidden /> Banner is <strong>visible</strong> to karigars</>
            ) : (
              <><ToggleLeft className="size-4 text-gray-400" aria-hidden /> Banner is <strong>hidden</strong></>
            )}
          </span>
        </div>
      )}

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Banner saved.</Alert>}

      <Button type="submit" loading={pending} disabled={pending}>
        {pending ? "Saving…" : "Save banner"}
      </Button>
    </form>
  );
}
