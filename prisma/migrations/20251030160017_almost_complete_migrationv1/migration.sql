/*
  Warnings:

  - You are about to drop the `ConsultaAdjunto` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AdjuntoTipo" AS ENUM ('XRAY', 'INTRAORAL_PHOTO', 'EXTRAORAL_PHOTO', 'IMAGE', 'DOCUMENT', 'PDF', 'LAB_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('PUBLIC', 'AUTHENTICATED');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'RULED_OUT');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- CreateEnum
CREATE TYPE "ToothCondition" AS ENUM ('INTACT', 'CARIES', 'FILLED', 'MISSING', 'ROOT_CANAL', 'CROWN', 'BRIDGE', 'IMPLANT', 'EXTRACTION_NEEDED');

-- CreateEnum
CREATE TYPE "PerioBleeding" AS ENUM ('NONE', 'YES');

-- CreateEnum
CREATE TYPE "PerioSite" AS ENUM ('DB', 'B', 'MB', 'DL', 'L', 'ML');

-- DropForeignKey
ALTER TABLE "public"."ConsultaAdjunto" DROP CONSTRAINT "ConsultaAdjunto_ConsultaProcedimiento_idConsultaProcedimie_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsultaAdjunto" DROP CONSTRAINT "ConsultaAdjunto_Consulta_Cita_idCita_fkey";

-- DropForeignKey
ALTER TABLE "public"."ConsultaAdjunto" DROP CONSTRAINT "ConsultaAdjunto_Usuario_idUsuario_uploadedBy_fkey";

-- DropTable
DROP TABLE "public"."ConsultaAdjunto";

-- DropEnum
DROP TYPE "public"."ClinicoArchivoTipo";

-- CreateTable
CREATE TABLE "Adjunto" (
    "idAdjunto" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER,
    "Consulta_Cita_idCita" INTEGER,
    "ConsultaProcedimiento_idConsultaProcedimiento" INTEGER,
    "tipo" "AdjuntoTipo" NOT NULL,
    "descripcion" VARCHAR(500),
    "public_id" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "format" TEXT,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "original_filename" TEXT,
    "access_mode" "AccessMode" NOT NULL DEFAULT 'AUTHENTICATED',
    "secure_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "Usuario_idUsuario_deletedBy" INTEGER,
    "Usuario_idUsuario_uploadedBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Adjunto_pkey" PRIMARY KEY ("idAdjunto")
);

-- CreateTable
CREATE TABLE "ClinicalHistoryEntry" (
    "idClinicalHistoryEntry" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "Consulta_Cita_idCita" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT,
    "notes" TEXT NOT NULL,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalHistoryEntry_pkey" PRIMARY KEY ("idClinicalHistoryEntry")
);

-- CreateTable
CREATE TABLE "DiagnosisCatalog" (
    "idDiagnosisCatalog" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosisCatalog_pkey" PRIMARY KEY ("idDiagnosisCatalog")
);

-- CreateTable
CREATE TABLE "PatientDiagnosis" (
    "idPatientDiagnosis" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "DiagnosisCatalog_id" INTEGER,
    "code" TEXT,
    "label" TEXT NOT NULL,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'ACTIVE',
    "noted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,
    "Consulta_Cita_idCita" INTEGER,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,

    CONSTRAINT "PatientDiagnosis_pkey" PRIMARY KEY ("idPatientDiagnosis")
);

-- CreateTable
CREATE TABLE "AllergyCatalog" (
    "idAllergyCatalog" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllergyCatalog_pkey" PRIMARY KEY ("idAllergyCatalog")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "idPatientAllergy" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "AllergyCatalog_id" INTEGER,
    "label" TEXT,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'MODERATE',
    "reaction" TEXT,
    "noted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("idPatientAllergy")
);

-- CreateTable
CREATE TABLE "MedicationCatalog" (
    "idMedicationCatalog" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicationCatalog_pkey" PRIMARY KEY ("idMedicationCatalog")
);

-- CreateTable
CREATE TABLE "PatientMedication" (
    "idPatientMedication" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "MedicationCatalog_id" INTEGER,
    "label" TEXT,
    "dose" TEXT,
    "freq" TEXT,
    "route" TEXT,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,

    CONSTRAINT "PatientMedication_pkey" PRIMARY KEY ("idPatientMedication")
);

-- CreateTable
CREATE TABLE "PatientVitals" (
    "idPatientVitals" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "Consulta_Cita_idCita" INTEGER,
    "measured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "height_cm" INTEGER,
    "weight_kg" INTEGER,
    "bmi" DOUBLE PRECISION,
    "bp_syst" INTEGER,
    "bp_diast" INTEGER,
    "heart_rate" INTEGER,
    "notes" TEXT,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,

    CONSTRAINT "PatientVitals_pkey" PRIMARY KEY ("idPatientVitals")
);

-- CreateTable
CREATE TABLE "OdontogramSnapshot" (
    "idOdontogramSnapshot" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "Consulta_Cita_idCita" INTEGER,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,

    CONSTRAINT "OdontogramSnapshot_pkey" PRIMARY KEY ("idOdontogramSnapshot")
);

-- CreateTable
CREATE TABLE "OdontogramEntry" (
    "idOdontogramEntry" SERIAL NOT NULL,
    "OdontogramSnapshot_id" INTEGER NOT NULL,
    "tooth_number" INTEGER NOT NULL,
    "surface" "DienteSuperficie",
    "condition" "ToothCondition" NOT NULL DEFAULT 'INTACT',
    "notes" TEXT,

    CONSTRAINT "OdontogramEntry_pkey" PRIMARY KEY ("idOdontogramEntry")
);

-- CreateTable
CREATE TABLE "PeriodontogramSnapshot" (
    "idPeriodontogramSnapshot" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "Consulta_Cita_idCita" INTEGER,
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,

    CONSTRAINT "PeriodontogramSnapshot_pkey" PRIMARY KEY ("idPeriodontogramSnapshot")
);

-- CreateTable
CREATE TABLE "PeriodontogramMeasure" (
    "idPeriodontogramMeasure" SERIAL NOT NULL,
    "PeriodontogramSnapshot_id" INTEGER NOT NULL,
    "tooth_number" INTEGER NOT NULL,
    "site" "PerioSite" NOT NULL,
    "probing_depth_mm" INTEGER,
    "bleeding" "PerioBleeding",
    "plaque" BOOLEAN,
    "mobility" INTEGER,
    "furcation" INTEGER,

    CONSTRAINT "PeriodontogramMeasure_pkey" PRIMARY KEY ("idPeriodontogramMeasure")
);

-- CreateIndex
CREATE UNIQUE INDEX "Adjunto_public_id_key" ON "Adjunto"("public_id");

-- CreateIndex
CREATE INDEX "Adjunto_Paciente_idPaciente_created_at_idx" ON "Adjunto"("Paciente_idPaciente", "created_at");

-- CreateIndex
CREATE INDEX "Adjunto_Consulta_Cita_idCita_created_at_idx" ON "Adjunto"("Consulta_Cita_idCita", "created_at");

-- CreateIndex
CREATE INDEX "Adjunto_ConsultaProcedimiento_idConsultaProcedimiento_creat_idx" ON "Adjunto"("ConsultaProcedimiento_idConsultaProcedimiento", "created_at");

-- CreateIndex
CREATE INDEX "Adjunto_tipo_created_at_idx" ON "Adjunto"("tipo", "created_at");

-- CreateIndex
CREATE INDEX "Adjunto_access_mode_created_at_idx" ON "Adjunto"("access_mode", "created_at");

-- CreateIndex
CREATE INDEX "ClinicalHistoryEntry_Paciente_idPaciente_fecha_idx" ON "ClinicalHistoryEntry"("Paciente_idPaciente", "fecha");

-- CreateIndex
CREATE INDEX "ClinicalHistoryEntry_Consulta_Cita_idCita_idx" ON "ClinicalHistoryEntry"("Consulta_Cita_idCita");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosisCatalog_code_key" ON "DiagnosisCatalog"("code");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_Paciente_idPaciente_status_noted_at_idx" ON "PatientDiagnosis"("Paciente_idPaciente", "status", "noted_at");

-- CreateIndex
CREATE INDEX "PatientDiagnosis_Consulta_Cita_idCita_idx" ON "PatientDiagnosis"("Consulta_Cita_idCita");

-- CreateIndex
CREATE UNIQUE INDEX "AllergyCatalog_name_key" ON "AllergyCatalog"("name");

-- CreateIndex
CREATE INDEX "PatientAllergy_Paciente_idPaciente_is_active_idx" ON "PatientAllergy"("Paciente_idPaciente", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "MedicationCatalog_name_key" ON "MedicationCatalog"("name");

-- CreateIndex
CREATE INDEX "PatientMedication_Paciente_idPaciente_is_active_idx" ON "PatientMedication"("Paciente_idPaciente", "is_active");

-- CreateIndex
CREATE INDEX "PatientVitals_Paciente_idPaciente_measured_at_idx" ON "PatientVitals"("Paciente_idPaciente", "measured_at");

-- CreateIndex
CREATE INDEX "PatientVitals_Consulta_Cita_idCita_idx" ON "PatientVitals"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "OdontogramSnapshot_Paciente_idPaciente_taken_at_idx" ON "OdontogramSnapshot"("Paciente_idPaciente", "taken_at");

-- CreateIndex
CREATE INDEX "OdontogramSnapshot_Consulta_Cita_idCita_idx" ON "OdontogramSnapshot"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "OdontogramEntry_tooth_number_idx" ON "OdontogramEntry"("tooth_number");

-- CreateIndex
CREATE UNIQUE INDEX "OdontogramEntry_OdontogramSnapshot_id_tooth_number_surface_key" ON "OdontogramEntry"("OdontogramSnapshot_id", "tooth_number", "surface");

-- CreateIndex
CREATE INDEX "PeriodontogramSnapshot_Paciente_idPaciente_taken_at_idx" ON "PeriodontogramSnapshot"("Paciente_idPaciente", "taken_at");

-- CreateIndex
CREATE INDEX "PeriodontogramSnapshot_Consulta_Cita_idCita_idx" ON "PeriodontogramSnapshot"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "PeriodontogramMeasure_tooth_number_idx" ON "PeriodontogramMeasure"("tooth_number");

-- CreateIndex
CREATE UNIQUE INDEX "PeriodontogramMeasure_PeriodontogramSnapshot_id_tooth_numbe_key" ON "PeriodontogramMeasure"("PeriodontogramSnapshot_id", "tooth_number", "site");

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_ConsultaProcedimiento_idConsultaProcedimiento_fkey" FOREIGN KEY ("ConsultaProcedimiento_idConsultaProcedimiento") REFERENCES "ConsultaProcedimiento"("idConsultaProcedimiento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_Usuario_idUsuario_deletedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_deletedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Adjunto" ADD CONSTRAINT "Adjunto_Usuario_idUsuario_uploadedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_uploadedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalHistoryEntry" ADD CONSTRAINT "ClinicalHistoryEntry_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalHistoryEntry" ADD CONSTRAINT "ClinicalHistoryEntry_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalHistoryEntry" ADD CONSTRAINT "ClinicalHistoryEntry_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_DiagnosisCatalog_id_fkey" FOREIGN KEY ("DiagnosisCatalog_id") REFERENCES "DiagnosisCatalog"("idDiagnosisCatalog") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientDiagnosis" ADD CONSTRAINT "PatientDiagnosis_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_AllergyCatalog_id_fkey" FOREIGN KEY ("AllergyCatalog_id") REFERENCES "AllergyCatalog"("idAllergyCatalog") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_MedicationCatalog_id_fkey" FOREIGN KEY ("MedicationCatalog_id") REFERENCES "MedicationCatalog"("idMedicationCatalog") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientVitals" ADD CONSTRAINT "PatientVitals_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramSnapshot" ADD CONSTRAINT "OdontogramSnapshot_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramEntry" ADD CONSTRAINT "OdontogramEntry_OdontogramSnapshot_id_fkey" FOREIGN KEY ("OdontogramSnapshot_id") REFERENCES "OdontogramSnapshot"("idOdontogramSnapshot") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramSnapshot" ADD CONSTRAINT "PeriodontogramSnapshot_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramSnapshot" ADD CONSTRAINT "PeriodontogramSnapshot_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramSnapshot" ADD CONSTRAINT "PeriodontogramSnapshot_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeriodontogramMeasure" ADD CONSTRAINT "PeriodontogramMeasure_PeriodontogramSnapshot_id_fkey" FOREIGN KEY ("PeriodontogramSnapshot_id") REFERENCES "PeriodontogramSnapshot"("idPeriodontogramSnapshot") ON DELETE CASCADE ON UPDATE CASCADE;
