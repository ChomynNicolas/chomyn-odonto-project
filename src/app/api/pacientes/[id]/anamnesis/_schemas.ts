// src/app/api/pacientes/[id]/anamnesis/_schemas.ts
import { z } from "zod"

// ============================================================================
// ENUMS
// ============================================================================

export const AnamnesisTipoEnum = z.enum(["ADULTO", "PEDIATRICO"])
export type AnamnesisTipo = z.infer<typeof AnamnesisTipoEnum>

export const AnamnesisUrgenciaEnum = z.enum(["RUTINA", "PRIORITARIO", "URGENCIA"])
export type AnamnesisUrgencia = z.infer<typeof AnamnesisUrgenciaEnum>

export const AnamnesisOrigenEnum = z.enum(["PRE_CITA", "EN_CONSULTA", "RECEPCION"])
export type AnamnesisOrigen = z.infer<typeof AnamnesisOrigenEnum>

// ============================================================================
// SCHEMAS ZOD - Secciones del Payload
// ============================================================================

// Base
const AnamnesisBaseSchema = z.object({
  tipo: AnamnesisTipoEnum,
  fecha: z.string().datetime(),
  origen: AnamnesisOrigenEnum,
  versionFormulario: z.string().default("1.0.0"),
  ultimaActualizacion: z.object({
    fecha: z.string().datetime(),
    usuarioId: z.number().int().positive(),
  }),
})

// Datos personales (snapshot)
const AnamnesisDatosPersonalesSchema = z.object({
  paciente: z.object({
    nombreCompleto: z.string(),
    fechaNacimiento: z.string().datetime().optional(),
    edad: z.number().int().min(0).max(150).optional(),
    genero: z.enum(["MASCULINO", "FEMENINO", "OTRO", "NO_ESPECIFICADO"]).optional(),
    documento: z.string().optional(),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
    email: z.string().email().optional(),
  }),
  responsableLegal: z
    .object({
      nombreCompleto: z.string(),
      relacion: z.string(),
      documento: z.string().optional(),
      telefono: z.string().optional(),
    })
    .optional(),
})

// Antecedentes médicos
const AnamnesisAntecedentesMedicosSchema = z.object({
  enfermedades: z.array(z.string()).default([]),
  otrasEnfermedades: z.string().optional(),
  hospitalizaciones: z
    .array(
      z.object({
        fecha: z.string().datetime().optional(),
        motivo: z.string(),
        lugar: z.string().optional(),
      }),
    )
    .default([]),
  alergias: z
    .array(
      z.object({
        sustancia: z.string(),
        reaccion: z.string().optional(),
      }),
    )
    .default([]),
  medicacionActual: z
    .array(
      z.object({
        nombre: z.string(),
        dosis: z.string().optional(),
        frecuencia: z.string().optional(),
      }),
    )
    .default([]),
  embarazo: z
    .object({
      estaEmbarazada: z.boolean(),
      semanas: z.number().int().min(1).max(42).optional(),
    })
    .optional(),
  antecedentesPerinatales: z
    .object({
      semanasGestacion: z.number().int().min(20).max(45).optional(),
      tipoParto: z.string().optional(),
      complicaciones: z.string().optional(),
      enfermedadesMaternas: z.string().optional(),
      medicamentosMaternos: z.string().optional(),
    })
    .optional(),
  otrasCondiciones: z.string().optional(),
})

// Antecedentes odontológicos
const AnamnesisAntecedentesOdontologicosSchema = z.object({
  ultimaVisita: z.string().datetime().optional(),
  tratamientosPrevios: z.array(z.string()).default([]),
  complicacionesPrevias: z.string().optional(),
  traumaDental: z
    .object({
      tiene: z.boolean(),
      detalle: z.string().optional(),
    })
    .optional(),
  desarrolloDental: z
    .object({
      erupcionPrimerDiente: z.number().int().min(0).max(24).optional(), // meses
      retrasoErupcion: z.boolean().optional(),
      perdidaPrematuraDientesLeche: z.boolean().optional(),
      cambioDientes: z.boolean().optional(),
    })
    .optional(),
})

