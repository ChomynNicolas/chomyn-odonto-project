// components/icons/role-icon-map.ts
export type RolNombre = "ADMIN" | "ODONT" | "RECEP";

/** nombres de archivo en /public/images/icons/*.svg (sin .svg) */
export const ROLE_ICON_NAME: Record<RolNombre, string> = {
  ADMIN: "admin",      
  ODONT: "dentist",      
  RECEP: "recep",    
};
