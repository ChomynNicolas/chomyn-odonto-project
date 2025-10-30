"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import {
  BoxCubeIcon,
  CalenderIcon,
  ChevronDownIcon,
  GridIcon,
  HorizontaLDots,
  ListIcon,
  PageIcon,
  PieChartIcon,
  PlugInIcon,
  TableIcon,
  UserCircleIcon,
} from "../icons/index";


/** ==========================================
 * Tipos ampliados para RBAC y badges (mock)
 * ========================================== */
type UserRole = "ADMIN" | "ODONT" | "RECEP";

type SubItem = {
  name: string;
  path: string;
  badgeText?: string; // ej.: "hoy 8" | "3 vencidas"
  pro?: boolean;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: SubItem[];
  roles?: UserRole[]; // visible solo para estos roles (si se define)
};



/** ================================
 * MENÚ PRINCIPAL (operación diaria)
 * ================================ */
const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Inicio",
    path: "/",
  },
  {
    icon: <CalenderIcon />,
    name: "Agenda",
    path: "/calendar",
    subItems: [
      { name: "Calendario", path: "/calendar" , badgeText: "hoy 8", pro:false, },
      { name: "Turnos pendientes", path: "/agenda/pendientes",pro:false, },
      { name: "Reprogramaciones", path: "/agenda/reprogramaciones",pro:false, },
      { name: "Ausencias (no show)", path: "/agenda/ausencias",pro:false, },
    ],
  },
  {
    icon: <UserCircleIcon />,
    name: "Pacientes",
    path: "/pacientes",
    subItems: [
      { name: "Listado", path: "/pacientes",pro:false, },
      { name: "Nuevo paciente", path: "/pacientes/nuevo" ,pro:false,},
      { name: "Búsqueda avanzada", path: "/pacientes/busqueda",pro:false, },
    ],
  },
  {
    name: "Historia Clínica",
    icon: <PageIcon />,
    path: "/historia",
    subItems: [
      { name: "Evoluciones", path: "/historia/evoluciones",pro:false, },
      { name: "Odontograma", path: "/historia/odontograma",pro:false, },
      { name: "Adjuntos del paciente", path: "/historia/adjuntos",pro:false, },
    ],
  },
  {
    name: "Adjuntos",
    icon: <ListIcon />,
    path: "/adjuntos",
    subItems: [
      { name: "Todos los archivos", path: "/adjuntos" ,pro:false,},
      { name: "Radiografías", path: "/adjuntos/rx" ,pro:false,},
      { name: "Consentimientos", path: "/adjuntos/consentimientos",pro:false, },
    ],
  },
  {
    name: "Facturación",
    icon: <TableIcon />,
    path: "/facturacion",
    subItems: [
      { name: "Facturas", path: "/facturacion", badgeText: "3 vencidas" ,pro:false,},
      { name: "Pagos", path: "/facturacion/pagos" ,pro:false,},
      { name: "Cuentas por cobrar", path: "/facturacion/cxc",pro:false, },
    ],
  },
  {
    name: "Reportes",
    icon: <PieChartIcon />,
    path: "/reportes",
    subItems: [
      { name: "Ingresos", path: "/reportes/ingresos",pro:false, },
      { name: "Por obra social", path: "/reportes/obras-sociales",pro:false, },
      { name: "Ocupación y productividad", path: "/reportes/productividad",pro:false, },
      { name: "Ausentismo", path: "/reportes/ausentismo" ,pro:false,},
    ],
  },
];

/** =======================================
 * MENÚ ADMINISTRACIÓN (gestión y seguridad)
 * ======================================= */
const adminItems: NavItem[] = [
  {
    name: "Honorarios",
    icon: <TableIcon />,
    path: "/honorarios",
    roles: ["ADMIN"],
    subItems: [
      { name: "Cálculo y liquidación", path: "/honorarios",pro:false, },
      { name: "Historial de pagos", path: "/honorarios/historial" ,pro:false,},
    ],
  },
  {
    icon: <BoxCubeIcon />,
    name: "Configuración",
    path: "/configuracion",
    roles: ["ADMIN"],
    subItems: [
      { name: "Usuarios y roles", path: "/configuracion/usuarios",pro:false, },
      { name: "Profesionales", path: "/configuracion/profesionales",pro:false, },
      { name: "Disponibilidad", path: "/configuracion/disponibilidad",pro:false, },
      { name: "Tratamientos/Servicios", path: "/configuracion/servicios" ,pro:false,},
      { name: "Obras Sociales", path: "/configuracion/obras-sociales",pro:false, },
      { name: "Notificaciones", path: "/configuracion/notificaciones",pro:false, },
      { name: "Auditoría", path: "/configuracion/auditoria",pro:false, },
      { name: "Respaldos", path: "/configuracion/respaldos",pro:false, },
    ],
  },

  // Opcional: sandbox/desarrollo interno (útil mientras maqueta)
  {
    icon: <PlugInIcon />,
    name: "Accesos",
    path: "/accesos",
    subItems: [
      { name: "Iniciar sesión", path: "/signin" ,pro:false,},
      { name: "Crear cuenta", path: "/signup",pro:false, },
    ],
  },
  {
    icon: <PageIcon />,
    name: "Utilidades",
    path: "/utilidades",
    subItems: [
      { name: "Página en blanco", path: "/blank",pro:false, },
      { name: "Error 404", path: "/error-404" ,pro:false,},
    ],
  },
];

