import Link from "next/link";
import Image from "next/image";
import { KhatiLoginForm } from "./KhatiLoginForm";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

export default function KhatiLoginPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <Image
        src="/logo.png"
        alt="DoorSmith"
        width={150}
        height={25}
        priority
        className="mb-4 h-6 w-auto lg:hidden"
      />

      <PwaInstallBanner />

      <p className="mb-6 text-sm text-gray-500">Khati sign in</p>

      <KhatiLoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Staff member?{" "}
        <Link href="/login" className="font-medium text-brand underline">
          Sign in with email
        </Link>
      </p>
    </div>
  );
}
