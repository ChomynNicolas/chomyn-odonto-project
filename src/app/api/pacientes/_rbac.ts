// src/app/api/pacientes/_rbac.ts
import { auth } from "@/auth";
import type { Session } from "next-auth";

export type AppRole = "ADMIN" | "ODONT" | "RECEP";

type OkGate = {
  ok: true;
  role: AppRole;
  session: Session;
  userId?: number;
};
type FailGate = { ok: false; status: 403; error: "No autorizado" };
export type GateResult = OkGate | FailGate;

/**
 * Requiere que el usuario autenticado tenga alguno de los roles permitidos.
 * Devuelve { ok: true, role, session, userId } o { ok: false, 403 }.
 */
export async function requireRole(allowed: AppRole[]): Promise<GateResult> {
  const session = await auth();
  if (!session) {
    return { ok: false, status: 403, error: "No autorizado" };
  }

  const role = session.user?.role as AppRole | undefined;
  if (!role || !allowed.includes(role)) {
    return { ok: false, status: 403, error: "No autorizado" };
  }

  const rawId = session.user?.id;
  const userId = rawId != null ? Number(rawId) : undefined;

  return { ok: true, role, session, userId };
}