const AppSidebar: React.FC<{ role: UserRole }> = ({ role }) => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const pathname = usePathname();

  /** Activo por startsWith (resalta padre en subrutas) */
  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      return pathname === path || pathname.startsWith(path + "/");
    },
    [pathname]
  );

  /** Filtra por RBAC (cuando roles está definido) */
  const filterByRole = useCallback(
    (items: NavItem[]) => items.filter((it) => !it.roles || it.roles.includes(role)),
    [role]
  )

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "admin";
    index: number;
  } | null>(null);

  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSubmenuToggle = (index: number, menuType: "main" | "admin") => {
    setOpenSubmenu((prev) => {
      if (prev && prev.type === menuType && prev.index === index) return null;
      return { type: menuType, index };
    });
  };

  /** Si estás en una subruta, abre su padre automáticamente */
  useEffect(() => {
    let matched = false;
    ([
      { type: "main", items: filterByRole(navItems) },
      { type: "admin", items: filterByRole(adminItems) },
    ] as const).forEach(({ type, items }) => {
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((sub) => {
            if (isActive(sub.path)) {
              setOpenSubmenu({ type, index });
              matched = true;
            }
          });
        }
      });
    });
    if (!matched) setOpenSubmenu(null);
  }, [pathname, isActive, filterByRole]);

  /** Calcula alturas para animación del acordeón */
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  /** Renderiza un bloque de menú (principal o admin) */
  const renderMenuItems = (
    list: NavItem[],
    menuType: "main" | "admin"
  ) => (
    <ul className="flex flex-col gap-4">
      {list.map((nav, index) => {
        const open =
          openSubmenu?.type === menuType && openSubmenu?.index === index;
        const key = `${menuType}-${index}`;

        return (
          <li key={nav.name}>
            {nav.subItems ? (
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group ${
                  open ? "menu-item-active" : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
              >
                <span
                  className={`${open ? "menu-item-icon-active" : "menu-item-icon-inactive"}`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text">{nav.name}</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronDownIcon
                    className={`ml-auto w-5 h-5 transition-transform duration-200 ${
                      open ? "rotate-180 text-brand-500" : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  href={nav.path}
                  className={`menu-item group ${
                    isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                  }`}
                >
                  <span
                    className={`${
                      isActive(nav.path)
                        ? "menu-item-icon-active"
                        : "menu-item-icon-inactive"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </Link>
              )
            )}

            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[key] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height: open ? `${subMenuHeight[key] ?? 0}px` : "0px",
                }}
              >
                <ul className="mt-2 space-y-1 ml-9">
                  {nav.subItems.map((sub) => (
                    <li key={sub.name}>
                      <Link
                        href={sub.path}
                        className={`menu-dropdown-item ${
                          isActive(sub.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        <span>{sub.name}</span>
                        {/* Badge opcional (mock) */}
                        {sub.badgeText && (
                          <span
                            className={`ml-auto ${
                              isActive(sub.path)
                                ? "menu-dropdown-badge-active"
                                : "menu-dropdown-badge-inactive"
                            } menu-dropdown-badge`}
                          >
                            {sub.badgeText}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
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
            <Image
              src="/images/logo/chomyn-logo-mini.svg"
              alt="Logo"
              width={40}
              height={40}
            />
          )}
        </Link>
      </div>

      {/* NAVEGACIÓN */}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-6">
            <div>
              <h2
                className={`mb-3 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Menú" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(filterByRole(navItems), "main")}
            </div>

            <div>
              <h2
                className={`mb-3 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Administración" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(filterByRole(adminItems), "admin")}
            </div>
          </div>
        </nav>

        
      </div>
    </aside>
  );
};

export default AppSidebar;
