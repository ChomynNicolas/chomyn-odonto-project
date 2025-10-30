export type Rol = "ADMIN" | "ODONT" | "RECEP";

export function canCreateProcedure(rol?: string) {
  return rol === "ADMIN" || rol === "ODONT";
}
