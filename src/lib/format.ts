// src/lib/format.ts
export function formatMoneyPYG(n: number) {
  try {
    return new Intl.NumberFormat("es-PY", { style: "currency", currency: "PYG", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₲ ${Math.round(n).toLocaleString("es-PY")}`;
  }
}
export function formatDateTime(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString();
}
export const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));
