// src/lib/user-prefs.ts  (SERVER)
import { cookies } from "next/headers";
import type { Rol } from "@/lib/rbac";

export type DashboardTab = "hoy" | "clinico" | "gestion" | "finanzas";
const COOKIE_KEY = "chomyn.dashboard.tab";

export async function getUserPreferredTab(role: Rol): Promise<DashboardTab> {
  // 👇 AHORA ASÍ
  const cookieStore = await cookies();
  const v = cookieStore.get(COOKIE_KEY)?.value as DashboardTab | undefined;
  if (v) return v;
  // fallback por rol
  return role === "ODONT" ? "clinico" : "hoy";
}
