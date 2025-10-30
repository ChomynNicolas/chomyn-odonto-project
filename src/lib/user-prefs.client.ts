// src/lib/user-prefs.client.ts (client)
"use client";
import type { DashboardTab } from "./user-prefs";
export function savePreferredTab(role: "RECEP"|"ODONT"|"ADMIN", tab: DashboardTab) {
  document.cookie = `chomyn.dashboard.tab=${tab}; path=/; max-age=${60*60*24*365}`;
}
