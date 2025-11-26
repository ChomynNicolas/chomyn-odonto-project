"use client";
import React, { useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useSidebar } from "@/context/SidebarContext";
import { GridIcon, HorizontaLDots } from "@/icons/index";

import {
  CalendarDays,
  CalendarSearch,
  LogIn,
  UserRoundPlus,
  Users,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { SlUserFollow } from "react-icons/sl";

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
  { group: "Operación", name: "Búsqueda de Citas", path: "/citas", icon: <CalendarSearch /> },

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

  // Utilidades - Solo "Crear cuenta" (Iniciar sesión no se muestra si está autenticado)
  {
    group: "Utilidades",
    name: "Crear cuenta",
    path: "/signup",
    icon: <SlUserFollow size={28} className="-ml-1" />,
    roles: ["ADMIN"],
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
  const { data: session, status } = useSession();

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      // Special handling for config area - active if in /configuracion/*
      if (path === "/configuracion") {
        return pathname === "/configuracion" || pathname.startsWith("/configuracion/");
      }
      return pathname === path || pathname.startsWith(path + "/");
    },
    [pathname]
  );

  const groups = itemsByGroupForRole(role);

  // Handler para cerrar sesión
  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl: "/signin",
        redirect: true,
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // Obtener nombre del usuario
  const userName = session?.user?.name || session?.user?.username || "Usuario";
  const userRoleLabel =
    role === "ADMIN" ? "Administrador" : role === "ODONT" ? "Odontólogo" : "Recepcionista";

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
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start pb-6"
        }`}
      >
        <Link href="/">
          {isExpanded || isHovered || isMobileOpen ? (
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
                          {(isExpanded || isHovered || isMobileOpen) && (
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

      {/* SECCIÓN DE USUARIO - Footer fijo al final */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-4 pb-6 mt-auto">
        {isLoading ? (
          // Skeleton de carga
          <div
            className={`flex items-center gap-3 ${
              !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            {(isExpanded || isHovered || isMobileOpen) && (
              <div className="flex-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1 animate-pulse" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse" />
              </div>
            )}
          </div>
        ) : isAuthenticated ? (
          <>
            {/* Info del usuario autenticado */}
            <div
              className={`flex items-center gap-3 mb-3 ${
                !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-teal-500 dark:bg-teal-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                <User size={18} />
              </div>
              {(isExpanded || isHovered || isMobileOpen) && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userRoleLabel}
                  </p>
                </div>
              )}
            </div>

            {/* Botón cerrar sesión */}
            <button
              onClick={handleSignOut}
              className={`menu-item menu-item-inactive w-full hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors ${
                !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
              }`}
              title="Cerrar sesión"
            >
              <span className="menu-item-icon-inactive">
                <LogOut size={22} />
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className="menu-item-text">Cerrar sesión</span>
              )}
            </button>
          </>
        ) : (
          // Usuario no autenticado - Mostrar botón de login
          <Link
            href="/signin"
            className={`menu-item menu-item-inactive ${
              !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
            }`}
          >
            <span className="menu-item-icon-inactive">
              <LogIn size={22} />
            </span>
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="menu-item-text">Iniciar sesión</span>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
