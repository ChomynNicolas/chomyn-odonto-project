import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker/locale/es";

export function normEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function normPhonePY(raw: string) {
  let s = raw.replace(/\D+/g, "");
  if (s.startsWith("0")) s = s.slice(1);
  if (!s.startsWith("595")) s = "595" + s;
  return "+" + s;
}

export function randomPYPhone() {
  const op = faker.helpers.arrayElement(["981","982","983","984","985","986","987","988","989","971","972"]);
  const rest = faker.number.int({ min: 100000, max: 999999 }).toString();
  return normPhonePY(`0${op}${rest}`);
}

export async function hashPassword(p: string) {
  return bcrypt.hash(p, 12);
}

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60 * 1000);
}

/** Slot futuro: hoy..+N días, hh:mm ∈ {8..18} y :00/:15/:30/:45 */
export function randomFutureSlot(daysForward: number) {
  const dt = new Date();
  const offset = faker.number.int({ min: 0, max: daysForward });
  dt.setDate(dt.getDate() + offset);
  dt.setHours(
    faker.number.int({ min: 8, max: 18 }),
    faker.helpers.arrayElement([0, 15, 30, 45]),
    0, 0
  );
  // si la hora ya pasó hoy, empuja al siguiente slot futuro
  if (dt < new Date()) {
    dt.setHours(dt.getHours() + 1, 0, 0, 0);
  }
  return dt;
}
