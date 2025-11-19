-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DiagnosisStatus" ADD VALUE 'UNDER_FOLLOW_UP';
ALTER TYPE "DiagnosisStatus" ADD VALUE 'DISCARDED';

-- AlterTable
ALTER TABLE "ConsultaProcedimiento" ADD COLUMN     "PatientDiagnosis_idPatientDiagnosis" INTEGER;

-- AlterTable
ALTER TABLE "Especialidad" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "EncounterDiagnosis" (
    "idEncounterDiagnosis" SERIAL NOT NULL,
    "Consulta_Cita_idCita" INTEGER NOT NULL,
    "PatientDiagnosis_idPatientDiagnosis" INTEGER NOT NULL,
    "encounter_notes" VARCHAR(1000),
    "was_evaluated" BOOLEAN NOT NULL DEFAULT true,
    "was_managed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EncounterDiagnosis_pkey" PRIMARY KEY ("idEncounterDiagnosis")
);

-- CreateTable
CREATE TABLE "DiagnosisStatusHistory" (
    "idDiagnosisStatusHistory" SERIAL NOT NULL,
    "PatientDiagnosis_idPatientDiagnosis" INTEGER NOT NULL,
    "Consulta_Cita_idCita" INTEGER,
    "previous_status" "DiagnosisStatus",
    "new_status" "DiagnosisStatus" NOT NULL,
    "reason" VARCHAR(500),
    "Usuario_idUsuario_changedBy" INTEGER NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosisStatusHistory_pkey" PRIMARY KEY ("idDiagnosisStatusHistory")
);

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_Consulta_Cita_idCita_idx" ON "EncounterDiagnosis"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "EncounterDiagnosis_PatientDiagnosis_idPatientDiagnosis_idx" ON "EncounterDiagnosis"("PatientDiagnosis_idPatientDiagnosis");

-- CreateIndex
CREATE UNIQUE INDEX "EncounterDiagnosis_Consulta_Cita_idCita_PatientDiagnosis_id_key" ON "EncounterDiagnosis"("Consulta_Cita_idCita", "PatientDiagnosis_idPatientDiagnosis");

-- CreateIndex
CREATE INDEX "DiagnosisStatusHistory_PatientDiagnosis_idPatientDiagnosis__idx" ON "DiagnosisStatusHistory"("PatientDiagnosis_idPatientDiagnosis", "changed_at");

-- CreateIndex
CREATE INDEX "DiagnosisStatusHistory_Consulta_Cita_idCita_idx" ON "DiagnosisStatusHistory"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "ConsultaProcedimiento_PatientDiagnosis_idPatientDiagnosis_idx" ON "ConsultaProcedimiento"("PatientDiagnosis_idPatientDiagnosis");

-- AddForeignKey
ALTER TABLE "ConsultaProcedimiento" ADD CONSTRAINT "ConsultaProcedimiento_PatientDiagnosis_idPatientDiagnosis_fkey" FOREIGN KEY ("PatientDiagnosis_idPatientDiagnosis") REFERENCES "PatientDiagnosis"("idPatientDiagnosis") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncounterDiagnosis" ADD CONSTRAINT "EncounterDiagnosis_PatientDiagnosis_idPatientDiagnosis_fkey" FOREIGN KEY ("PatientDiagnosis_idPatientDiagnosis") REFERENCES "PatientDiagnosis"("idPatientDiagnosis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisStatusHistory" ADD CONSTRAINT "DiagnosisStatusHistory_PatientDiagnosis_idPatientDiagnosis_fkey" FOREIGN KEY ("PatientDiagnosis_idPatientDiagnosis") REFERENCES "PatientDiagnosis"("idPatientDiagnosis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisStatusHistory" ADD CONSTRAINT "DiagnosisStatusHistory_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisStatusHistory" ADD CONSTRAINT "DiagnosisStatusHistory_Usuario_idUsuario_changedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_changedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;
