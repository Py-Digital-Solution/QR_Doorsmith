"use client";

import { useState } from "react";
import { KhatiLoginForm } from "@/app/login/khati/KhatiLoginForm";
import { StaffLoginForm } from "@/app/login/StaffLoginForm";
import { Phone, Mail } from "lucide-react";

export function OrgLoginTabs({ initialTab = "khati" }: { initialTab?: "khati" | "staff" }) {
  const [tab, setTab] = useState<"khati" | "staff">(initialTab);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab("khati")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
            tab === "khati"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Phone className="size-3.5" />
          Karigar / Counter
        </button>
        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
            tab === "staff"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Mail className="size-3.5" />
          Staff / Admin
        </button>
      </div>

      {tab === "khati" ? (
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Sign in with phone</h2>
            <p className="text-xs text-gray-500">For Karigars and Retail Counter Partners</p>
          </div>
          <KhatiLoginForm />
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Sign in with email</h2>
            <p className="text-xs text-gray-500">For Admin and Sales Team members</p>
          </div>
          <StaffLoginForm />
        </div>
      )}
    </div>
  );
}
