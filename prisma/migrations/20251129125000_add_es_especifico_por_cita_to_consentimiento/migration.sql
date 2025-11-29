-- AlterTable
ALTER TABLE "Consentimiento" ADD COLUMN "es_especifico_por_cita" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Consentimiento_esEspecificoPorCita_Cita_idx" ON "Consentimiento"("es_especifico_por_cita", "Cita_idCita");

-- CreateIndex (Unique constraint)
CREATE UNIQUE INDEX "unique_consent_per_cita_tipo" ON "Consentimiento"("Cita_idCita", "tipo", "activo");

