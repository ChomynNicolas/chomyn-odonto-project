import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";


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


export function chunk<T>(arr: T[], size = 50): T[][] {
const chunks: T[][] = [];
for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
return chunks;
}


export function addMinutes(d: Date, minutes: number) {
return new Date(d.getTime() + minutes * 60 * 1000);
}


export function randomBetweenDates(base: Date, daysWindow: number) {
const offset = faker.number.int({ min: -daysWindow, max: daysWindow });
const dt = new Date(base);
dt.setDate(dt.getDate() + offset);
dt.setHours(faker.number.int({ min: 8, max: 18 }), faker.helpers.arrayElement([0,15,30,45]), 0, 0);
return dt;
}


// Nuevo helper: fecha aleatoria FUTURA desde 'base' hasta 'daysWindow' días
export function randomFutureDate(base: Date, daysWindow: number, opts?: {
  startHour?: number; endHour?: number; minuteSlots?: number[];
}) {
  const startHour = opts?.startHour ?? 8;
  const endHour   = opts?.endHour   ?? 18;
  const minuteSlots = opts?.minuteSlots ?? [0, 15, 30, 45];

  // Día 0 = hoy; aleatorio entre 0..daysWindow
  const offset = faker.number.int({ min: 0, max: daysWindow });
  const dt = new Date(base);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + offset);

  dt.setHours(
    faker.number.int({ min: startHour, max: endHour }),
    faker.helpers.arrayElement(minuteSlots),
    0, 0
  );
  return dt;
}
