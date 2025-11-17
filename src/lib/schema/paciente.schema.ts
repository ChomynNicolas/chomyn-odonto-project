import { z } from "zod"

/**
 * Códigos de país comunes para el selector
 */
export const CODIGOS_PAIS = [
  { code: "+595", country: "PY", label: "Paraguay (+595)" },
  { code: "+54", country: "AR", label: "Argentina (+54)" },
  { code: "+55", country: "BR", label: "Brasil (+55)" },
  { code: "+598", country: "UY", label: "Uruguay (+598)" },
  { code: "+591", country: "BO", label: "Bolivia (+591)" },
  { code: "+56", country: "CL", label: "Chile (+56)" },
  { code: "+1", country: "US", label: "Estados Unidos (+1)" },
  { code: "+34", country: "ES", label: "España (+34)" },
] as const

/**
 * Detecta el código de país desde un número de teléfono
 * No detecta formato local paraguayo (09XXXXXXXX) como código de país
 */
export function detectarCodigoPais(telefono: string): string | null {
  const clean = telefono.replace(/[\s\-()]/g, "")
  
  // Si empieza con 0, no es formato internacional, retornar null
  // (será tratado como formato local paraguayo)
  if (clean.startsWith("0")) {
    return null
  }
  
  // Si empieza con +, extraer código
  if (clean.startsWith("+")) {
    // Buscar código de país conocido
    for (const item of CODIGOS_PAIS) {
      if (clean.startsWith(item.code)) {
        return item.code
      }
    }
    // Si no está en la lista, extraer los primeros 1-3 dígitos después del +
    const match = clean.match(/^\+(\d{1,3})/)
    if (match) {
      return `+${match[1]}`
    }
  }
  
  // Buscar código de país conocido sin el +
  for (const item of CODIGOS_PAIS) {
    const codeWithoutPlus = item.code.replace("+", "")
    if (clean.startsWith(codeWithoutPlus) && clean.length > codeWithoutPlus.length) {
      return item.code
    }
  }
  
  return null
}

/**
 * Normaliza teléfono a formato E.164
 * Soporta:
 * - Formato local paraguayo: 0992361378 → +595992361378
 * - Formato internacional: +595992361378 → +595992361378
 * - Formato internacional otros países: +5491123456789 → +5491123456789
 */
export function normalizarTelefono(telefono: string, codigoPais?: string): string {
  let clean = telefono.replace(/[\s\-()]/g, "")

  // Si está vacío, retornar vacío
  if (!clean) return ""

  // Si ya tiene formato E.164, validar y retornar tal cual
  if (clean.startsWith("+")) {
    // Si es Paraguay y tiene formato inválido como +5950..., rechazar
    if (codigoPais === "+595" && clean.startsWith("+5950") && clean.length > 6) {
      // Intentar corregir: +5950992361378 → +595992361378
      const numero = clean.replace("+5950", "")
      if (/^[0-9]{7,9}$/.test(numero)) {
        return `+595${numero}`
      }
    }
    return clean
  }

  // Si tiene código de país proporcionado, usarlo
  if (codigoPais) {
    const code = codigoPais.replace("+", "")
    
    // Remover el código si ya está presente
    if (clean.startsWith(code)) {
      clean = clean.substring(code.length)
    }
    
    // Para Paraguay: eliminar 0 inicial si existe (formato local)
    if (codigoPais === "+595" && clean.startsWith("0")) {
      clean = clean.substring(1)
    }
    
    return `+${code}${clean}`
  }

  // Detectar código automáticamente
  const detectedCode = detectarCodigoPais(clean)
  if (detectedCode) {
    const code = detectedCode.replace("+", "")
    if (clean.startsWith(code)) {
      return `+${clean}`
    }
    // Para Paraguay detectado: eliminar 0 inicial si existe
    if (detectedCode === "+595" && clean.startsWith("0")) {
      clean = clean.substring(1)
      return `+595${clean}`
    }
    return `${detectedCode}${clean}`
  }

  // Si empieza con 0, asumir formato local paraguayo
  if (clean.startsWith("0")) {
    clean = clean.substring(1)
    return `+595${clean}`
  }

  // Por defecto, asumir Paraguay
  return `+595${clean}`
}

/**
 * Valida formato de teléfono según el código de país
 * Acepta formato local paraguayo (09XXXXXXXX) y formato internacional (+595XXXXXXXXX)
 */
