import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { connectDB } from "@/db/mongoose";
import { User, type UserRole } from "@/models/User";
import { verifyPassword } from "@/lib/password";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { isDistributorEnabled } from "@/services/settings";

/**
 * Full auth instance (Node runtime — uses Mongoose + bcrypt).
 * Two Credentials providers:
 *   - "staff"     → email + password (admin, sales_rep, distributor, counter)
 *   - "khati-otp" → phone + OTP code (khati end users)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "staff",
      name: "Staff",
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds.email ?? "").trim().toLowerCase();
        const password = String(creds.password ?? "");
        if (!email || !password) return null;

        await connectDB();
        const user = await User.findOne({ email });
        if (!user?.passwordHash || user.status !== "active") return null;
        if (user.role === "khati") return null; // khatis must use OTP

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) return null;

        // Distributor accounts can't sign in while the role is disabled (SOW 1.2).
        if (user.role === "distributor" && !(await isDistributorEnabled())) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: user.role as UserRole,
        };
      },
    }),
    Credentials({
      id: "khati-otp",
      name: "Khati OTP",
      // Accepts either a Firebase idToken (production) or phone+code (dev mode).
      credentials: { idToken: {}, phone: {}, code: {} },
      authorize: async (creds) => {
        const idToken = String(creds.idToken ?? "").trim();
        const phone = String(creds.phone ?? "").trim();
        const code = String(creds.code ?? "").trim();

        let resolvedPhone: string;

        if (idToken) {
          // Production: verify Firebase ID token.
          try {
            const decoded = await verifyFirebaseIdToken(idToken);
            resolvedPhone = decoded.phone_number ?? "";
          } catch {
            return null;
          }
        } else if (process.env.OTP_DEV_MODE === "true" && phone && code === "1111") {
          // Dev mode: accept the hardcoded default OTP.
          resolvedPhone = phone;
        } else {
          return null;
        }

        if (!resolvedPhone) return null;

        await connectDB();
        const user = await User.findOne({ phone: resolvedPhone, role: "khati" });
        if (!user || user.status !== "active") return null;

        return {
          id: user._id.toString(),
          name: user.name ?? undefined,
          role: user.role as UserRole,
        };
      },
    }),
  ],
});
