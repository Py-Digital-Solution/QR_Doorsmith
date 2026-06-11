import type { ReactNode } from "react";
import Image from "next/image";
import { Check } from "lucide-react";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Left — branding / details (hidden on small screens) */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-navy p-12 text-white lg:flex">
        {/* subtle brand glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brand-blue/20 blur-3xl" />

        <Image
          src="/logo.png"
          alt="DoorSmith"
          width={156}
          height={26}
          priority
          className="relative h-7 w-auto self-start"
        />

        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            Khati rewards, <span className="text-brand">made simple.</span>
          </h2>
          <p className="text-gray-300">
            A QR-based rewards platform that incentivises khatis through retail
            counters — scan, earn, and redeem with ease.
          </p>
          <ul className="space-y-3 text-sm text-gray-200">
            <li className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/20">
                <Check className="size-3 text-brand" strokeWidth={3} aria-hidden />
              </span>
              Earn reward points on every product scan
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/20">
                <Check className="size-3 text-brand" strokeWidth={3} aria-hidden />
              </span>
              Redeem at any participating counter
            </li>
            <li className="flex items-center gap-2.5">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/20">
                <Check className="size-3 text-brand" strokeWidth={3} aria-hidden />
              </span>
              Track your rewards in real time
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-gray-400">
          © 2026 DoorSmith · Powered by Gati Growth Labs
        </p>
      </aside>

      {/* Right — form */}
      <main className="flex w-full items-center justify-center bg-gray-50 p-6 lg:w-1/2">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
