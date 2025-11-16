/*
  Warnings:

  - You are about to drop the column `reason` on the `Consulta` table. All the data in the column will be lost.
  - You are about to drop the column `notas` on the `Paciente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Consulta" DROP COLUMN "reason";

-- AlterTable
ALTER TABLE "Paciente" DROP COLUMN "notas",
ADD COLUMN     "notas_administrativas" TEXT;

-- CreateIndex
CREATE INDEX "PatientAnamnesis_Paciente_idPaciente_updated_at_idx" ON "PatientAnamnesis"("Paciente_idPaciente", "updated_at");

-- CreateIndex
CREATE INDEX "PatientAnamnesis_tiene_dolor_actual_urgencia_percibida_idx" ON "PatientAnamnesis"("tiene_dolor_actual", "urgencia_percibida");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_tipo_created_at_idx" ON "PatientAnamnesisVersion"("tipo", "created_at");

-- CreateIndex
CREATE INDEX "PatientAnamnesisVersion_urgencia_percibida_created_at_idx" ON "PatientAnamnesisVersion"("urgencia_percibida", "created_at");
