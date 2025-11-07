import { z } from "zod"

/**
 * Normaliza teléfono a formato E.164 (+595XXXXXXXXX)
 */
export function normalizarTelefono(telefono: string): string {
  let clean = telefono.replace(/[\s\-()]/g, "")

  if (clean.startsWith("0")) {
    clean = clean.substring(1)
  }

  if (!clean.startsWith("+595")) {
    if (!clean.startsWith("595")) {
      clean = "595" + clean
    }
    clean = "+" + clean
  }

  return clean
}

/**
 * Normaliza email: trim, lowercase dominio
 */
export function normalizarEmail(email: string): string {
  const trimmed = email.trim()
  const [localPart, domain] = trimmed.split("@")
  if (!domain) return trimmed.toLowerCase()
  return `${localPart}@${domain.toLowerCase()}`
}

/**
 * Valida formato de teléfono Paraguay (E.164)
 */
export function validarTelefonoPY(telefono: string): boolean {
  const normalized = normalizarTelefono(telefono)
  return /^\+595[0-9]{7,9}$/.test(normalized)
}

/**
 * Detecta si es teléfono móvil (tiene WhatsApp potencial)
 */
export function esMovilPY(telefono: string): boolean {
  const normalized = normalizarTelefono(telefono)
  const prefijosMoviles = [
    "961",
    "971",
    "972",
    "973",
    "974",
    "975",
    "976",
    "981",
    "982",
    "983",
    "984",
    "985",
    "986",
    "991",
    "992",
    "994",
    "995",
  ]

  for (const prefijo of prefijosMoviles) {
    if (normalized.startsWith(`+595${prefijo}`)) {
      return true
    }
  }
  return false
}

/**
 * Valida documento según tipo
 */
export function validarDocumento(numero: string, tipo: string): boolean {
  const clean = numero.replace(/[.\-\s]/g, "")

  switch (tipo) {
    case "CI":
    case "DNI":
      return /^[0-9]{6,8}$/.test(clean)

    case "RUC":
      if (!/^[0-9]{2}[0-9]{6}[0-9]$/.test(clean)) {
        return false
      }
      return true

    case "PASAPORTE":
      return /^[A-Z0-9]{6,12}$/i.test(clean)

    default:
      return false
  }
}

/**
 * Calcula edad a partir de fecha de nacimiento
 */
export function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date()
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear()
  const mes = hoy.getMonth() - fechaNacimiento.getMonth()

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--
  }

  return edad
}

export const PacienteCreateSchemaV2 = z.object({
  nombreCompleto: z
    .string()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]+$/, "Solo se permiten letras, espacios y guiones"),

  genero: z.enum(["M", "F", "X"], {
    errorMap: () => ({ message: "Seleccione el género del paciente" }),
  }),

  fechaNacimiento: z.coerce
    .date({
      required_error: "Ingrese la fecha de nacimiento",
      invalid_type_error: "Fecha inválida",
    })
    .min(new Date("1900-01-01"), "Fecha inválida. Verifique el año")
    .max(new Date(), "La fecha no puede ser futura"),

  tipoDocumento: z.enum(["CI", "DNI", "PASAPORTE", "RUC"], {
    errorMap: () => ({ message: "Seleccione el tipo de documento" }),
  }),

  numeroDocumento: z
    .string()
    .min(6, "El documento debe tener al menos 6 caracteres")
    .max(20, "El documento no puede exceder 20 caracteres")
    .refine((val) => val.trim().length >= 6, "Ingrese un número de documento válido"),

  ruc: z.string().max(20).optional(),

  paisEmision: z.string().length(2, "Código de país inválido").default("PY"),

  direccion: z
    .string()
    .min(10, "La dirección debe tener al menos 10 caracteres")
    .max(200, "La dirección no puede exceder 200 caracteres"),

  ciudad: z.string().min(2, "Ingrese la ciudad").max(100, "La ciudad no puede exceder 100 caracteres"),

  pais: z.string().length(2, "Código de país inválido").default("PY"),

  telefono: z
    .string()
    .min(10, "Ingrese un número de teléfono válido")
    .transform(normalizarTelefono)
    .refine(validarTelefonoPY, "Formato inválido. Ej: +595 981 123456"),

  email: z
    .string()
    .email("Formato de email inválido. Ej: paciente@ejemplo.com")
    .max(100, "El email no puede exceder 100 caracteres")
    .transform(normalizarEmail),

  preferenciasContacto: z
    .array(z.enum(["WHATSAPP", "LLAMADA", "EMAIL", "SMS"]))
    .min(1, "Seleccione al menos un canal de contacto"),

  preferenciasRecordatorio: z.array(z.enum(["WHATSAPP", "EMAIL", "SMS"])).default([]),

  preferenciasCobranza: z.array(z.enum(["WHATSAPP", "EMAIL", "SMS"])).default([]),

  alergias: z.string().max(500, "Máximo 500 caracteres").optional(),

  medicacion: z.string().max(500, "Máximo 500 caracteres").optional(),

  antecedentes: z.string().max(1000, "Máximo 1000 caracteres").optional(),

  observaciones: z.string().max(500, "Máximo 500 caracteres").optional(),

  responsablePago: z
    .object({
      personaId: z.string().uuid("ID de persona inválido"),
      relacion: z.enum(["PADRE", "MADRE", "TUTOR", "CONYUGE", "HIJO", "FAMILIAR", "EMPRESA", "OTRO"]),
      esPrincipal: z.boolean().default(true),
    })
    .optional(),

  origen: z.enum(["web", "mobile", "api"]).default("web"),
  version: z.literal("2.0").default("2.0"),
})

export type PacienteCreateDTOV2 = z.infer<typeof PacienteCreateSchemaV2>

export const PacienteCreateSchemaClient = PacienteCreateSchemaV2.omit({
  origen: true,
  version: true,
})

export type PacienteCreateDTOClient = z.infer<typeof PacienteCreateSchemaClient>
