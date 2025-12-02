/*
  Warnings:

  - You are about to drop the column `is_active` on the `TreatmentPlan` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TreatmentPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- DropIndex
DROP INDEX "public"."TreatmentPlan_Paciente_idPaciente_is_active_idx";

-- DropIndex
DROP INDEX "public"."idx_treatment_plan_paciente_active";

-- AlterTable
ALTER TABLE "TreatmentPlan" DROP COLUMN "is_active",
ADD COLUMN     "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "TreatmentPlan_Paciente_idPaciente_status_idx" ON "TreatmentPlan"("Paciente_idPaciente", "status");
