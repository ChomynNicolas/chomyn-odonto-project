import { PrismaClient, RolNombre, Genero } from "@prisma/client";
import { ALLOW_PROD_SEED, RESEED, COUNTS, SIZE } from "./config";
import { log } from "./logger";
import { hashPassword } from "./utils";
import { ESPECIALIDADES, CONSULTORIOS } from "./data";
import { ensureRoles, ensureUsuario, ensureEspecialidades, ensureProfesionalEspecialidades, ensurePersonaConDocumento, ensureContactos, ensurePacienteFromPersona, ensureResponsablePrincipal, ensureConsultorio } from "./ensure";
import { fakePersona, fakeDocumento, fakeContactosPersona } from "./factories";
import { generarAgendaParaProfesional } from "./agenda";
import { PROCEDIMIENTOS_CATALOGO } from "./data";
import { poblarTratamientosYConsultas } from "./procedimientos";

const prisma = new PrismaClient();


async function safeTruncate() {
const tables = [
'"CitaEstadoHistorial"',
'"Cita"',
'"BloqueoAgenda"',
'"PacienteResponsable"',
'"ProfesionalEspecialidad"',
'"Profesional"',
'"Paciente"',
'"PersonaContacto"',
'"Documento"',
'"Consultorio"',
'"Especialidad"',
'"Usuario"',
'"Rol"'
];
await prisma.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE;`);
}








async function main() {
log.info("Seed iniciado (size:", SIZE, ")");


if (process.env.NODE_ENV === "production" && !ALLOW_PROD_SEED) {
throw new Error("Semilla bloqueada en producción. Exporta ALLOW_PROD_SEED=1 si estás seguro.");
}


if (RESEED) {
log.warn("RESEED=1 → limpiando tablas...");
await safeTruncate();
}


// 1) Roles
await ensureRoles(prisma);


// 2) Usuarios base
const [adminHash, recepHash, odontHash] = await Promise.all([
hashPassword("Admin123!"), hashPassword("Recep123!"), hashPassword("Odont123!")
]);


const admin = await ensureUsuario(prisma, { usuario: "admin", email: "admin@clinica.com", nombreApellido: "Administrador General", rol: RolNombre.ADMIN, passwordHash: adminHash });
const recep = await ensureUsuario(prisma, { usuario: "recep.sosa", email: "recep@clinica.com", nombreApellido: "Recepcionista Sosa", rol: RolNombre.RECEP, passwordHash: recepHash });


// Profesionales (N)
const profesionales: { idProfesional: number }[] = [];


// Especialidades
await ensureEspecialidades(prisma, ESPECIALIDADES);


for (let i = 0; i < COUNTS.profesionales; i++) {
const userHash = odontHash; // misma pass demo
const user = await ensureUsuario(prisma, {
usuario: i === 0 ? "dra.vera" : `dr_${i}`,
email: i === 0 ? "doctora@clinica.com" : `doctor_${i}@clinica.com`,
nombreApellido: i === 0 ? "Dra. Vera López" : `Dr. ${i} ${i % 2 ? "Gómez" : "Martínez"}`,
rol: RolNombre.ODONT,
passwordHash: userHash,
});


const persona = await ensurePersonaConDocumento(prisma, {
...fakePersona(1000 + i),
doc: fakeDocumento(1000 + i),
});
await ensureContactos(prisma, persona.idPersona, fakeContactosPersona(1000 + i, "odont"));


const profesional = await prisma.profesional.upsert({
where: { userId: user.idUsuario },
update: {},
create: { userId: user.idUsuario, personaId: persona.idPersona, numeroLicencia: `ODT-${10000 + i}`, estaActivo: true },
select: { idProfesional: true },
});
await ensureProfesionalEspecialidades(prisma, profesional.idProfesional, ESPECIALIDADES.slice(0, 2));
profesionales.push(profesional);
}


// 3) Consultorios (M)
const consultorios = [] as { idConsultorio: number }[];
for (let i = 0; i < Math.min(COUNTS.consultorios, CONSULTORIOS.length); i++) {
const c = CONSULTORIOS[i];
const row = await ensureConsultorio(prisma, c.nombre, c.colorHex);
consultorios.push({ idConsultorio: row.idConsultorio });
}

// 4) Pacientes (K)
const pacientesIds: number[] = [];
for (let i = 0; i < COUNTS.pacientes; i++) {
const per = await ensurePersonaConDocumento(prisma, { ...fakePersona(i), doc: fakeDocumento(i) });
await ensureContactos(prisma, per.idPersona, fakeContactosPersona(i, "paciente"));
const pac = await ensurePacienteFromPersona(prisma, per.idPersona);


// ~25% menores con responsable
const esMenor = per.fechaNacimiento && (new Date().getFullYear() - per.fechaNacimiento.getFullYear()) < 18;
if (esMenor) {
const madre = await ensurePersonaConDocumento(prisma, { ...fakePersona(5000 + i), genero: Genero.FEMENINO, doc: fakeDocumento(5000 + i) });
await ensureResponsablePrincipal(prisma, pac.idPaciente, madre.idPersona, "MADRE" as any);
}
pacientesIds.push(pac.idPaciente);
}


// 5) Agenda por profesional
let totalCreadas = 0;
for (const prof of profesionales) {
const creadas = await generarAgendaParaProfesional(prisma, {
profesionalId: prof.idProfesional,
pacienteIds: pacientesIds,
consultorioIds: consultorios.map(c => c.idConsultorio),
createdByUserId: recep.idUsuario,
});
totalCreadas += creadas;
}

const resClinico = await poblarTratamientosYConsultas(prisma, {
    pacientesIds: pacientesIds,
    createdByUserId: recep.idUsuario,
  });

log.ok("Seed completado:", {
profesionales: profesionales.length,
consultorios: consultorios.length,
pacientes: pacientesIds.length,
citas: totalCreadas,
});
log.ok("Clínico:", resClinico);

}


main().catch((e) => {
log.err("Seed falló:", e);
process.exit(1);
}).finally(async () => {
await prisma.$disconnect();
});


