-- CreateEnum
CREATE TYPE "MotivoCancelacion" AS ENUM ('PACIENTE', 'PROFESIONAL', 'CLINICA', 'EMERGENCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoBloqueoAgenda" AS ENUM ('VACACIONES', 'MANTENIMIENTO', 'CAPACITACION', 'BLOQUEO_MANUAL', 'OTRO');

-- AlterTable
ALTER TABLE "Cita" ADD COLUMN     "Cita_idCita_reprog_desde" INTEGER,
ADD COLUMN     "Usuario_idUsuario_cancelledBy" INTEGER,
ADD COLUMN     "cancel_reason" "MotivoCancelacion",
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "checked_in_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "duracion_minutos" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "metadatos" JSONB,
ADD COLUMN     "started_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CitaEstadoHistorial" (
    "idCitaEstadoHistorial" SERIAL NOT NULL,
    "Cita_idCita" INTEGER NOT NULL,
    "estado_previo" "EstadoCita",
    "estado_nuevo" "EstadoCita" NOT NULL,
    "nota" TEXT,
    "Usuario_idUsuario_changedBy" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitaEstadoHistorial_pkey" PRIMARY KEY ("idCitaEstadoHistorial")
);

-- CreateTable
CREATE TABLE "BloqueoAgenda" (
    "idBloqueoAgenda" SERIAL NOT NULL,
    "Profesional_idProfesional" INTEGER,
    "Consultorio_idConsultorio" INTEGER,
    "desde" TIMESTAMP(3) NOT NULL,
    "hasta" TIMESTAMP(3) NOT NULL,
    "tipo" "TipoBloqueoAgenda" NOT NULL,
    "motivo" TEXT,
    "recurrencia" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BloqueoAgenda_pkey" PRIMARY KEY ("idBloqueoAgenda")
);

-- CreateIndex
CREATE INDEX "CitaEstadoHistorial_Cita_idCita_changed_at_idx" ON "CitaEstadoHistorial"("Cita_idCita", "changed_at");

-- CreateIndex
CREATE INDEX "CitaEstadoHistorial_estado_nuevo_changed_at_idx" ON "CitaEstadoHistorial"("estado_nuevo", "changed_at");

-- CreateIndex
CREATE INDEX "BloqueoAgenda_Profesional_idProfesional_desde_idx" ON "BloqueoAgenda"("Profesional_idProfesional", "desde");

-- CreateIndex
CREATE INDEX "BloqueoAgenda_Consultorio_idConsultorio_desde_idx" ON "BloqueoAgenda"("Consultorio_idConsultorio", "desde");

-- CreateIndex
CREATE INDEX "BloqueoAgenda_activo_desde_idx" ON "BloqueoAgenda"("activo", "desde");

-- CreateIndex
CREATE INDEX "Cita_inicio_idx" ON "Cita"("inicio");

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_Cita_idCita_reprog_desde_fkey" FOREIGN KEY ("Cita_idCita_reprog_desde") REFERENCES "Cita"("idCita") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_Usuario_idUsuario_cancelledBy_fkey" FOREIGN KEY ("Usuario_idUsuario_cancelledBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitaEstadoHistorial" ADD CONSTRAINT "CitaEstadoHistorial_Cita_idCita_fkey" FOREIGN KEY ("Cita_idCita") REFERENCES "Cita"("idCita") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitaEstadoHistorial" ADD CONSTRAINT "CitaEstadoHistorial_Usuario_idUsuario_changedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_changedBy") REFERENCES "Usuario"("idUsuario") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_Profesional_idProfesional_fkey" FOREIGN KEY ("Profesional_idProfesional") REFERENCES "Profesional"("idProfesional") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_Consultorio_idConsultorio_fkey" FOREIGN KEY ("Consultorio_idConsultorio") REFERENCES "Consultorio"("idConsultorio") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoAgenda" ADD CONSTRAINT "BloqueoAgenda_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;


CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Cita"
  ADD CONSTRAINT "cita_no_overlap_profesional"
  EXCLUDE USING gist (
    "Profesional_idProfesional" WITH =,
    tsrange("inicio", "fin", '[)') WITH &&
  )
  WHERE ("estado" IN ('SCHEDULED','CONFIRMED','CHECKED_IN','IN_PROGRESS'));


