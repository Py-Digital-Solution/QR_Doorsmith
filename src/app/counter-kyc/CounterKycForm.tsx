"use client";

import { useActionState, useRef, useState } from "react";
import { submitCounterKycAction, type KycActionState } from "@/actions/kyc";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Field";
import { SocialFollowConsent } from "@/components/SocialFollowConsent";
import { Camera, X } from "lucide-react";

const TARGET_SIZE = 500 * 1024; // 500 KB

// Downscale + compress on the client so mobile camera shots upload reliably.
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        if (width > 1000 || height > 1000) {
          const ratio = Math.min(1000 / width, 1000 / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.9;
        let attempts = 0;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }
              if (blob.size <= TARGET_SIZE || quality <= 0.3 || attempts >= 5) {
                resolve(new File([blob], file.name, { type: "image/jpeg" }));
              } else {
                quality -= 0.15;
                attempts++;
                tryCompress();
              }
            },
            "image/jpeg",
            quality,
          );
        };
        tryCompress();
      };
      img.onerror = () => reject(new Error("Failed to load image"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
  });
}

export function CounterKycForm() {
  const [state, action, pending] = useActionState<KycActionState, FormData>(
    submitCounterKycAction,
    {},
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  const mainInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function applyFile(file: File) {
    if (!mainInputRef.current) return;
    try {
      const compressed = await compressImage(file);
      const dt = new DataTransfer();
      dt.items.add(compressed);
      mainInputRef.current.files = dt.files;
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error("Image compression failed:", err);
      const dt = new DataTransfer();
      dt.items.add(file);
      mainInputRef.current.files = dt.files;
      setPreview(URL.createObjectURL(file));
    }
  }

  return (
    <form action={action} className="space-y-5">
      {/* Counter photo */}
      <div className="space-y-2">
        <Label>
          Counter photo <span className="text-red-500">*</span>
        </Label>

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={preview}
                alt="Counter preview"
                className="size-28 rounded-xl object-cover ring-2 ring-brand/30"
              />
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  if (mainInputRef.current) mainInputRef.current.value = "";
                  if (cameraInputRef.current) cameraInputRef.current.value = "";
                }}
                className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-400">Tap × to retake</p>
          </div>
        ) : (
          <label
            htmlFor="counter-photo-input"
            className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-6 transition-colors hover:border-brand hover:bg-brand-light active:scale-95"
          >
            <Camera className="size-8 text-brand" />
            <span className="text-sm font-medium text-gray-700">Take photo</span>
            <span className="text-xs text-gray-400">Opens your camera</span>
          </label>
        )}

        {/* Camera capture input — opened directly by the label above (single tap) */}
        <input
          id="counter-photo-input"
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) applyFile(file);
          }}
        />

        {/* The actual named input submitted with the form */}
        <input
          ref={mainInputRef}
          name="photo"
          type="file"
          accept="image/*"
          className="sr-only"
        />
      </div>

      {/* Address */}
      <div>
        <Label>Counter address <span className="text-red-500">*</span></Label>
        <textarea
          name="address"
          required
          rows={3}
          placeholder="Shop no, street, city, state, PIN"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <SocialFollowConsent checked={agreed} onChange={setAgreed} />

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" fullWidth loading={pending} disabled={!agreed}>
        {pending ? "Saving…" : "Complete KYC"}
      </Button>
    </form>
  );
}