// Hábitos
const AnamnesisHabitosSchema = z.object({
  higieneOral: z.object({
    cepilladosDia: z.number().int().min(0).max(10).optional(),
    usaHiloDental: z.boolean().optional(),
    usaEnjuague: z.boolean().optional(),
    pastaFluor: z.boolean().optional(),
    recibeAyudaCepillado: z.boolean().optional(), // pediátrico
  }),
  dieta: z.object({
    consumoAzucar: z.string().optional(),
    bebidasAzucaradas: z.boolean().optional(),
    biberonNocturno: z.boolean().optional(), // pediátrico
  }),
  tabaquismo: z
    .object({
      fuma: z.boolean(),
      frecuencia: z.string().optional(),
      expuestoHumoTabaco: z.boolean().optional(),
    })
    .optional(),
  alcohol: z
    .object({
      consume: z.boolean(),
      frecuencia: z.string().optional(),
    })
    .optional(),
  bruxismo: z
    .object({
      tiene: z.boolean(),
      diurno: z.boolean().optional(),
      nocturno: z.boolean().optional(),
    })
    .optional(),
  habitosOrales: z
    .object({
      chupete: z
        .object({
          usa: z.boolean(),
          hastaEdad: z.number().int().min(0).max(10).optional(), // años
        })
        .optional(),
      succionDigital: z
        .object({
          tiene: z.boolean(),
          frecuencia: z.string().optional(),
        })
        .optional(),
      biberon: z
        .object({
          uso: z.boolean(),
          hastaEdad: z.number().int().min(0).max(5).optional(), // años
          contenido: z.string().optional(),
        })
        .optional(),
      lactancia: z
        .object({
          materna: z.boolean(),
          exclusiva: z.boolean().optional(),
          duracionMeses: z.number().int().min(0).max(36).optional(),
        })
        .optional(),
      onicofagia: z.boolean().optional(),
      otros: z.string().optional(),
    })
    .optional(),
})

// Dolor y urgencia
const AnamnesisDolorUrgenciaSchema = z.object({
  tieneDolor: z.boolean().default(false),
  localizacion: z.string().optional(),
  intensidad: z.number().int().min(1).max(10).optional(),
  inicio: z.string().datetime().optional(),
  duracion: z.string().optional(),
  factoresAlivio: z.string().optional(),
  factoresAgravantes: z.string().optional(),
  sintomasAsociados: z.array(z.string()).default([]),
  urgenciaPercibida: AnamnesisUrgenciaEnum.optional(),
})

// Consentimiento
const AnamnesisConsentimientoSchema = z.object({
  aceptaTratamiento: z.boolean(),
  aceptaPrivacidad: z.boolean(),
  firmadoPor: z.object({
    nombre: z.string(),
    relacion: z.string().optional(), // "PACIENTE" o relación si es tutor
    documento: z.string().optional(),
  }),
  fechaFirma: z.string().datetime(),
  // Nota: El documento PDF/JPG real se guarda en la tabla Consentimiento
})

// ============================================================================
// PAYLOAD COMPLETO
// ============================================================================

export const AnamnesisPayloadSchema = AnamnesisBaseSchema.merge(AnamnesisDatosPersonalesSchema).extend({
  antecedentesMedicos: AnamnesisAntecedentesMedicosSchema,
  antecedentesOdontologicos: AnamnesisAntecedentesOdontologicosSchema,
  habitos: AnamnesisHabitosSchema,
  dolorUrgencia: AnamnesisDolorUrgenciaSchema,
  consentimiento: AnamnesisConsentimientoSchema,
})

export type AnamnesisPayload = z.infer<typeof AnamnesisPayloadSchema>

// ============================================================================
// SCHEMAS PARA API (Request/Response)
// ============================================================================

