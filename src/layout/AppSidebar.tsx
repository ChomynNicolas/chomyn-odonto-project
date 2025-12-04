"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { GridIcon, HorizontaLDots } from "@/icons/index";

import {
  CalendarDays,
  UserRoundPlus,
  Users,
  Settings,
  FileText,
  Shield,
} from "lucide-react";

/** =========================
 * Tipos y RBAC
 * ========================= */
type UserRole = "ADMIN" | "ODONT" | "RECEP";

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  group: "Operación" | "Pacientes" | "Clínica" | "Configuración" | "Utilidades";
};

/** =========================
 * Ítems de navegación (planos)
 * ========================= */
const navItems: NavItem[] = [
  // Operación
  { group: "Operación", name: "Inicio", path: "/", icon: <GridIcon /> },
  { group: "Operación", name: "Agenda", path: "/calendar", icon: <CalendarDays /> },

  // Pacientes
  { group: "Pacientes", name: "Pacientes", path: "/pacientes", icon: <Users /> },
  {
    group: "Pacientes",
    name: "Nuevo paciente",
    path: "/pacientes/nuevo",
    icon: <UserRoundPlus />,
    roles: ["ADMIN", "RECEP"],
  },

  // Configuración
  {
    group: "Configuración",
    name: "Configuración del Sistema",
    path: "/configuracion",
    icon: <Settings size={22} />,
    roles: ["ADMIN"],
  },

  // Utilidades
  {
    group: "Utilidades",
    name: "Reportes",
    path: "/reportes",
    icon: <FileText size={22} />,
    // All roles can access reports, but they see different reports based on role
  },
  {
    group: "Utilidades",
    name: "Auditoría",
    path: "/audit",
    icon: <Shield size={22} />,
    roles: ["ADMIN"], // Only ADMIN can access global audit log
  },
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
      // Special handling for config area - active if in /configuracion/*
      if (path === "/configuracion") {
        return pathname === "/configuracion" || pathname.startsWith("/configuracion/");
      }
      // Special handling for reportes area - active if in /reportes/*
      if (path === "/reportes") {
        return pathname === "/reportes" || pathname.startsWith("/reportes/");
      }
      // Special handling for audit area - active if in /audit/*
      if (path === "/audit") {
        return pathname === "/audit" || pathname.startsWith("/audit/");
      }
      return pathname === path || pathname.startsWith(path + "/");
    },
    [pathname]
  );

  const groups = itemsByGroupForRole(role);
  const showExpanded = isExpanded || isMobileOpen || isHovered;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 dark:text-gray-100 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* LOGO */}
      <div
        className={`pb-8 pt-4 flex ${
          !showExpanded ? "lg:justify-center" : "justify-start pb-6"
        }`}
      >
        <Link href="/">
          {showExpanded ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/chomyn-logo.svg"
                alt="Logo"
                width={250}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/chomyn-logo-dark.svg"
                alt="Logo"
                width={250}
                height={40}
              />
            </>
          ) : (
            <Image src="/images/logo/chomyn-logo-mini.svg" alt="Logo" width={40} height={40} />
          )}
        </Link>
      </div>

      {/* NAVEGACIÓN PLANA */}
      <div className="flex flex-col flex-1 overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            {groups.map(({ group, items }) => {
              if (items.length === 0) return null;
              return (
                <section key={group}>
                  <h2
                    className={`mb-3 text-xs uppercase flex leading-[20px] text-gray-400 ${
                      !showExpanded ? "lg:justify-center" : "justify-start"
                    }`}
                  >
                    {showExpanded ? group : <HorizontaLDots />}
                  </h2>

                  <ul className="flex flex-col gap-3">
                    {items.map((it) => (
                      <li key={it.path}>
                        <Link
                          href={it.path}
                          className={`menu-item group ${
                            isActive(it.path) ? "menu-item-active" : "menu-item-inactive"
                          }`}
                        >
                          <span
                            className={
                              isActive(it.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                            }
                          >
                            {it.icon}
                          </span>
                          {showExpanded && (
                            <span className="menu-item-text">{it.name}</span>
                          )}
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

      {/* FOOTER - Información de versión */}
      {showExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-6 mt-auto">
          <div className="flex flex-col items-center gap-1 text-xs text-gray-400">
            <p>Chomyn v1.0.1</p>
            <p>© 2025</p>
          </div>
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;
