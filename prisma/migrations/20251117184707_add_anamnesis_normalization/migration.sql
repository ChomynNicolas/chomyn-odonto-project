-- CreateEnum
CREATE TYPE "AntecedentCategory" AS ENUM ('CARDIOVASCULAR', 'ENDOCRINE', 'RESPIRATORY', 'GASTROINTESTINAL', 'NEUROLOGICAL', 'SURGICAL_HISTORY', 'SMOKING', 'ALCOHOL', 'OTHER');

-- AlterTable
ALTER TABLE "PatientAnamnesis" ALTER COLUMN "payload" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AntecedentCatalog" (
    "idAntecedentCatalog" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AntecedentCategory" NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AntecedentCatalog_pkey" PRIMARY KEY ("idAntecedentCatalog")
);

-- CreateTable
CREATE TABLE "AnamnesisAntecedent" (
    "idAnamnesisAntecedent" SERIAL NOT NULL,
    "PatientAnamnesis_id" INTEGER NOT NULL,
    "AntecedentCatalog_id" INTEGER,
    "custom_name" TEXT,
    "custom_category" "AntecedentCategory",
    "notes" TEXT,
    "diagnosed_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "AnamnesisAntecedent_pkey" PRIMARY KEY ("idAnamnesisAntecedent")
);

-- CreateTable
CREATE TABLE "AnamnesisMedication" (
    "idAnamnesisMedication" SERIAL NOT NULL,
    "PatientAnamnesis_id" INTEGER NOT NULL,
    "PatientMedication_id" INTEGER NOT NULL,

    CONSTRAINT "AnamnesisMedication_pkey" PRIMARY KEY ("idAnamnesisMedication")
);

-- CreateTable
CREATE TABLE "AnamnesisAllergy" (
    "idAnamnesisAllergy" SERIAL NOT NULL,
    "PatientAnamnesis_id" INTEGER NOT NULL,
    "PatientAllergy_id" INTEGER NOT NULL,

    CONSTRAINT "AnamnesisAllergy_pkey" PRIMARY KEY ("idAnamnesisAllergy")
);

-- CreateTable
CREATE TABLE "AnamnesisConfig" (
    "idAnamnesisConfig" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "Usuario_idUsuario_updatedBy" INTEGER NOT NULL,

    CONSTRAINT "AnamnesisConfig_pkey" PRIMARY KEY ("idAnamnesisConfig")
);

-- CreateIndex
CREATE UNIQUE INDEX "AntecedentCatalog_code_key" ON "AntecedentCatalog"("code");

-- CreateIndex
CREATE INDEX "AntecedentCatalog_category_idx" ON "AntecedentCatalog"("category");

-- CreateIndex
CREATE INDEX "AntecedentCatalog_is_active_idx" ON "AntecedentCatalog"("is_active");

-- CreateIndex
CREATE INDEX "AnamnesisAntecedent_PatientAnamnesis_id_idx" ON "AnamnesisAntecedent"("PatientAnamnesis_id");

-- CreateIndex
CREATE INDEX "AnamnesisAntecedent_AntecedentCatalog_id_idx" ON "AnamnesisAntecedent"("AntecedentCatalog_id");

-- CreateIndex
CREATE INDEX "AnamnesisAntecedent_is_active_idx" ON "AnamnesisAntecedent"("is_active");

-- CreateIndex
CREATE INDEX "AnamnesisMedication_PatientAnamnesis_id_idx" ON "AnamnesisMedication"("PatientAnamnesis_id");

-- CreateIndex
CREATE INDEX "AnamnesisMedication_PatientMedication_id_idx" ON "AnamnesisMedication"("PatientMedication_id");

-- CreateIndex
CREATE UNIQUE INDEX "AnamnesisMedication_PatientAnamnesis_id_PatientMedication_i_key" ON "AnamnesisMedication"("PatientAnamnesis_id", "PatientMedication_id");

-- CreateIndex
CREATE INDEX "AnamnesisAllergy_PatientAnamnesis_id_idx" ON "AnamnesisAllergy"("PatientAnamnesis_id");

-- CreateIndex
CREATE INDEX "AnamnesisAllergy_PatientAllergy_id_idx" ON "AnamnesisAllergy"("PatientAllergy_id");

-- CreateIndex
CREATE UNIQUE INDEX "AnamnesisAllergy_PatientAnamnesis_id_PatientAllergy_id_key" ON "AnamnesisAllergy"("PatientAnamnesis_id", "PatientAllergy_id");

-- CreateIndex
CREATE UNIQUE INDEX "AnamnesisConfig_key_key" ON "AnamnesisConfig"("key");

-- AddForeignKey
ALTER TABLE "AnamnesisAntecedent" ADD CONSTRAINT "AnamnesisAntecedent_AntecedentCatalog_id_fkey" FOREIGN KEY ("AntecedentCatalog_id") REFERENCES "AntecedentCatalog"("idAntecedentCatalog") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAntecedent" ADD CONSTRAINT "AnamnesisAntecedent_PatientAnamnesis_id_fkey" FOREIGN KEY ("PatientAnamnesis_id") REFERENCES "PatientAnamnesis"("idPatientAnamnesis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisMedication" ADD CONSTRAINT "AnamnesisMedication_PatientAnamnesis_id_fkey" FOREIGN KEY ("PatientAnamnesis_id") REFERENCES "PatientAnamnesis"("idPatientAnamnesis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisMedication" ADD CONSTRAINT "AnamnesisMedication_PatientMedication_id_fkey" FOREIGN KEY ("PatientMedication_id") REFERENCES "PatientMedication"("idPatientMedication") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAllergy" ADD CONSTRAINT "AnamnesisAllergy_PatientAnamnesis_id_fkey" FOREIGN KEY ("PatientAnamnesis_id") REFERENCES "PatientAnamnesis"("idPatientAnamnesis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisAllergy" ADD CONSTRAINT "AnamnesisAllergy_PatientAllergy_id_fkey" FOREIGN KEY ("PatientAllergy_id") REFERENCES "PatientAllergy"("idPatientAllergy") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnamnesisConfig" ADD CONSTRAINT "AnamnesisConfig_Usuario_idUsuario_updatedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_updatedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;
