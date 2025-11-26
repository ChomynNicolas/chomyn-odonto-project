import React from "react"
import {
  UserRoundCog,
  Shield,
  DoorOpen,
  Pill,
  ClipboardList,
  Stethoscope,
  AlertCircle,
  FileText,
} from "lucide-react"
import { HiOutlineIdentification } from "react-icons/hi"
import { MdOutlineMedicalInformation } from "react-icons/md"

export type ConfigNavItem = {
  id: string
  label: string
  path: string
  icon: React.ReactNode
  description?: string
}

export type ConfigNavGroup = {
  id: string
  label: string
  items: ConfigNavItem[]
}

export const configNavigation: ConfigNavGroup[] = [
  {
    id: "usuarios-acceso",
    label: "Usuarios y Acceso",
    items: [
      {
        id: "usuarios",
        label: "Usuarios",
        path: "/configuracion/usuarios",
        icon: <UserRoundCog size={22} />,
        description: "Gestión de usuarios del sistema",
      },
      {
        id: "roles",
        label: "Roles",
        path: "/configuracion/roles",
        icon: <Shield size={22} />,
        description: "Gestión de roles y permisos",
      },
    ],
  },
  {
    id: "personal-recursos",
    label: "Personal y Recursos",
    items: [
      {
        id: "profesionales",
        label: "Profesionales",
        path: "/configuracion/profesionales",
        icon: <HiOutlineIdentification size={26} />,
        description: "Gestión de profesionales",
      },
      {
        id: "especialidades",
        label: "Especialidades",
        path: "/configuracion/especialidades",
        icon: <Stethoscope size={22} />,
        description: "Gestión de especialidades dentales",
      },
      {
        id: "consultorios",
        label: "Consultorios",
        path: "/configuracion/consultorios",
        icon: <DoorOpen size={22} />,
        description: "Gestión de consultorios (salas de atención)",
      },
    ],
  },
  {
    id: "catalogos-clinicos",
    label: "Catálogos Clínicos",
    items: [
      {
        id: "procedimientos",
        label: "Tratamientos/Servicios",
        path: "/configuracion/procedimientos",
        icon: <MdOutlineMedicalInformation size={26} />,
        description: "Catálogo de procedimientos clínicos",
      },
      {
        id: "diagnosis",
        label: "Diagnósticos",
        path: "/configuracion/diagnosis-catalog",
        icon: <Stethoscope size={22} />,
        description: "Catálogo de diagnósticos (ICD-10)",
      },
      {
        id: "medications",
        label: "Medicamentos",
        path: "/configuracion/medications",
        icon: <Pill size={22} />,
        description: "Catálogo de medicamentos",
      },
      {
        id: "antecedentes",
        label: "Antecedentes",
        path: "/configuracion/antecedent-catalog",
        icon: <ClipboardList size={22} />,
        description: "Catálogo de antecedentes médicos",
      },
      {
        id: "allergies",
        label: "Alergias",
        path: "/configuracion/allergies",
        icon: <AlertCircle size={22} />,
        description: "Catálogo de alergias",
      },
      {
        id: "anamnesis-config",
        label: "Configuración de Anamnesis",
        path: "/configuracion/anamnesis-config",
        icon: <FileText size={22} />,
        description: "Configuración de flujos de anamnesis",
      },
    ],
  },
]

// Default route for redirect
export const DEFAULT_CONFIG_ROUTE = "/configuracion/usuarios"

