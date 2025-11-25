/*
  Warnings:

  - Added the required column `version_number` to the `PatientAnamnesisVersion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AnamnesisAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'RESTORE', 'EXPORT', 'PRINT');

-- CreateEnum
CREATE TYPE "AnamnesisChangeSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FieldChangeType" AS ENUM ('ADDED', 'REMOVED', 'MODIFIED');

-- AlterTable
ALTER TABLE "PatientAnamnesis" ADD COLUMN     "Usuario_idUsuario_deletedBy" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_reason" TEXT,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "version_number" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "PatientAnamnesisVersion" ADD COLUMN     "change_summary" JSONB,
ADD COLUMN     "ip_address" TEXT,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "restored_from_version_id" INTEGER,
ADD COLUMN     "user_agent" TEXT,
ADD COLUMN     "version_number" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "AnamnesisAuditLog" (
    "idAnamnesisAuditLog" SERIAL NOT NULL,
    "PatientAnamnesis_id" INTEGER NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "action" "AnamnesisAuditAction" NOT NULL,
    "Usuario_idUsuario_actor" INTEGER NOT NULL,
    "actor_role" "RolNombre" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "request_path" TEXT,
    "previous_state" JSONB,
    "new_state" JSONB,
    "field_diffs" JSONB,
    "changes_summary" JSONB,
    "reason" TEXT,
    "severity" "AnamnesisChangeSeverity",
    "Consulta_Cita_idCita" INTEGER,
    "previous_version_number" INTEGER,
    "new_version_number" INTEGER,
    "integrity_hash" TEXT,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnamnesisAuditLog_pkey" PRIMARY KEY ("idAnamnesisAuditLog")
);

-- CreateTable
CREATE TABLE "AnamnesisFieldDiff" (
    "idAnamnesisFieldDiff" SERIAL NOT NULL,
    "AnamnesisAuditLog_id" INTEGER NOT NULL,
    "field_path" TEXT NOT NULL,
    "field_label" TEXT NOT NULL,
    "field_type" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "old_value_display" TEXT,
    "new_value_display" TEXT,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "change_type" "FieldChangeType" NOT NULL,

    CONSTRAINT "AnamnesisFieldDiff_pkey" PRIMARY KEY ("idAnamnesisFieldDiff")
);

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_PatientAnamnesis_id_performed_at_idx" ON "AnamnesisAuditLog"("PatientAnamnesis_id", "performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_Paciente_idPaciente_performed_at_idx" ON "AnamnesisAuditLog"("Paciente_idPaciente", "performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_Usuario_idUsuario_actor_performed_at_idx" ON "AnamnesisAuditLog"("Usuario_idUsuario_actor", "performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_action_performed_at_idx" ON "AnamnesisAuditLog"("action", "performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_Consulta_Cita_idCita_idx" ON "AnamnesisAuditLog"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_severity_performed_at_idx" ON "AnamnesisAuditLog"("severity", "performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisAuditLog_performed_at_idx" ON "AnamnesisAuditLog"("performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisFieldDiff_AnamnesisAuditLog_id_idx" ON "AnamnesisFieldDiff"("AnamnesisAuditLog_id");

-- CreateIndex
CREATE INDEX "AnamnesisFieldDiff_field_path_idx" ON "AnamnesisFieldDiff"("field_path");

-- CreateIndex
CREATE INDEX "AnamnesisFieldDiff_is_critical_idx" ON "AnamnesisFieldDiff"("is_critical");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_version_number_idx" ON "PatientAnamnesis"("version_number");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_is_deleted_deleted_at_idx" ON "PatientAnamnesis"("is_deleted", "deleted_at");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_version_number_idx" ON "PatientAnamnesisVersion"("version_number");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_restored_from_version_id_idx" ON "PatientAnamnesisVersion"("restored_from_version_id");

-- AddForeignKey
ALTER TABLE "PatientAnamnesis" ADD CONSTRAINT "PatientAnamnesis_Usuario_idUsuario_deletedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_deletedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAnamnesisVersion" ADD CONSTRAINT "PatientAnamnesisVersion_restored_from_version_id_fkey" FOREIGN KEY ("restored_from_version_id") REFERENCES "PatientAnamnesisVersion"("idPatientAnamnesisVersion") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAuditLog" ADD CONSTRAINT "AnamnesisAuditLog_PatientAnamnesis_id_fkey" FOREIGN KEY ("PatientAnamnesis_id") REFERENCES "PatientAnamnesis"("idPatientAnamnesis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAuditLog" ADD CONSTRAINT "AnamnesisAuditLog_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAuditLog" ADD CONSTRAINT "AnamnesisAuditLog_Usuario_idUsuario_actor_fkey" FOREIGN KEY ("Usuario_idUsuario_actor") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAuditLog" ADD CONSTRAINT "AnamnesisAuditLog_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisFieldDiff" ADD CONSTRAINT "AnamnesisFieldDiff_AnamnesisAuditLog_id_fkey" FOREIGN KEY ("AnamnesisAuditLog_id") REFERENCES "AnamnesisAuditLog"("idAnamnesisAuditLog") ON DELETE CASCADE ON UPDATE CASCADE;
