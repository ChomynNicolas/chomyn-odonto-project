// src/app/api/pacientes/_rbac.ts
import { auth } from "@/auth";

export type AppRole = "ADMIN" | "ODONT" | "RECEP";

export async function requireRole(allowed: AppRole[]) {
  const session = await auth();
  const role = (session?.user as any)?.role as AppRole | undefined;
  if (!role || !allowed.includes(role)) {
    return { ok: false as const, status: 403, error: "No autorizado" };
  }
  return { ok: true as const, role, session };
}
