-- CreateEnum
CREATE TYPE "AnamnesisTipo" AS ENUM ('ADULTO', 'PEDIATRICO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RelacionPaciente" ADD VALUE 'HIJO';
ALTER TYPE "RelacionPaciente" ADD VALUE 'EMPRESA';

-- DropIndex
DROP INDEX "public"."idx_adjunto_active";

-- DropIndex
DROP INDEX "public"."idx_consulta_performed_by";

-- DropIndex
DROP INDEX "public"."idx_consulta_status_dates";

-- DropIndex
DROP INDEX "public"."idx_paciente_activo_created";

-- DropIndex
DROP INDEX "public"."PersonaContacto_Persona_idPersona_es_pref_cobranza_idx";

-- DropIndex
DROP INDEX "public"."PersonaContacto_Persona_idPersona_es_pref_recordatorio_idx";

-- DropIndex
DROP INDEX "public"."PersonaContacto_Persona_idPersona_tipo_es_principal_idx";

-- DropIndex
DROP INDEX "public"."idx_treatment_step_plan_order";

-- CreateTable
CREATE TABLE "PatientAnamnesis" (
    "idPatientAnamnesis" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "tipo" "AnamnesisTipo" NOT NULL,
    "tiene_enfermedades_cronicas" BOOLEAN NOT NULL DEFAULT false,
    "tiene_alergias" BOOLEAN NOT NULL DEFAULT false,
    "tiene_medicacion_actual" BOOLEAN NOT NULL DEFAULT false,
    "embarazada" BOOLEAN,
    "fumador" BOOLEAN,
    "consume_alcohol" BOOLEAN,
    "bruxismo" BOOLEAN,
    "ultima_visita_dental" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "Usuario_idUsuario_creadoPor" INTEGER NOT NULL,
    "Usuario_idUsuario_actualizadoPor" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAnamnesis_pkey" PRIMARY KEY ("idPatientAnamnesis")
);

-- CreateTable
CREATE TABLE "PatientAnamnesisVersion" (
    "idPatientAnamnesisVersion" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "PatientAnamnesis_id" INTEGER NOT NULL,
    "Consulta_Cita_idCita" INTEGER,
    "tipo" "AnamnesisTipo" NOT NULL,
    "tiene_enfermedades_cronicas" BOOLEAN NOT NULL DEFAULT false,
    "tiene_alergias" BOOLEAN NOT NULL DEFAULT false,
    "tiene_medicacion_actual" BOOLEAN NOT NULL DEFAULT false,
    "embarazada" BOOLEAN,
    "fumador" BOOLEAN,
    "consume_alcohol" BOOLEAN,
    "bruxismo" BOOLEAN,
    "ultima_visita_dental" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "motivo_cambio" TEXT,
    "Usuario_idUsuario_creadoPor" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAnamnesisVersion_pkey" PRIMARY KEY ("idPatientAnamnesisVersion")
);

-- CreateTable
CREATE TABLE "_ConsentimientoResponsable" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ConsentimientoResponsable_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "PatientAnamnesis_Paciente_idPaciente_key" ON "PatientAnamnesis"("Paciente_idPaciente");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_tipo_idx" ON "PatientAnamnesis"("tipo");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_tiene_enfermedades_cronicas_tiene_alergias_idx" ON "PatientAnamnesis"("tiene_enfermedades_cronicas", "tiene_alergias");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_Paciente_idPaciente_created_at_idx" ON "PatientAnamnesisVersion"("Paciente_idPaciente", "created_at");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_Consulta_Cita_idCita_idx" ON "PatientAnamnesisVersion"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_PatientAnamnesis_id_created_at_idx" ON "PatientAnamnesisVersion"("PatientAnamnesis_id", "created_at");

-- CreateIndex
CREATE INDEX "_ConsentimientoResponsable_B_index" ON "_ConsentimientoResponsable"("B");

-- CreateIndex
CREATE INDEX "PersonaContacto_Persona_idPersona_idx" ON "PersonaContacto"("Persona_idPersona");

-- CreateIndex
CREATE INDEX "PersonaContacto_tipo_idx" ON "PersonaContacto"("tipo");

-- CreateIndex
CREATE INDEX "PersonaContacto_valor_norm_idx" ON "PersonaContacto"("valor_norm");

-- AddForeignKey
ALTER TABLE "PatientAnamnesis" ADD CONSTRAINT "PatientAnamnesis_Usuario_idUsuario_creadoPor_fkey" FOREIGN KEY ("Usuario_idUsuario_creadoPor") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesis" ADD CONSTRAINT "PatientAnamnesis_Usuario_idUsuario_actualizadoPor_fkey" FOREIGN KEY ("Usuario_idUsuario_actualizadoPor") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesis" ADD CONSTRAINT "PatientAnamnesis_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_Usuario_idUsuario_creadoPor_fkey" FOREIGN KEY ("Usuario_idUsuario_creadoPor") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_PatientAnamnesis_id_fkey" FOREIGN KEY ("PatientAnamnesis_id") REFERENCES "PatientAnamnesis"("idPatientAnamnesis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConsentimientoResponsable" ADD CONSTRAINT "_ConsentimientoResponsable_A_fkey" FOREIGN KEY ("A") REFERENCES "Consentimiento"("idConsentimiento") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ConsentimientoResponsable" ADD CONSTRAINT "_ConsentimientoResponsable_B_fkey" FOREIGN KEY ("B") REFERENCES "Persona"("idPersona") ON DELETE CASCADE ON UPDATE CASCADE;
