import Link from "next/link";
import Image from "next/image";
import { StaffLoginForm } from "./StaffLoginForm";

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-overlay">
      <Image
        src="/logo.png"
        alt="DoorSmith"
        width={150}
        height={25}
        priority
        className="mb-4 h-6 w-auto lg:hidden"
      />
      <h1 className="text-lg font-semibold tracking-tight text-gray-900">Welcome back</h1>
      <p className="mb-6 text-sm text-gray-500">Staff sign in</p>

      <StaffLoginForm />

      <p className="mt-6 text-center text-sm text-gray-500">
        Are you a Khati?{" "}
        <Link href="/login/khati" className="font-medium text-brand underline">
          Sign in with your phone
        </Link>
      </p>
    </div>
  );
}
