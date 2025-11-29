import { faker } from "@faker-js/faker/locale/es";
import { TipoDocumento, Genero, TipoContacto, TipoCita, AnamnesisTipo, AnamnesisUrgencia, RelacionPaciente } from "@prisma/client";
import { randomPYPhone } from "./utils";

export function fakeDocumento(i: number) {
  return { tipo: TipoDocumento.CI, numero: String(2000000 + i), paisEmision: "PY" } as const;
}

export function fakePersona(i: number) {
  const genero = faker.helpers.arrayElement([Genero.MASCULINO, Genero.FEMENINO, Genero.OTRO, Genero.NO_ESPECIFICADO]);
  const nombres = faker.person.firstName(genero === Genero.FEMENINO ? "female" : "male");
  const apellidos = faker.person.lastName();
  const segundoApellido = faker.helpers.maybe(() => faker.person.lastName(), { probability: 0.7 }) ?? null;
  const fechaNacimiento = faker.date.between({ from: "1965-01-01", to: "2018-12-31" });
  const ciudad = faker.helpers.arrayElement([
    "Asunción",
    "Ciudad del Este",
    "Luque",
    "San Lorenzo",
    "Lambaré",
    "Fernando de la Mora",
    "Capiatá",
    "Encarnación",
    "Villarrica",
    "Pedro Juan Caballero",
  ]);
  const pais = "PY";
  const direccion = faker.location.streetAddress();
  
  // Contacto de emergencia (probabilidad 0.3)
  const tieneContactoEmergencia = faker.datatype.boolean({ probability: 0.3 });
  const contactoEmergenciaNombre = tieneContactoEmergencia ? faker.person.fullName() : null;
  const contactoEmergenciaTelefono = tieneContactoEmergencia ? randomPYPhone() : null;
  const contactoEmergenciaRelacion = tieneContactoEmergencia
    ? faker.helpers.arrayElement([
        RelacionPaciente.PADRE,
        RelacionPaciente.MADRE,
        RelacionPaciente.CONYUGE,
        RelacionPaciente.FAMILIAR,
      ])
    : null;

  return {
    nombres,
    apellidos,
    segundoApellido,
    genero,
    fechaNacimiento,
    direccion,
    ciudad,
    pais,
    contactoEmergenciaNombre,
    contactoEmergenciaTelefono,
    contactoEmergenciaRelacion,
  };
}

export function fakeContactosPersona(i: number, baseEmail: string) {
  const phone = randomPYPhone();
  return [
    { tipo: TipoContacto.PHONE, valor: phone, label: "Móvil", whatsappCapaz: true, smsCapaz: true, esPrincipal: true, esPreferidoRecordatorio: true },
    { tipo: TipoContacto.EMAIL, valor: `${baseEmail}.${i}@example.com`, label: "Personal", esPrincipal: true, esPreferidoCobranza: true },
  ] as const;
}

export function fakeProfesionalDisponibilidad() {
  const diasSemana = ["lunes", "martes", "miercoles", "jueves", "viernes"] as const;
  const disponibilidad: Record<string, Array<{ inicio: string; fin: string }>> = {};

  for (const dia of diasSemana) {
    const tieneManana = faker.datatype.boolean({ probability: 0.9 });
    const tieneTarde = faker.datatype.boolean({ probability: 0.8 });
    const horarios: Array<{ inicio: string; fin: string }> = [];

    if (tieneManana) {
      horarios.push({
        inicio: faker.helpers.arrayElement(["08:00", "08:30", "09:00"]),
        fin: faker.helpers.arrayElement(["12:00", "12:30", "13:00"]),
      });
    }

    if (tieneTarde) {
      horarios.push({
        inicio: faker.helpers.arrayElement(["14:00", "14:30", "15:00"]),
        fin: faker.helpers.arrayElement(["17:00", "18:00", "19:00"]),
      });
    }

    if (horarios.length > 0) {
      disponibilidad[dia] = horarios;
    }
  }

  return disponibilidad;
}

export function fakeAnamnesisPayload(tipo: AnamnesisTipo): Record<string, unknown> {
  if (tipo === AnamnesisTipo.ADULTO) {
    return {
      antecedentesPersonales: {
        enfermedadesCronicas: faker.helpers.arrayElements(
          ["Diabetes", "Hipertensión", "Asma", "Artritis"],
          { min: 0, max: 2 }
        ),
        alergias: faker.helpers.arrayElements(
          ["Penicilina", "Lidocaína", "Latex"],
          { min: 0, max: 2 }
        ),
        medicacionActual: faker.helpers.arrayElements(
          ["Metformina 500mg", "Enalapril 10mg", "Salbutamol"],
          { min: 0, max: 2 }
        ),
      },
      antecedentesFamiliares: {
        enfermedadesRelevantes: faker.helpers.arrayElements(
          ["Diabetes", "Hipertensión", "Cáncer"],
          { min: 0, max: 2 }
        ),
      },
      historiaDental: {
        ultimaVisita: faker.date.past({ years: 2 }).toISOString().split("T")[0],
        tratamientosPrevios: faker.helpers.arrayElements(
          ["Limpieza dental", "Obturaciones", "Endodoncia", "Extracciones"],
          { min: 0, max: 3 }
        ),
      },
      habitos: {
        fumador: faker.datatype.boolean({ probability: 0.2 }),
        consumeAlcohol: faker.datatype.boolean({ probability: 0.3 }),
        bruxismo: faker.datatype.boolean({ probability: 0.15 }),
        cepilladosDiarios: faker.helpers.arrayElement([1, 2, 3]),
        usaHiloDental: faker.datatype.boolean({ probability: 0.4 }),
      },
      womenSpecific: {
        embarazada: faker.datatype.boolean({ probability: 0.05 }),
        lactando: faker.datatype.boolean({ probability: 0.02 }),
      },
    };
  } else {
    // PEDIATRICO
    return {
      antecedentesPerinatales: {
        embarazoNormal: faker.datatype.boolean({ probability: 0.85 }),
        partoNormal: faker.datatype.boolean({ probability: 0.8 }),
        semanasGestacion: faker.number.int({ min: 36, max: 42 }),
        pesoNacimiento: faker.number.float({ min: 2.5, max: 4.5, fractionDigits: 2 }),
      },
      desarrolloPsicomotor: {
        normal: faker.datatype.boolean({ probability: 0.9 }),
        observaciones: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }),
      },
      habitosInfantiles: {
        usaChupete: faker.datatype.boolean({ probability: 0.3 }),
        seChupaDedo: faker.datatype.boolean({ probability: 0.2 }),
        biberon: faker.datatype.boolean({ probability: 0.4 }),
      },
      lactancia: {
        maternaExclusiva: faker.datatype.boolean({ probability: 0.6 }),
        duracionMeses: faker.number.int({ min: 0, max: 24 }),
      },
      exposicionHumoTabaco: faker.datatype.boolean({ probability: 0.15 }),
    };
  }
}

export function fakeAuditLogMetadata() {
  return {
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    sessionId: faker.string.uuid(),
    requestPath: faker.helpers.arrayElement([
      "/api/patients",
      "/api/appointments",
      "/api/consultas",
      "/api/anamnesis",
    ]),
    timestamp: new Date().toISOString(),
  };
}

export function randomTipoCita(): TipoCita {
  return ["CONSULTA","LIMPIEZA","CONTROL","EXTRACCION","ENDODONCIA"][
    Math.floor(Math.random() * 5)
  ] as TipoCita;
}
