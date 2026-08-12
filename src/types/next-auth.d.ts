import type { UserRole } from "@/models/User";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      orgId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    orgId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    orgId?: string;
  }
}
