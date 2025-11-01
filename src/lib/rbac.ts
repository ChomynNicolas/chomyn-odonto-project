export type Rol = "ADMIN"|"ODONT"|"RECEP";

export function canCreatePaciente(rol: Rol) {
  return rol === "ADMIN" || rol === "RECEP" || rol === "ODONT";
}
export const canUpdatePaciente = (rol: Rol) => rol === "ADMIN" || rol === "RECEP" || rol === "ODONT";
export const canDeletePaciente = (rol: Rol) => rol === "ADMIN"; // soft delete solo admin (sugerido)

export function isRole(user: { rol?: string } | undefined, roles: Array<"ADMIN"|"ODONT"|"RECEP">) {
  if (!user?.rol) return false;
  return roles.includes(user.rol as any);
}
