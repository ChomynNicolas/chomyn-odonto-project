-- AlterTable
ALTER TABLE "PatientMedication" ADD COLUMN     "Consulta_Cita_idCita" INTEGER,
ADD COLUMN     "Usuario_idUsuario_discontinuedBy" INTEGER,
ADD COLUMN     "Usuario_idUsuario_updatedBy" INTEGER,
ADD COLUMN     "discontinued_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PatientMedication_Consulta_Cita_idCita_idx" ON "PatientMedication"("Consulta_Cita_idCita");

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_Usuario_idUsuario_updatedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_updatedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_Usuario_idUsuario_discontinuedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_discontinuedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMedication" ADD CONSTRAINT "PatientMedication_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE SET NULL ON UPDATE CASCADE;
