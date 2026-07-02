import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { connectDB } from "@/db/mongoose";
import { User, type UserRole } from "@/models/User";
import { verifyPassword } from "@/lib/password";
import { verifyFirebaseIdToken } from "@/lib/firebase-admin";
import { isDistributorEnabled } from "@/services/settings";

/**
 * Full auth instance (Node runtime  uses Mongoose + bcrypt).
 * Two Credentials providers:
 *   - "staff"     → email + password (admin, sales_rep, distributor, counter)
 *   - "khati-otp" → phone + OTP code (khati end users)
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Verify the user still exists in the database on every session read.
    // The JWT may remain valid after a user is deleted, so we guard here
    // where the Node runtime has Mongoose access.
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      if (token?.id) {
        await connectDB();
        const user = await User.findById(token.id).select("name").lean();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!user) return null as any;
        if (!session.user.name && user.name) session.user.name = user.name;
      }
      return session;
    },
  },
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
        } else if (
          (process.env.OTP_DEV_MODE === "true" || process.env.NODE_ENV !== "production") &&
          phone &&
          code === "1111"
        ) {
          // Debug/dev shortcut: magic OTP 1111 bypasses Firebase. Active in dev, or
          // anywhere OTP_DEV_MODE=true (e.g. to open the khati app without real OTP).
          // Normalize same as Firebase production: bare 10-digit → +91xxxxxxxxxx.
          resolvedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
        } else if (phone && code) {
          // WhatsApp OTP fallback: server-generated code sent via WhatsApp, verified against DB.
          // Works in both production and dev (dev magic code 1111 is accepted by verifyOtp).
          const { verifyOtp } = await import("@/services/otp");
          const ok = await verifyOtp(phone, code);
          if (!ok) return null;
          resolvedPhone = phone.startsWith("+") ? phone : `+91${phone}`;
        } else {
          return null;
        }

        if (!resolvedPhone) return null;

        await connectDB();

        // Match on last 10 digits so spacing/prefix differences don't break lookup.
        // Counters can also sign in via this OTP flow (in addition to email +
        // password) so their login matches the khati experience.
        const last10 = resolvedPhone.replace(/\D/g, "").slice(-10);
        const user = await User.findOne({
          phone: { $regex: last10 + "$" },
          role: { $in: ["khati", "counter"] },
        });
        if (!user) {
          console.warn(`[khati-otp] No khati/counter found matching last-10: ${last10}`);
          return null;
        }
        if (user.status !== "active") {
          console.warn(`[khati-otp] Khati found but status is "${user.status}" for phone: ${resolvedPhone}`);
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name ?? undefined,
          role: user.role as UserRole,
        };
      },
    }),
  ],
});
