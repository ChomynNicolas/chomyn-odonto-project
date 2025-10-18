-- CreateEnum
CREATE TYPE "RelacionPaciente" AS ENUM ('PADRE', 'MADRE', 'TUTOR', 'CONYUGE', 'FAMILIAR', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoCita" AS ENUM ('CONSULTA', 'LIMPIEZA', 'ENDODONCIA', 'EXTRACCION', 'URGENCIA', 'ORTODONCIA', 'CONTROL', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Paciente" (
    "idPaciente" SERIAL NOT NULL,
    "Persona_idPersona" INTEGER NOT NULL,
    "notas" TEXT,
    "esta_activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("idPaciente")
);

-- CreateTable
CREATE TABLE "PacienteResponsable" (
    "idPacienteResponsable" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "Persona_idPersona" INTEGER NOT NULL,
    "relacion" "RelacionPaciente" NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "autoridad_legal" BOOLEAN NOT NULL DEFAULT false,
    "vigente_desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigente_hasta" TIMESTAMP(3),
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PacienteResponsable_pkey" PRIMARY KEY ("idPacienteResponsable")
);

-- CreateTable
CREATE TABLE "Consultorio" (
    "idConsultorio" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "color_hex" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultorio_pkey" PRIMARY KEY ("idConsultorio")
);

-- CreateTable
CREATE TABLE "Cita" (
    "idCita" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "Profesional_idProfesional" INTEGER NOT NULL,
    "Consultorio_idConsultorio" INTEGER,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoCita" NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'SCHEDULED',
    "motivo" TEXT,
    "notas" TEXT,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("idCita")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_Persona_idPersona_key" ON "Paciente"("Persona_idPersona");

-- CreateIndex
CREATE INDEX "PacienteResponsable_Paciente_idPaciente_Persona_idPersona_idx" ON "PacienteResponsable"("Paciente_idPaciente", "Persona_idPersona");

-- CreateIndex
CREATE UNIQUE INDEX "Consultorio_nombre_key" ON "Consultorio"("nombre");

-- CreateIndex
CREATE INDEX "Cita_Profesional_idProfesional_inicio_idx" ON "Cita"("Profesional_idProfesional", "inicio");

-- CreateIndex
CREATE INDEX "Cita_Paciente_idPaciente_inicio_idx" ON "Cita"("Paciente_idPaciente", "inicio");

-- CreateIndex
CREATE INDEX "Cita_Consultorio_idConsultorio_inicio_idx" ON "Cita"("Consultorio_idConsultorio", "inicio");

-- CreateIndex
CREATE INDEX "Cita_estado_inicio_idx" ON "Cita"("estado", "inicio");

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_Persona_idPersona_fkey" FOREIGN KEY ("Persona_idPersona") REFERENCES "Persona"("idPersona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteResponsable" ADD CONSTRAINT "PacienteResponsable_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteResponsable" ADD CONSTRAINT "PacienteResponsable_Persona_idPersona_fkey" FOREIGN KEY ("Persona_idPersona") REFERENCES "Persona"("idPersona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_Profesional_idProfesional_fkey" FOREIGN KEY ("Profesional_idProfesional") REFERENCES "Profesional"("idProfesional") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_Consultorio_idConsultorio_fkey" FOREIGN KEY ("Consultorio_idConsultorio") REFERENCES "Consultorio"("idConsultorio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;


