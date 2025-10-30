"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PlugInIcon,
  UserCircleIcon,
} from "../icons/index";

/** =========================
 * Tipos y RBAC
 * ========================= */
type UserRole = "ADMIN" | "ODONT" | "RECEP";

type NavItem = {
  name: string;
  path: string; // ruta directa top-level
  icon: React.ReactNode;
  roles?: UserRole[]; // visibilidad por rol
  group: "Operación" | "Pacientes" | "Clínica" | "Configuración" | "Utilidades";
};

/** =========================
 * Ítems de navegación (planos)
 * ========================= */
const navItems: NavItem[] = [
  // Operación
  { group: "Operación", name: "Inicio", path: "/", icon: <GridIcon /> },
  { group: "Operación", name: "Agenda", path: "/calendar", icon: <CalenderIcon /> },
  { group: "Operación", name: "Turnos pendientes", path: "/agenda/pendientes", icon: <ListIcon />, roles: ["ADMIN", "RECEP"] },
  { group: "Operación", name: "Reprogramaciones", path: "/agenda/reprogramaciones", icon: <ListIcon />, roles: ["ADMIN", "RECEP"] },
  { group: "Operación", name: "Ausencias (no show)", path: "/agenda/ausencias", icon: <ListIcon />, roles: ["ADMIN", "RECEP"] },

  // Pacientes
  { group: "Pacientes", name: "Pacientes", path: "/pacientes", icon: <UserCircleIcon /> },
  { group: "Pacientes", name: "Nuevo paciente", path: "/pacientes/nuevo", icon: <UserCircleIcon />, roles: ["ADMIN", "RECEP"] },

  // Clínica (launchers a detalle por ID)
  { group: "Clínica", name: "Ir a paciente", path: "/pacientes/detalle", icon: <PageIcon /> },
  { group: "Clínica", name: "Historia clínica", path: "/pacientes/historia", icon: <PageIcon />, roles: ["ADMIN", "ODONT"] },
  { group: "Clínica", name: "Odontograma", path: "/pacientes/odontograma", icon: <PageIcon />, roles: ["ADMIN", "ODONT"] },
  { group: "Clínica", name: "Citas del paciente", path: "/pacientes/citas", icon: <PageIcon /> },
  { group: "Clínica", name: "Adjuntos del paciente", path: "/pacientes/adjuntos", icon: <PageIcon /> },

  // Configuración (solo ADMIN)
  { group: "Configuración", name: "Usuarios y roles", path: "/configuracion/usuarios", icon: <BoxCubeIcon />, roles: ["ADMIN"] },
  { group: "Configuración", name: "Profesionales", path: "/configuracion/profesionales", icon: <BoxCubeIcon />, roles: ["ADMIN"] },
  { group: "Configuración", name: "Tratamientos/Servicios", path: "/configuracion/servicios", icon: <BoxCubeIcon />, roles: ["ADMIN"] },

  // Utilidades
  { group: "Utilidades", name: "Iniciar sesión", path: "/signin", icon: <PlugInIcon /> },
  { group: "Utilidades", name: "Crear cuenta", path: "/signup", icon: <PlugInIcon />, roles: ["ADMIN"] },
  { group: "Utilidades", name: "Página en blanco", path: "/blank", icon: <PageIcon /> },
  { group: "Utilidades", name: "Error 404", path: "/error-404", icon: <PageIcon /> },
];

/** =========================
 * Helpers agrupación y activo
 * ========================= */
const orderedGroups = ["Operación", "Pacientes", "Clínica", "Configuración", "Utilidades"] as const;

function itemsByGroupForRole(role: UserRole) {
  const visible = navItems.filter((it) => !it.roles || it.roles.includes(role));
  return orderedGroups.map((g) => ({
    group: g,
    items: visible.filter((i) => i.group === g),
  }));
}

/** =========================
 * Componente principal
 * ========================= */
const AppSidebar: React.FC<{ role: UserRole }> = ({ role }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      return pathname === path || pathname.startsWith(path + "/");
    },
    [pathname]
  );

  const groups = itemsByGroupForRole(role);

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LOGO */}
      <div className={`pb-8 pt-4 flex ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start pb-6"}`}>
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <Image className="dark:hidden" src="/images/logo/chomyn-logo.svg" alt="Logo" width={250} height={40} />
              <Image className="hidden dark:block" src="/images/logo/chomyn-logo-dark.svg" alt="Logo" width={250} height={40} />
            </>
          ) : (
            <Image src="/images/logo/chomyn-logo-mini.svg" alt="Logo" width={40} height={40} />
          )}
        </Link>
      </div>

      {/* NAVEGACIÓN PLANA */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {groups.map(({ group, items }) => {
              if (items.length === 0) return null;
              return (
                <section key={group}>
                  <h2
                    className={`mb-3 text-xs uppercase flex leading-[20px] text-gray-400 ${
                      !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                    }`}
                  >
                    {isExpanded || isHovered || isMobileOpen ? group : <HorizontaLDots />}
                  </h2>

                  <ul className="flex flex-col gap-3">
                    {items.map((it) => (
                      <li key={it.path}>
                        <Link
                          href={it.path}
                          className={`menu-item group ${isActive(it.path) ? "menu-item-active" : "menu-item-inactive"}`}
                        >
                          <span className={isActive(it.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"}>
                            {it.icon}
                          </span>
                          {(isExpanded || isHovered || isMobileOpen) && <span className="menu-item-text">{it.name}</span>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
