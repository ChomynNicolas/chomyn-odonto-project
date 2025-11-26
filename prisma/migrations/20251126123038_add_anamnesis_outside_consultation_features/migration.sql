-- CreateEnum
CREATE TYPE "InformationSource" AS ENUM ('IN_PERSON', 'PHONE', 'EMAIL', 'DOCUMENT', 'PATIENT_PORTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "AnamnesisStatus" AS ENUM ('VALID', 'EXPIRED', 'PENDING_REVIEW', 'NO_ANAMNESIS');

-- AlterTable
ALTER TABLE "AnamnesisAuditLog" ADD COLUMN     "Usuario_idUsuario_reviewedBy" INTEGER,
ADD COLUMN     "information_source" "InformationSource",
ADD COLUMN     "is_outside_consultation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requires_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "verified_with_patient" BOOLEAN;

-- AlterTable
ALTER TABLE "AnamnesisFieldDiff" ADD COLUMN     "requires_review" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "review_reason" TEXT;

-- AlterTable
ALTER TABLE "PatientAnamnesis" ADD COLUMN     "Usuario_idUsuario_lastVerifiedBy" INTEGER,
ADD COLUMN     "has_pending_reviews" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "last_verified_at" TIMESTAMP(3),
ADD COLUMN     "pending_review_reason" TEXT,
ADD COLUMN     "pending_review_since" TIMESTAMP(3),
ADD COLUMN     "status" "AnamnesisStatus" NOT NULL DEFAULT 'VALID';

-- CreateTable
CREATE TABLE "AnamnesisPendingReview" (
    "idAnamnesisPendingReview" SERIAL NOT NULL,
    "PatientAnamnesis_id" INTEGER NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "AnamnesisAuditLog_id" INTEGER NOT NULL,
    "field_path" TEXT NOT NULL,
    "field_label" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT NOT NULL,
    "severity" "AnamnesisChangeSeverity" NOT NULL,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "Usuario_idUsuario_reviewedBy" INTEGER,
    "review_notes" TEXT,
    "is_approved" BOOLEAN,

    CONSTRAINT "AnamnesisPendingReview_pkey" PRIMARY KEY ("idAnamnesisPendingReview")
);

-- CreateIndex
CREATE INDEX "AnamnesisPendingReview_PatientAnamnesis_id_reviewed_at_idx" ON "AnamnesisPendingReview"("PatientAnamnesis_id", "reviewed_at");

-- CreateIndex
CREATE INDEX "AnamnesisPendingReview_Paciente_idPaciente_reviewed_at_idx" ON "AnamnesisPendingReview"("Paciente_idPaciente", "reviewed_at");

-- CreateIndex
CREATE INDEX "AnamnesisPendingReview_created_at_idx" ON "AnamnesisPendingReview"("created_at");

-- CreateIndex
CREATE INDEX "AnamnesisPendingReview_is_approved_idx" ON "AnamnesisPendingReview"("is_approved");

-- CreateIndex
CREATE INDEX "AnamnesisFieldDiff_requires_review_idx" ON "AnamnesisFieldDiff"("requires_review");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_status_idx" ON "PatientAnamnesis"("status");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_has_pending_reviews_idx" ON "PatientAnamnesis"("has_pending_reviews");

-- AddForeignKey
ALTER TABLE "PatientAnamnesis" ADD CONSTRAINT "PatientAnamnesis_Usuario_idUsuario_lastVerifiedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_lastVerifiedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAuditLog" ADD CONSTRAINT "AnamnesisAuditLog_Usuario_idUsuario_reviewedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_reviewedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisPendingReview" ADD CONSTRAINT "AnamnesisPendingReview_PatientAnamnesis_id_fkey" FOREIGN KEY ("PatientAnamnesis_id") REFERENCES "PatientAnamnesis"("idPatientAnamnesis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisPendingReview" ADD CONSTRAINT "AnamnesisPendingReview_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisPendingReview" ADD CONSTRAINT "AnamnesisPendingReview_AnamnesisAuditLog_id_fkey" FOREIGN KEY ("AnamnesisAuditLog_id") REFERENCES "AnamnesisAuditLog"("idAnamnesisAuditLog") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisPendingReview" ADD CONSTRAINT "AnamnesisPendingReview_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisPendingReview" ADD CONSTRAINT "AnamnesisPendingReview_Usuario_idUsuario_reviewedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_reviewedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;
