import "next-auth";
import type { PlanId } from "@/lib/plans";
import type { UserRole } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: PlanId;
      handle: string;
      role: UserRole;
      emailVerified: boolean;
    };
  }

  interface User {
    plan?: PlanId;
    handle?: string;
    role?: UserRole;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    plan?: PlanId;
    handle?: string;
    role?: UserRole;
    emailVerified?: boolean;
    banned?: boolean;
  }
}
