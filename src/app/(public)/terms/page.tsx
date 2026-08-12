import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — GGPL",
  description: "Terms and conditions for using the GGPL platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mb-4 text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="mb-2 text-xl font-semibold">1. Acceptance of Terms</h2>
            <p>By accessing or using the GGPL platform, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use immediately.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">2. Use of the Platform</h2>
            <p>You agree to use our platform only for lawful business purposes. You are responsible for maintaining the confidentiality of your account credentials.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">3. Subscription and Billing</h2>
            <p>Access to certain features requires a paid subscription. Subscription fees are billed in advance and are non-refundable except as required by law.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">4. Intellectual Property</h2>
            <p>All content and technology on this platform is the property of GGPL and is protected by applicable intellectual property laws.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">5. Limitation of Liability</h2>
            <p>GGPL shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">6. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms, with or without notice.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">7. Contact</h2>
            <p>Questions about these terms? Contact us at: <a href="mailto:legal@doorsmith.in" className="text-orange-600 hover:underline">legal@doorsmith.in</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
