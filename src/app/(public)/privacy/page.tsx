import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GGPL",
  description: "How GGPL collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-6">
        <h1 className="mb-6 text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mb-4 text-sm text-gray-500">Last updated: {new Date().getFullYear()}</p>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="mb-2 text-xl font-semibold">1. Information We Collect</h2>
            <p>We collect information you provide when creating an account, including your name, email address, phone number, and business details. We also collect usage data to improve our platform.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve our services, send important notifications, process transactions, and comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">3. Data Sharing</h2>
            <p>We do not sell your personal data. We may share data with service providers who help us operate our platform, subject to confidentiality agreements.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">4. Data Security</h2>
            <p>We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your data.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">5. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. Contact us at support@doorsmith.in to exercise these rights.</p>
          </section>

          <section>
            <h2 className="mb-2 text-xl font-semibold">6. Contact Us</h2>
            <p>For privacy-related questions, contact us at: <a href="mailto:support@doorsmith.in" className="text-orange-600 hover:underline">support@doorsmith.in</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