// Crear/Actualizar Anamnesis
export const AnamnesisCreateUpdateBodySchema = z.object({
  tipo: AnamnesisTipoEnum.optional(), // Si no viene, se calcula por edad
  payload: AnamnesisPayloadSchema,
  motivoCambio: z.string().max(500).optional(),
  consultaId: z.number().int().positive().optional(),
})

export type AnamnesisCreateUpdateBody = z.infer<typeof AnamnesisCreateUpdateBodySchema>

// Response: Anamnesis actual
export const AnamnesisResponseSchema = z.object({
  idPatientAnamnesis: z.number().int().positive(),
  pacienteId: z.number().int().positive(),
  tipo: AnamnesisTipoEnum,
  motivoConsulta: z.string().nullable(),
  tieneDolorActual: z.boolean(),
  dolorIntensidad: z.number().int().min(1).max(10).nullable(),
  urgenciaPercibida: AnamnesisUrgenciaEnum.nullable(),
  tieneEnfermedadesCronicas: z.boolean(),
  tieneAlergias: z.boolean(),
  tieneMedicacionActual: z.boolean(),
  embarazada: z.boolean().nullable(),
  expuestoHumoTabaco: z.boolean().nullable(),
  bruxismo: z.boolean().nullable(),
  higieneCepilladosDia: z.number().int().nullable(),
  usaHiloDental: z.boolean().nullable(),
  ultimaVisitaDental: z.string().datetime().nullable(),
  tieneHabitosSuccion: z.boolean().nullable(),
  lactanciaRegistrada: z.boolean().nullable(),
  payload: z.any(), // Json
  creadoPor: z.object({
    idUsuario: z.number().int().positive(),
    nombreApellido: z.string(),
  }),
  actualizadoPor: z
    .object({
      idUsuario: z.number().int().positive(),
      nombreApellido: z.string(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type AnamnesisResponse = z.infer<typeof AnamnesisResponseSchema>

// Response: Versión del historial
export const AnamnesisVersionResponseSchema = z.object({
  idPatientAnamnesisVersion: z.number().int().positive(),
  pacienteId: z.number().int().positive(),
  anamnesisId: z.number().int().positive(),
  consultaId: z.number().int().positive().nullable(),
  tipo: AnamnesisTipoEnum,
  motivoConsulta: z.string().nullable(),
  tieneDolorActual: z.boolean(),
  dolorIntensidad: z.number().int().min(1).max(10).nullable(),
  urgenciaPercibida: AnamnesisUrgenciaEnum.nullable(),
  tieneEnfermedadesCronicas: z.boolean(),
  tieneAlergias: z.boolean(),
  tieneMedicacionActual: z.boolean(),
  embarazada: z.boolean().nullable(),
  expuestoHumoTabaco: z.boolean().nullable(),
  bruxismo: z.boolean().nullable(),
  higieneCepilladosDia: z.number().int().nullable(),
  usaHiloDental: z.boolean().nullable(),
  ultimaVisitaDental: z.string().datetime().nullable(),
  tieneHabitosSuccion: z.boolean().nullable(),
  lactanciaRegistrada: z.boolean().nullable(),
  payload: z.any(), // Json
  motivoCambio: z.string().nullable(),
  creadoPor: z.object({
    idUsuario: z.number().int().positive(),
    nombreApellido: z.string(),
  }),
  consulta: z
    .object({
      citaId: z.number().int().positive(),
      inicio: z.string().datetime(),
    })
    .nullable(),
  createdAt: z.string().datetime(),
})

export type AnamnesisVersionResponse = z.infer<typeof AnamnesisVersionResponseSchema>

// Response: Historial
export const AnamnesisHistorialResponseSchema = z.object({
  versiones: z.array(AnamnesisVersionResponseSchema),
  total: z.number().int().min(0),
})

export type AnamnesisHistorialResponse = z.infer<typeof AnamnesisHistorialResponseSchema>

