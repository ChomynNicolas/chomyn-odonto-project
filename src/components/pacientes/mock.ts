import { Paciente } from "./types";
import { randomUUID } from "crypto";

export let PACIENTES_MOCK: Paciente[] = [
  {
    id: "6f1a6b1a-4a2b-4c6c-8f11-111111111111",
    nombreCompleto: "María González",
    genero: "FEMENINO",
    dni: "5123456",
    ruc: null,
    telefono: "+59597111111",
    email: "maria@example.com",
    domicilio: "Av. Principal 123",
    obraSocial: "IPS",
    antecedentesMedicos: "Hipertensión controlada",
    alergias: "Penicilina",
    medicacion: "Losartán",
    responsablePago: null,
    preferenciasContacto: { whatsapp: true, llamada: false, email: true, sms: false },
    adjuntos: [],
    creadoEl: new Date(),
    actualizadoEl: new Date(),
    estaActivo: true,
  },
  {
    id: "6f1a6b1a-4a2b-4c6c-8f11-222222222222",
    nombreCompleto: "Juan Pérez",
    genero: "MASCULINO",
    dni: "4789000",
    ruc: "4789000-7",
    telefono: "+59598123456",
    email: "juan.perez@example.com",
    domicilio: "Calle 2 N° 450",
    obraSocial: null,
    antecedentesMedicos: null,
    alergias: "Ninguna",
    medicacion: null,
    responsablePago: null,
    preferenciasContacto: { whatsapp: true, llamada: true, email: false, sms: false },
    adjuntos: [],
    creadoEl: new Date(),
    actualizadoEl: new Date(),
    estaActivo: true,
  },
];

export function buscarPorTexto(q: string) {
  const t = q.toLowerCase();
  return PACIENTES_MOCK.filter(p =>
    [p.nombreCompleto, p.dni, p.ruc ?? "", p.telefono, p.email].some(v => v?.toLowerCase().includes(t))
  );
}

export function crearPacienteMock(data: Omit<Paciente, "id" | "creadoEl" | "actualizadoEl">) {
  const nuevo: Paciente = { ...data, id: randomUUID(), creadoEl: new Date(), actualizadoEl: new Date() };
  PACIENTES_MOCK = [nuevo, ...PACIENTES_MOCK];
  return nuevo;
}
