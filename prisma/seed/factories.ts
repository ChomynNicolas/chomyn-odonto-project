import { faker } from "@faker-js/faker/locale/es";
import { TipoDocumento, Genero, TipoContacto, TipoCita } from "@prisma/client";
import { randomPYPhone } from "./utils";

export function fakeDocumento(i: number) {
  return { tipo: TipoDocumento.CI, numero: String(2000000 + i), paisEmision: "PY" } as const;
}

export function fakePersona(i: number) {
  const genero = faker.helpers.arrayElement([Genero.MASCULINO, Genero.FEMENINO]);
  const nombres = faker.person.firstName(genero === Genero.FEMENINO ? "female" : "male");
  const apellidos = faker.person.lastName();
  const fechaNacimiento = faker.date.between({ from: "1965-01-01", to: "2018-12-31" });
  return { nombres, apellidos, genero, fechaNacimiento };
}

export function fakeContactosPersona(i: number, baseEmail: string) {
  const phone = randomPYPhone();
  return [
    { tipo: TipoContacto.PHONE, valor: phone, label: "Móvil", whatsappCapaz: true, smsCapaz: true, esPrincipal: true, esPreferidoRecordatorio: true },
    { tipo: TipoContacto.EMAIL, valor: `${baseEmail}.${i}@example.com`, label: "Personal", esPrincipal: true, esPreferidoCobranza: true },
  ] as const;
}

export function randomTipoCita(): TipoCita {
  return ["CONSULTA","LIMPIEZA","CONTROL","EXTRACCION","ENDODONCIA"][
    Math.floor(Math.random() * 5)
  ] as TipoCita;
}
