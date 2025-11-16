import { faker } from "@faker-js/faker/locale/es"

export type SeedSize = "sm" | "md" | "lg"

export const SIZE: SeedSize = (process.env.SEED_SIZE as SeedSize) || "md"
export const ALLOW_PROD_SEED = process.env.ALLOW_PROD_SEED === "1"
export const RESEED = process.env.RESEED === "1"
export const SEED_RNG = Number(process.env.SEED_RNG || 20251022)

faker.seed(SEED_RNG)

export const NOW = new Date()

const windowsPast: Record<SeedSize, number> = { sm: 30, md: 90, lg: 180 }
const windowsFuture: Record<SeedSize, number> = { sm: 15, md: 60, lg: 120 }

export const DAYS_WINDOW_PAST = windowsPast[SIZE]
export const DAYS_WINDOW_FWD = windowsFuture[SIZE]

export const COUNTS = {
  profesionales: SIZE === "lg" ? 8 : SIZE === "md" ? 3 : 1,
  pacientes: SIZE === "lg" ? 800 : SIZE === "md" ? 120 : 25,
  consultorios: SIZE === "lg" ? 6 : SIZE === "md" ? 3 : 2,
  citasPasadas: SIZE === "lg" ? 2000 : SIZE === "md" ? 300 : 40,
  citasFuturas: SIZE === "lg" ? 1000 : SIZE === "md" ? 150 : 20,
  bloqueos: SIZE === "lg" ? 20 : SIZE === "md" ? 6 : 2,
  pacientesConClinica: SIZE === "lg" ? 0.3 : SIZE === "md" ? 0.2 : 0.3,
}

export const PROB = {
  // Estados de citas pasadas
  citaPasadaCompletada: 0.75,
  citaPasadaNoShow: 0.15,
  citaPasadaCancelada: 0.1,

  // Estados de citas futuras
  citaFuturaConfirmada: 0.7,
  citaFuturaScheduled: 0.25,
  citaFuturaCancelada: 0.05,

  // Reprogramaciones
  reprogramarDesdeCancelada: 0.4,
  reprogramarDesdeNoShow: 0.3,

  // Clínica
  pacienteConResponsable: 0.15, // menores o personas con tutor
  pacienteConAlergia: 0.25,
  pacienteConMedicacion: 0.2,
}

export const RETRY_CONFIG = {
  maxRetries: 5,
  maxConsecutiveFailures: 10,
}
