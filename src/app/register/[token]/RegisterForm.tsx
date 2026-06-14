"use client";

import { useActionState, useRef, useState } from "react";
import { submitRegistrationAction, type KycActionState } from "@/actions/kyc";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Field";
import { Camera, CheckCircle2, ImagePlus, X } from "lucide-react";

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

  function applyFile(file: File) {
    if (!mainInputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    mainInputRef.current.files = dt.files;
    setPreview(URL.createObjectURL(file));
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
            <p className="text-xs text-gray-400">Tap × to remove and choose again</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Upload from gallery */}
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-5 transition-colors hover:border-brand hover:bg-brand-light active:scale-95">
              <ImagePlus className="size-7 text-brand" />
              <span className="text-center text-xs font-medium text-gray-600">
                Upload photo
              </span>
              <span className="text-center text-[10px] text-gray-400">from gallery</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) applyFile(file);
                }}
              />
            </label>

            {/* Take photo with camera */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-5 transition-colors hover:border-brand hover:bg-brand-light active:scale-95"
            >
              <Camera className="size-7 text-brand" />
              <span className="text-center text-xs font-medium text-gray-600">
                Take photo
              </span>
              <span className="text-center text-[10px] text-gray-400">using camera</span>
            </button>
          </div>
        )}

        {/* Hidden input for camera capture */}
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
