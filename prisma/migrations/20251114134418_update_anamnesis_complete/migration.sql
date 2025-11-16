/*
  Warnings:

  - You are about to drop the column `consume_alcohol` on the `PatientAnamnesis` table. All the data in the column will be lost.
  - You are about to drop the column `fumador` on the `PatientAnamnesis` table. All the data in the column will be lost.
  - You are about to drop the column `consume_alcohol` on the `PatientAnamnesisVersion` table. All the data in the column will be lost.
  - You are about to drop the column `fumador` on the `PatientAnamnesisVersion` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AnamnesisUrgencia" AS ENUM ('RUTINA', 'PRIORITARIO', 'URGENCIA');

-- AlterTable
ALTER TABLE "PatientAnamnesis" DROP COLUMN "consume_alcohol",
DROP COLUMN "fumador",
ADD COLUMN     "dolor_intensidad" INTEGER,
ADD COLUMN     "expuesto_humo_tabaco" BOOLEAN,
ADD COLUMN     "higiene_cepillados_dia" INTEGER,
ADD COLUMN     "lactancia_registrada" BOOLEAN,
ADD COLUMN     "motivo_consulta" TEXT,
ADD COLUMN     "tiene_dolor_actual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tiene_habitos_succion" BOOLEAN,
ADD COLUMN     "urgencia_percibida" "AnamnesisUrgencia",
ADD COLUMN     "usa_hilo_dental" BOOLEAN;

-- AlterTable
ALTER TABLE "PatientAnamnesisVersion" DROP COLUMN "consume_alcohol",
DROP COLUMN "fumador",
ADD COLUMN     "dolor_intensidad" INTEGER,
ADD COLUMN     "expuesto_humo_tabaco" BOOLEAN,
ADD COLUMN     "higiene_cepillados_dia" INTEGER,
ADD COLUMN     "lactancia_registrada" BOOLEAN,
ADD COLUMN     "motivo_consulta" TEXT,
ADD COLUMN     "tiene_dolor_actual" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tiene_habitos_succion" BOOLEAN,
ADD COLUMN     "urgencia_percibida" "AnamnesisUrgencia",
ADD COLUMN     "usa_hilo_dental" BOOLEAN;

-- CreateIndex
CREATE INDEX "PatientAnamnesis_urgencia_percibida_idx" ON "PatientAnamnesis"("urgencia_percibida");
