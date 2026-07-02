"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Input, Textarea } from "@/components/ui/Input";
import { Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const DEFAULT_MESSAGE = "This is a test message from DoorSmith. If you're reading this, WhatsApp sending is working ✅";

/** Send a one-off WhatsApp message to any number, to confirm the bridge is actually delivering. */
export function TestWhatsAppForm() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    setResult(null);
    if (!phone.trim()) {
      setResult({ ok: false, text: "Enter a phone number." });
      return;
    }
    if (!message.trim()) {
      setResult({ ok: false, text: "Enter a message." });
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to send.");
      setResult({ ok: true, text: `Sent to ${phone.trim()}.` });
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : "Failed to send." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">Send a test message</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Send a one-off WhatsApp message to any number to confirm the connection is actually delivering.
        </p>
      </div>

      <div>
        <Label>Phone number</Label>
        <Input
          type="tel"
          inputMode="tel"
          placeholder="9876543210 or +919876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div>
        <Label>Message</Label>
        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {result && (
        <Alert variant={result.ok ? "success" : "error"}>{result.text}</Alert>
      )}

      <Button onClick={send} loading={pending}>
        <Send className="size-4" aria-hidden />
        {pending ? "Sending…" : "Send test message"}
      </Button>
    </div>
  );
}