export function validarTelefono(telefono: string, codigoPais?: string): { valido: boolean; mensaje?: string } {
  if (!telefono || !telefono.trim()) {
    return { valido: false, mensaje: "El teléfono es requerido" }
  }

  const clean = telefono.replace(/[\s\-()]/g, "")
  const code = codigoPais || detectarCodigoPais(telefono) || "+595"

  // Validación para Paraguay
  if (code === "+595") {
    // Aceptar formato local: 09XXXXXXXX
    if (clean.startsWith("0") && /^0[0-9]{7,9}$/.test(clean)) {
      return { valido: true }
    }
    
    // Aceptar formato internacional: +595XXXXXXXXX
    if (clean.startsWith("+595") && /^\+595[0-9]{7,9}$/.test(clean)) {
      // Rechazar si tiene 0 después del código (ej: +5950992361378)
      if (clean.startsWith("+5950") && clean.length > 6) {
        return { valido: false, mensaje: "Formato inválido. Ej: +595XXXXXXXXX o 09XXXXXXXX" }
      }
      return { valido: true }
    }
    
    // Rechazar otros formatos
    return { valido: false, mensaje: "Formato inválido. Ej: +595XXXXXXXXX o 09XXXXXXXX" }
  }

  // Validación para otros países
  if (!clean.startsWith("+")) {
    return { valido: false, mensaje: `Incluya el código de país. Ej: ${code}XXXXXXXXXX` }
  }

  // Validación genérica E.164 (mínimo 7 dígitos después del código)
  const numero = clean.replace(/^\+\d{1,3}/, "")
  if (!/^[0-9]{7,15}$/.test(numero)) {
    return { valido: false, mensaje: `Formato inválido. Ej: ${code}XXXXXXXXXX` }
  }

  return { valido: true }
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
 * Valida formato de teléfono Paraguay (E.164) - Mantenido para compatibilidad
 * @deprecated Usar validarTelefono en su lugar
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
    message: "Seleccione el género del paciente",
  }),

  fechaNacimiento: z.coerce
    .date("Ingrese la fecha de nacimiento")
    .min(new Date("1900-01-01"), "Fecha inválida. Verifique el año")
    .max(new Date(), "La fecha no puede ser futura"),

  tipoDocumento: z.enum(["CI", "DNI", "PASAPORTE", "RUC"], {
    message: "Seleccione el tipo de documento",
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
    .transform((val) => normalizarTelefono(val))
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
      personaId: z.number().int().positive({ message: "ID de persona inválido" }),
      relacion: z.enum(["PADRE", "MADRE", "TUTOR", "CONYUGE", "HIJO", "FAMILIAR", "EMPRESA", "OTRO"]),
      esPrincipal: z.boolean().default(true),
    })
    .optional(),

  origen: z.enum(["web", "mobile", "api"]).default("web"),
  version: z.literal("2.0").default("2.0"),
})

export type PacienteCreateDTOV2 = z.infer<typeof PacienteCreateSchemaV2>


// ==== Enums cliente
// Enum con mensaje personalizado para cuando falta seleccionar o es inválido
export const ClientGeneroEnum = z.preprocess(
  (val) => val,
  z
    .union([z.enum(["M", "F", "X"]), z.undefined(), z.null(), z.string()])
    .refine(
      (val) => val === "M" || val === "F" || val === "X",
      {
        message: "Seleccione el género del paciente",
      }
    )
    .transform((val) => val as "M" | "F" | "X")
)
export const ClientTipoDocumentoEnum = z.enum(["CI", "DNI", "PASAPORTE", "RUC", "OTRO"])

export const ClientAllergySeverityEnum = z.enum(["MILD", "MODERATE", "SEVERE"])

// ==== Inputs tipados (arrays de objetos)
export const AllergyInputClientSchema = z.object({
  id: z.number().int().optional(),         // id de catálogo (opcional)
  label: z.string().min(1).max(120).optional(), // libre si no hay catálogo
  severity: ClientAllergySeverityEnum.default("MODERATE").optional(),
  reaction: z.string().max(255).optional(), // Reacción alérgica observada
  notedAt: z.string().datetime().optional(), // Fecha de diagnóstico o nota (datetime)
  notes: z.string().max(500).optional(), // Comentarios adicionales (texto libre)
  isActive: z.boolean().default(true).optional(),
})

export const MedicationInputClientSchema = z.object({
  id: z.number().int().optional(),
  label: z.string().min(1).max(255).optional(),
  dose: z.string().max(120).optional(),
  freq: z.string().max(120).optional(),
  route: z.string().max(120).optional(),
  startAt: z.string().datetime().optional(), // Fecha de inicio del tratamiento (datetime)
  endAt: z.string().datetime().optional(), // Fecha de fin del tratamiento (datetime)
  notes: z.string().max(500).optional(), // Comentarios adicionales (texto libre)
  isActive: z.boolean().default(true).optional(),
})

export const VitalsClientSchema = z.object({
  measuredAt: z.string().datetime(),
  heightCm: z.number().int().min(50).max(250).optional(),
  weightKg: z.number().min(10).max(300).optional(),
  bmi: z.number().min(5).max(80).optional(),
  bpSyst: z.number().int().min(60).max(250).optional(),
  bpDiast: z.number().int().min(30).max(160).optional(),
  heartRate: z.number().int().min(30).max(220).optional(),
  notes: z.string().max(200).optional(),
})

