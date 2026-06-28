"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Megaphone, Send, Upload, X } from "lucide-react";
import {
  createBroadcastAction,
  sendTestAction,
  previewAudienceAction,
} from "@/actions/broadcast";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Field";

// Kept in sync with AUDIENCE_ROLES in services/broadcast.ts (which is server-only
// and can't be imported here).
const AUDIENCES = [
  { value: "khati", label: "Karigars" },
  { value: "counter", label: "Counters" },
  { value: "sales_rep", label: "Sales reps" },
  { value: "distributor", label: "Distributors" },
];

type Progress = { total: number; sent: number; failed: number; done: boolean };

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function PromotionForm() {
  const [roles, setRoles] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState<null | "test" | "send">(null);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setFeedback({ type: "error", text: "Image must be PNG, JPEG, WebP, or GIF." });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFeedback({ type: "error", text: "Image must be under 5 MB." });
      return;
    }
    setFeedback(null);
    setImage(file);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function removeImage() {
    setImage(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  const allValues = AUDIENCES.map((a) => a.value);
  const allSelected = roles.length === allValues.length;

  function toggleRole(v: string) {
    setRoles((rs) => (rs.includes(v) ? rs.filter((r) => r !== v) : [...rs, v]));
  }

  function toggleAll() {
    setRoles(allSelected ? [] : allValues);
  }

  // Live recipient count for the chosen audiences. (When no audience is picked
  // the render shows a prompt instead of the count, so we needn't reset it here.)
  useEffect(() => {
    if (roles.length === 0) return;
    let cancelled = false;
    previewAudienceAction(roles).then((n) => {
      if (!cancelled) setCount(n);
    });
    return () => {
      cancelled = true;
    };
  }, [roles]);

  function buildFormData(): FormData {
    const fd = new FormData();
    roles.forEach((r) => fd.append("roles", r));
    fd.set("message", message);
    if (image) fd.set("image", image);
    return fd;
  }

  async function onTest() {
    setBusy("test");
    setFeedback(null);
    const res = await sendTestAction({}, buildFormData());
    setFeedback(
      res.ok
        ? { type: "success", text: "Test message sent to your number." }
        : { type: "error", text: res.error ?? "Failed to send test." },
    );
    setBusy(null);
  }

  async function pollDrain() {
    // Keep sending batches while the page stays open; the cron is the backstop.
    for (;;) {
      const res = await fetch("/api/admin/broadcast/drain", { method: "POST" });
      const data = await res.json().catch(() => ({ active: false }));
      if (!data.active) break;
      setProgress({ total: data.total ?? 0, sent: data.sent ?? 0, failed: data.failed ?? 0, done: !!data.done });
      if (data.done) break;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  async function onSend() {
    setBusy("send");
    setFeedback(null);
    setProgress(null);
    const res = await createBroadcastAction({}, buildFormData());
    if (!res.ok) {
      setFeedback({ type: "error", text: res.error ?? "Failed to start broadcast." });
      setBusy(null);
      return;
    }
    setProgress({ total: res.total ?? 0, sent: 0, failed: 0, done: false });
    setFeedback({
      type: "success",
      text: `Broadcast started to ${res.total} recipient(s). Keep this page open to send faster — it also continues in the background.`,
    });
    // Clear the compose fields; sending is now tracked server-side.
    setMessage("");
    setRoles([]);
    removeImage();
    await pollDrain();
    setBusy(null);
  }

  const canSend = roles.length > 0 && message.trim().length > 0 && busy === null;

  return (
    <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5">
      {/* Audiences */}
      <div>
        <Label>Send to <span className="text-red-500">*</span></Label>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              allSelected
                ? "border-brand bg-brand text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand"
            }`}
          >
            All
          </button>
          {AUDIENCES.map((a) => {
            const active = roles.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggleRole(a.value)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {roles.length === 0
            ? "Pick one or more audiences."
            : `${count ?? "…"} active recipient(s) with a phone number.`}
        </p>
      </div>

      {/* Message */}
      <div>
        <Label>Message <span className="text-red-500">*</span></Label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Write your promotional message…"
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {/* Image attachment (optional) */}
      <div>
        <Label>Image (optional)</Label>
        {imagePreview ? (
          <div className="relative mt-1 inline-block overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Attachment preview" className="max-h-48 object-contain" />
            <button
              type="button"
              onClick={removeImage}
              className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
              title="Remove image"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="sr-only"
              id="promo-image"
              onChange={handleImageChange}
            />
            <label
              htmlFor="promo-image"
              className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-card transition-colors hover:bg-gray-50"
            >
              <Upload className="size-4" aria-hidden />
              Attach image
            </label>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <ImageIcon className="size-3.5" aria-hidden />
              PNG · JPEG · WebP · GIF · max 5 MB
            </span>
          </div>
        )}
        <p className="mt-1.5 text-xs text-gray-500">
          When attached, the message is sent as the image caption.
        </p>
      </div>

      {feedback && <Alert variant={feedback.type === "error" ? "error" : "success"}>{feedback.text}</Alert>}

      {/* Progress */}
      {progress && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span className="font-medium">{progress.done ? "Completed" : "Sending…"}</span>
            <span>
              {progress.sent}/{progress.total} sent{progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${progress.done ? "bg-green-500" : "bg-brand"}`}
              style={{ width: `${progress.total > 0 ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) : 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={onSend} loading={busy === "send"} disabled={!canSend}>
          <Megaphone className="size-4" />
          Send broadcast
        </Button>
        <Button variant="secondary" onClick={onTest} loading={busy === "test"} disabled={!message.trim() || busy !== null}>
          <Send className="size-4" />
          Send test to me
        </Button>
      </div>

      <p className="text-xs text-amber-600">
        ⚠️ Sending bulk promotions from one WhatsApp number can get it flagged or banned. Messages are sent in
        small paced batches to reduce risk. Large audiences take time to finish.
      </p>
    </div>
  );
}
