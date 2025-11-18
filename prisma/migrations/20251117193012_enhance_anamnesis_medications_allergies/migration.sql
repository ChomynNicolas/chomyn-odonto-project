/*
  Warnings:

  - Added the required column `Usuario_idUsuario_addedBy` to the `AnamnesisAllergy` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Usuario_idUsuario_addedBy` to the `AnamnesisMedication` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AnamnesisMedicationAllergyAction" AS ENUM ('ADDED', 'UPDATED', 'DEACTIVATED', 'REACTIVATED', 'REMOVED');

-- AlterTable
ALTER TABLE "AnamnesisAllergy" ADD COLUMN     "Usuario_idUsuario_addedBy" INTEGER NOT NULL,
ADD COLUMN     "Usuario_idUsuario_removedBy" INTEGER,
ADD COLUMN     "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "removed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AnamnesisMedication" ADD COLUMN     "Usuario_idUsuario_addedBy" INTEGER NOT NULL,
ADD COLUMN     "Usuario_idUsuario_removedBy" INTEGER,
ADD COLUMN     "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "removed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AnamnesisMedicationAudit" (
    "idAnamnesisMedicationAudit" SERIAL NOT NULL,
    "AnamnesisMedication_id" INTEGER NOT NULL,
    "action" "AnamnesisMedicationAllergyAction" NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Usuario_idUsuario_performedBy" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AnamnesisMedicationAudit_pkey" PRIMARY KEY ("idAnamnesisMedicationAudit")
);

-- CreateTable
CREATE TABLE "AnamnesisAllergyAudit" (
    "idAnamnesisAllergyAudit" SERIAL NOT NULL,
    "AnamnesisAllergy_id" INTEGER NOT NULL,
    "action" "AnamnesisMedicationAllergyAction" NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Usuario_idUsuario_performedBy" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AnamnesisAllergyAudit_pkey" PRIMARY KEY ("idAnamnesisAllergyAudit")
);

-- CreateIndex
CREATE INDEX "AnamnesisMedicationAudit_AnamnesisMedication_id_idx" ON "AnamnesisMedicationAudit"("AnamnesisMedication_id");

-- CreateIndex
CREATE INDEX "AnamnesisMedicationAudit_performed_at_idx" ON "AnamnesisMedicationAudit"("performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisMedicationAudit_action_idx" ON "AnamnesisMedicationAudit"("action");

-- CreateIndex
CREATE INDEX "AnamnesisAllergyAudit_AnamnesisAllergy_id_idx" ON "AnamnesisAllergyAudit"("AnamnesisAllergy_id");

-- CreateIndex
CREATE INDEX "AnamnesisAllergyAudit_performed_at_idx" ON "AnamnesisAllergyAudit"("performed_at");

-- CreateIndex
CREATE INDEX "AnamnesisAllergyAudit_action_idx" ON "AnamnesisAllergyAudit"("action");

-- CreateIndex
CREATE INDEX "AnamnesisAllergy_PatientAnamnesis_id_is_active_idx" ON "AnamnesisAllergy"("PatientAnamnesis_id", "is_active");

-- CreateIndex
CREATE INDEX "AnamnesisAllergy_added_at_idx" ON "AnamnesisAllergy"("added_at");

-- CreateIndex
CREATE INDEX "AnamnesisMedication_PatientAnamnesis_id_is_active_idx" ON "AnamnesisMedication"("PatientAnamnesis_id", "is_active");

-- CreateIndex
CREATE INDEX "AnamnesisMedication_added_at_idx" ON "AnamnesisMedication"("added_at");

-- AddForeignKey
ALTER TABLE "AnamnesisMedication" ADD CONSTRAINT "AnamnesisMedication_Usuario_idUsuario_addedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_addedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisMedication" ADD CONSTRAINT "AnamnesisMedication_Usuario_idUsuario_removedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_removedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAllergy" ADD CONSTRAINT "AnamnesisAllergy_Usuario_idUsuario_addedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_addedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAllergy" ADD CONSTRAINT "AnamnesisAllergy_Usuario_idUsuario_removedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_removedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisMedicationAudit" ADD CONSTRAINT "AnamnesisMedicationAudit_AnamnesisMedication_id_fkey" FOREIGN KEY ("AnamnesisMedication_id") REFERENCES "AnamnesisMedication"("idAnamnesisMedication") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisMedicationAudit" ADD CONSTRAINT "AnamnesisMedicationAudit_Usuario_idUsuario_performedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_performedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAllergyAudit" ADD CONSTRAINT "AnamnesisAllergyAudit_AnamnesisAllergy_id_fkey" FOREIGN KEY ("AnamnesisAllergy_id") REFERENCES "AnamnesisAllergy"("idAnamnesisAllergy") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAllergyAudit" ADD CONSTRAINT "AnamnesisAllergyAudit_Usuario_idUsuario_performedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_performedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;
