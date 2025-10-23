// app/api/_lib/auth.ts

import { auth } from "@/auth";
import type { NextRequest } from "next/server";

export type Role = "ADMIN" | "ODONT" | "RECEP";

export async function requireSessionWithRoles(_req: NextRequest, allowed: Role[]) {
  const session = await auth(); // usa tu configuración ya scaffold
  if (!session?.user) {
    return { authorized: false as const, status: 401, error: "UNAUTHORIZED" as const };
  }
  // session.user.role debería existir vía callback de NextAuth
  const role = (session.user as any)?.role as Role | undefined;
  if (!role || !allowed.includes(role)) {
    return { authorized: false as const, status: 403, error: "FORBIDDEN" as const };
  }
  return { authorized: true as const, session, role };
}
