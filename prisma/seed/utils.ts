import bcrypt from "bcryptjs"
import { faker } from "@faker-js/faker/locale/es"

export function normEmail(raw: string) {
  return raw.trim().toLowerCase()
}

export function normPhonePY(raw: string) {
  let s = raw.replace(/\D+/g, "")
  if (s.startsWith("0")) s = s.slice(1)
  if (!s.startsWith("595")) s = "595" + s
  return "+" + s
}

export function randomPYPhone() {
  const op = faker.helpers.arrayElement(["981", "982", "983", "984", "985", "986", "987", "988", "989", "971", "972"])
  const rest = faker.number.int({ min: 100000, max: 999999 }).toString()
  return normPhonePY(`0${op}${rest}`)
}

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 12)
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60 * 1000)
}

export function addDays(d: Date, days: number) {
  const result = new Date(d)
  result.setDate(result.getDate() + days)
  return result
}

export function randomFutureSlot(daysForward: number) {
  const dt = new Date()
  const offset = faker.number.int({ min: 0, max: daysForward })
  dt.setDate(dt.getDate() + offset)
  dt.setHours(faker.number.int({ min: 8, max: 18 }), faker.helpers.arrayElement([0, 15, 30, 45]), 0, 0)
  if (dt < new Date()) {
    dt.setHours(dt.getHours() + 1, 0, 0, 0)
  }
  return dt
}

export function randomPastSlot(daysBack: number) {
  const dt = new Date()
  const offset = faker.number.int({ min: 1, max: daysBack })
  dt.setDate(dt.getDate() - offset)
  dt.setHours(faker.number.int({ min: 8, max: 18 }), faker.helpers.arrayElement([0, 15, 30, 45]), 0, 0)
  return dt
}

export function generateSlotWithRetry(
  isPast: boolean,
  daysWindow: number,
  maxRetries = 5,
): { inicio: Date; duracion: number } {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const inicio = isPast ? randomPastSlot(daysWindow) : randomFutureSlot(daysWindow)
    const duracion = faker.helpers.arrayElement([30, 40, 45, 60, 90])

    // Evitar fines de semana si es necesario
    const dayOfWeek = inicio.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }

    return { inicio, duracion }
  }

  // Fallback: retorna slot válido aunque sea subóptimo
  const inicio = isPast ? randomPastSlot(daysWindow) : randomFutureSlot(daysWindow)
  return { inicio, duracion: 30 }
}

export function calculateAge(birthDate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}