// === Tipos de adjuntos ===

// Adjunto persistido en BD (ya guardado)
export const AdjuntoPersistidoSchema = z.object({
  id: z.string(), // idAdjunto de BD
  nombre: z.string(),
  url: z.string().url(),
  tipoMime: z.string(),
  tamañoBytes: z.number().int().nonnegative(),
  publicId: z.string(),
  tipoAdj: z.enum(["XRAY", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO", "IMAGE", "DOCUMENT", "PDF", "LAB_REPORT", "OTHER"]),
  descripcion: z.string().optional(),
  createdAt: z.string().datetime().optional(),
})

export type AdjuntoPersistido = z.infer<typeof AdjuntoPersistidoSchema>

// Metadata de Cloudinary (después de subir)
export const FileItemCloudSchema = z.object({
  publicId: z.string(),
  secureUrl: z.string().url(),
  bytes: z.number().int().nonnegative(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  duration: z.number().optional(),
  resourceType: z.string().optional(),
  folder: z.string().optional(),
  originalFilename: z.string().optional(),
  etag: z.string().optional(),
  version: z.number().int().optional(),
  accessMode: z.enum(["PUBLIC", "AUTHENTICATED"]).optional(),
})

// Adjunto en UI (pendiente, subiendo, cargado, error)
// Este tipo se usa en el frontend para representar adjuntos antes de persistir
export const AdjuntoUISchema = z.object({
  id: z.string(), // ID temporal único para el frontend
  nombre: z.string(),
  tipoMime: z.string(),
  tamañoBytes: z.number().int().nonnegative(),
  tipoUi: z.enum(["FOTO", "RADIOGRAFIA", "DOCUMENTO", "OTRO"]),
  tipoAdj: z.enum(["XRAY", "INTRAORAL_PHOTO", "EXTRAORAL_PHOTO", "IMAGE", "DOCUMENT", "PDF", "LAB_REPORT", "OTHER"]).optional(),
  estado: z.enum(["pendiente", "subiendo", "cargado", "error"]),
  url: z.string().optional(), // URL de Cloudinary cuando ya está subido
  publicId: z.string().optional(), // publicId de Cloudinary cuando ya está subido
  errorMensaje: z.string().optional(),
  _cloud: FileItemCloudSchema.optional(), // Metadata completa de Cloudinary
})

export type AdjuntoUI = z.infer<typeof AdjuntoUISchema>

// Schema legacy para compatibilidad (deprecated)
export const FileItemClientSchema = AdjuntoUISchema

export const PacienteCreateSchemaClient = z
  .object({
  nombreCompleto: z
    .string("El nombre completo es requerido")
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .regex(
      /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s-]+$/,
      "El nombre solo puede contener letras y espacios"
    ),
  
  genero: ClientGeneroEnum,
  
  fechaNacimiento: z.coerce
    .date("Ingrese una fecha válida")
    .min(new Date("1902-01-01"), "La fecha de nacimiento no puede ser anterior a 1902")
    .max(new Date(), "La fecha de nacimiento no puede ser una fecha futura"),

  tipoDocumento: ClientTipoDocumentoEnum.default("CI"),
  
  numeroDocumento: z
    .string("El número de documento es requerido")
    .min(6, "El número de documento debe tener al menos 6 caracteres")
    .max(20, "El número de documento no puede exceder 20 caracteres"),
  
  ruc: z.string().max(20, "El RUC no puede exceder 20 caracteres").optional(),
  
  paisEmision: z.string().length(2, "Código de país inválido").default("PY"),

  direccion: z
    .string("La dirección es requerida")
    .min(6, "La dirección debe tener al menos 6 caracteres")
    .max(200, "La dirección no puede exceder 200 caracteres"),
  
  ciudad: z
    .string("La ciudad es requerida")
    .min(2, "La ciudad debe tener al menos 2 caracteres")
    .max(100, "La ciudad no puede exceder 100 caracteres"),
  
  pais: z.string().length(2, "Código de país inválido").default("PY"),

  // Código de país del teléfono (opcional, por defecto +595 para Paraguay)
  codigoPaisTelefono: z.string().default("+595").optional(),

  telefono: z
    .string("El teléfono es requerido")
    .min(1, "El teléfono es requerido")
    .refine(
      (val) => {
        if (!val || val.trim() === "") return false
        // Permitir espacios y guiones durante la entrada (se normalizarán después)
        return true
      },
      {
        message: "El teléfono es requerido",
      }
    ),
  
  email: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true // Opcional, puede estar vacío
        return z.string().email().safeParse(val).success
      },
      {
        message: "Formato de email inválido. Ej: paciente@ejemplo.com",
      }
    )
    .refine(
      (val) => !val || val.length <= 100,
      {
        message: "El email no puede exceder 100 caracteres",
      }
    ),

  preferenciasContacto: z
    .array(z.enum(["WHATSAPP", "LLAMADA", "EMAIL", "SMS"]))
    .min(1, "Seleccione al menos un canal para recordatorios y notificaciones"),
  preferenciasRecordatorio: z.array(z.enum(["WHATSAPP", "EMAIL", "SMS"])).default([]),
  preferenciasCobranza: z.array(z.enum(["WHATSAPP", "EMAIL", "SMS"])).default([]),

  // —— ahora arrays tipados
  alergias: z.array(AllergyInputClientSchema).default([]),
  medicacion: z.array(MedicationInputClientSchema).default([]),

  // Antecedentes médicos estructurados
  antecedentes_resumen: z.string().max(1000).optional(),
  
  // Preguntas rápidas de antecedentes
  antecedente_hipertension: z.boolean().default(false).optional(),
  antecedente_hipertension_detalle: z.string().max(255).optional().nullable(),
  
  antecedente_diabetes: z.boolean().default(false).optional(),
  antecedente_diabetes_detalle: z.string().max(255).optional().nullable(),
  
  antecedente_anticoagulantes: z.boolean().default(false).optional(),
  antecedente_anticoagulantes_detalle: z.string().max(255).optional().nullable(),
  
  antecedente_cirugia_mayor: z.boolean().default(false).optional(),
  antecedente_cirugia_mayor_detalle: z.string().max(255).optional().nullable(),
  
  antecedente_infeccioso_cronico: z.boolean().default(false).optional(),
  antecedente_infeccioso_cronico_detalle: z.string().max(255).optional().nullable(),
  
  antecedente_problemas_coagulacion: z.boolean().default(false).optional(),
  antecedente_problemas_coagulacion_detalle: z.string().max(255).optional().nullable(),
  
  antecedente_embarazo_lactancia: z.enum(["NINGUNO", "EMBARAZO", "LACTANCIA"]).default("NINGUNO").optional(),
  antecedente_embarazo_lactancia_detalle: z.string().max(255).optional().nullable(),

  // Mantener por compatibilidad (deprecated)
  antecedentes: z.string().max(1000).optional(),
  
  observaciones: z.string().max(500).optional(),

  responsablePago: z
    .object({
      personaId: z.number().int().positive({ message: "ID de persona inválido" }),
      relacion: z.enum(["PADRE", "MADRE", "TUTOR", "CONYUGE", "HIJO", "FAMILIAR", "EMPRESA", "OTRO"]),
      esPrincipal: z.boolean().default(true),
    })
    .optional(),

  // enviado sólo si habilitás en el paso clínico
  vitals: VitalsClientSchema.optional(),

  // adjuntos opcionales (archivos pendientes de subir/persistir)
  adjuntos: z.array(AdjuntoUISchema).default([]).optional(),

  // el flujo no necesita enviar origen/version desde el cliente
  })
  .superRefine((data, ctx) => {
    // Validar teléfono con código de país usando validación robusta
    const codigoPais = data.codigoPaisTelefono || "+595"
    
    if (!data.telefono || data.telefono.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El teléfono es requerido",
        path: ["telefono"],
      })
      return
    }

    // Validar formato usando phone-utils (más robusto)
    const resultado = validarTelefono(data.telefono, codigoPais)
    if (!resultado.valido) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: resultado.mensaje || "Formato de teléfono inválido. Ej: 0991234567 o +595991234567",
        path: ["telefono"],
      })
      return
    }

    // Validación adicional: rechazar caracteres no numéricos (excepto + y espacios/guiones que se normalizan)
    const tieneCaracteresInvalidos = /[^\d+\s\-()]/.test(data.telefono)
    if (tieneCaracteresInvalidos) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El teléfono solo puede contener números, espacios, guiones y el símbolo +",
        path: ["telefono"],
      })
    }
  })
  .transform((data) => {
    // Normalizar teléfono después de validar
    const codigoPais = data.codigoPaisTelefono || "+595"
    if (data.telefono && data.telefono.trim()) {
      return {
        ...data,
        telefono: normalizarTelefono(data.telefono, codigoPais),
      }
    }
    return data
  })

export type PacienteCreateDTOClient = z.infer<typeof PacienteCreateSchemaClient>

// Tipo de entrada del formulario (para react-hook-form)
// fechaNacimiento puede ser Date | string | undefined en el input (z.coerce.date() acepta ambos)
export type PacienteCreateFormInput = Omit<PacienteCreateDTOClient, "fechaNacimiento"> & {
  fechaNacimiento?: Date | string
}
// Tipo de salida del formulario (después de transformaciones)
export type PacienteCreateFormOutput = PacienteCreateDTOClient
