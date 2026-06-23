"use client";

import { useActionState, useRef, useState } from "react";
import { submitRegistrationAction, type KycActionState } from "@/actions/kyc";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Field";
import { Camera, CheckCircle2, X } from "lucide-react";

const TARGET_SIZE = 500 * 1024; // 500 KB

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

        // Reduce dimensions if image is large
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

        // Compress with progressive quality reduction
        let quality = 0.9;
        let compressed: Blob | null = null;
        let attempts = 0;

        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              if (blob.size <= TARGET_SIZE || quality <= 0.3 || attempts >= 5) {
                const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
                resolve(compressedFile);
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

export function RegisterForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<KycActionState, FormData>(
    submitRegistrationAction,
    {},
  );
  const [preview, setPreview] = useState<string | null>(null);

  // The named input that gets submitted with the form
  const mainInputRef = useRef<HTMLInputElement>(null);
  // Separate hidden input that opens the camera
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
      // Fallback to original file if compression fails
      const dt = new DataTransfer();
      dt.items.add(file);
      mainInputRef.current.files = dt.files;
      setPreview(URL.createObjectURL(file));
    }
  }

  if (state.ok) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 className="size-14 text-green-500" />
        <h2 className="text-lg font-semibold text-gray-900">Submitted!</h2>
        <p className="text-sm text-gray-500">
          Your registration is under review. Your counter will verify your details and you will be notified on WhatsApp once approved.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {/* Photo */}
      <div className="space-y-2">
        <Label>
          Profile photo{" "}
          <span className="text-xs font-normal text-gray-400">(optional)</span>
        </Label>

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="size-28 rounded-full object-cover ring-2 ring-brand/30"
              />
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  if (mainInputRef.current) mainInputRef.current.value = "";
                }}
                className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-400">Tap × to retake</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-6 transition-colors hover:border-brand hover:bg-brand-light active:scale-95"
          >
            <Camera className="size-8 text-brand" />
            <span className="text-sm font-medium text-gray-700">Take photo</span>
            <span className="text-xs text-gray-400">Opens your camera</span>
          </button>
        )}

        {/* Camera capture input */}
        <input
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
        <Label>Full address <span className="text-red-500">*</span></Label>
        <textarea
          name="address"
          required
          rows={3}
          placeholder="House no, street, city, state, PIN"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {/* DOB */}
      <div>
        <Label>Date of birth <span className="text-red-500">*</span></Label>
        <Input name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} />
      </div>

      {/* Email */}
      <div>
        <Label>
          Email address{" "}
          <span className="text-xs font-normal text-gray-400">(optional)</span>
        </Label>
        <Input
          name="email"
          type="email"
          placeholder="you@example.com"
        />
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}

      <Button type="submit" fullWidth loading={pending}>
        {pending ? "Submitting…" : "Submit registration"}
      </Button>

      <p className="text-center text-xs text-gray-400">
        Your details will be reviewed by your counter before your account is activated.
      </p>
    </form>
  );
}
