import { faker } from "@faker-js/faker/locale/es";

export type SeedSize = "sm" | "md" | "lg";

export const SIZE: SeedSize = (process.env.SEED_SIZE as SeedSize) || "md";
export const ALLOW_PROD_SEED = process.env.ALLOW_PROD_SEED === "1";
export const RESEED = process.env.RESEED === "1"; // TRUNCATE antes de poblar
export const SEED_RNG = Number(process.env.SEED_RNG || 20251022);

faker.seed(SEED_RNG);

export const NOW = new Date();

// Ventana temporal de agenda SOLO FUTURO: +15d, +60d, +120d
const windows: Record<SeedSize, number> = { sm: 15, md: 60, lg: 120 };
export const DAYS_WINDOW_FWD = windows[SIZE];

export const COUNTS = {
  profesionales: SIZE === "lg" ? 8 : SIZE === "md" ? 3 : 1,
  pacientes: SIZE === "lg" ? 800 : SIZE === "md" ? 120 : 25,
  consultorios: SIZE === "lg" ? 6 : SIZE === "md" ? 3 : 2,
  citas: SIZE === "lg" ? 3000 : SIZE === "md" ? 450 : 60,
  bloqueos: SIZE === "lg" ? 20 : SIZE === "md" ? 6 : 2,
};

export const PROB = {
  citaConfirmada: 0.7, // un poco más alta
  citaCancelada: 0.1,
  reprogramar: 0.08,
};
