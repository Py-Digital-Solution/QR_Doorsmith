"use client";

import { useActionState, useState, useRef } from "react";
import { setNotificationEmailAction } from "@/actions/settings";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Label } from "@/components/ui/Field";
import { X } from "lucide-react";

type State = { error?: string; ok?: boolean };

function parseEmails(raw: string): string[] {
  return raw.split(",").map((e) => e.trim()).filter(Boolean);
}

export function NotificationEmailForm({ initial }: { initial: string }) {
  const [emails, setEmails] = useState<string[]>(parseEmails(initial));
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState<State, FormData>(
    setNotificationEmailAction,
    {},
  );

  function addEmail(raw: string) {
    const val = raw.trim().toLowerCase();
    if (!val) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      setInputError("Enter a valid email address.");
      return;
    }
    if (emails.includes(val)) {
      setInputError("Already added.");
      return;
    }
    setEmails((prev) => [...prev, val]);
    setInput("");
    setInputError("");
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(input);
    } else if (e.key === "Backspace" && input === "" && emails.length > 0) {
      setEmails((prev) => prev.slice(0, -1));
    }
  }

  return (
    <form action={action} className="rounded-lg border border-gray-200 bg-white p-4 shadow-card sm:p-5 space-y-3">
      {/* Hidden field carries the comma-separated value to the server action */}
      <input type="hidden" name="notification_email" value={emails.join(",")} />

      <div>
        <h2 className="text-sm font-semibold text-gray-900">Failure notification emails</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          When a WhatsApp message fails to send, an alert email is sent to all addresses below.
        </p>
      </div>

      <div>
        <Label>Notification emails</Label>
        {/* Chip input */}
        <div
          className="flex min-h-[42px] flex-wrap gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:border-gray-400 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/40 cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-medium text-brand-dark"
            >
              {email}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeEmail(email); }}
                className="ml-0.5 rounded-full hover:bg-brand/20 focus:outline-none"
                aria-label={`Remove ${email}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setInputError(""); }}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input) addEmail(input); }}
            placeholder={emails.length === 0 ? "admin@example.com" : "Add another…"}
            className="min-w-[140px] flex-1 border-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>
        {inputError && <p className="mt-1 text-xs text-red-500">{inputError}</p>}
        <p className="mt-1 text-xs text-gray-400">Press Enter or comma to add each address.</p>
      </div>

      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.ok && <Alert variant="success">Saved ✓</Alert>}

      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save emails"}
      </Button>
    </form>
  );
}
