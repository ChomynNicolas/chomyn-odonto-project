-- CreateEnum
CREATE TYPE "ConsultaEstado" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "DienteSuperficie" AS ENUM ('O', 'M', 'D', 'V', 'L', 'MO', 'DO', 'VO', 'LO', 'MOD', 'MV', 'DL');

-- CreateEnum
CREATE TYPE "ClinicoArchivoTipo" AS ENUM ('XRAY', 'INTRAORAL_PHOTO', 'EXTRAORAL_PHOTO', 'DOCUMENT', 'PDF', 'IMAGE', 'LAB_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "TreatmentStepStatus" AS ENUM ('PENDING', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DEFERRED');

-- CreateTable
CREATE TABLE "ProcedimientoCatalogo" (
    "idProcedimiento" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "default_duration_min" INTEGER,
    "default_price_cents" INTEGER,
    "aplica_diente" BOOLEAN NOT NULL DEFAULT false,
    "aplica_superficie" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedimientoCatalogo_pkey" PRIMARY KEY ("idProcedimiento")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "Cita_idCita" INTEGER NOT NULL,
    "Profesional_idProfesional" INTEGER NOT NULL,
    "status" "ConsultaEstado" NOT NULL DEFAULT 'DRAFT',
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "reason" TEXT,
    "diagnosis" TEXT,
    "clinical_notes" TEXT,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("Cita_idCita")
);

-- CreateTable
CREATE TABLE "ConsultaProcedimiento" (
    "idConsultaProcedimiento" SERIAL NOT NULL,
    "Consulta_Cita_idCita" INTEGER NOT NULL,
    "Procedimiento_idProcedimiento" INTEGER,
    "service_type" TEXT,
    "tooth_number" INTEGER,
    "tooth_surface" "DienteSuperficie",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER,
    "total_cents" INTEGER,
    "TreatmentStep_idTreatmentStep" INTEGER,
    "result_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultaProcedimiento_pkey" PRIMARY KEY ("idConsultaProcedimiento")
);

-- CreateTable
CREATE TABLE "ConsultaAdjunto" (
    "idConsultaAdjunto" SERIAL NOT NULL,
    "Consulta_Cita_idCita" INTEGER NOT NULL,
    "ConsultaProcedimiento_idConsultaProcedimiento" INTEGER,
    "url" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "tipo" "ClinicoArchivoTipo" NOT NULL,
    "metadata" JSONB,
    "Usuario_idUsuario_uploadedBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultaAdjunto_pkey" PRIMARY KEY ("idConsultaAdjunto")
);

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "idTreatmentPlan" SERIAL NOT NULL,
    "Paciente_idPaciente" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "Usuario_idUsuario_createdBy" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("idTreatmentPlan")
);

-- CreateTable
CREATE TABLE "TreatmentStep" (
    "idTreatmentStep" SERIAL NOT NULL,
    "TreatmentPlan_idTreatmentPlan" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "Procedimiento_idProcedimiento" INTEGER,
    "service_type" TEXT,
    "tooth_number" INTEGER,
    "tooth_surface" "DienteSuperficie",
    "estimated_duration_min" INTEGER,
    "estimated_cost_cents" INTEGER,
    "priority" INTEGER,
    "status" "TreatmentStepStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentStep_pkey" PRIMARY KEY ("idTreatmentStep")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcedimientoCatalogo_code_key" ON "ProcedimientoCatalogo"("code");

-- CreateIndex
CREATE INDEX "ConsultaProcedimiento_Consulta_Cita_idCita_idx" ON "ConsultaProcedimiento"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "ConsultaProcedimiento_Procedimiento_idProcedimiento_idx" ON "ConsultaProcedimiento"("Procedimiento_idProcedimiento");

-- CreateIndex
CREATE INDEX "ConsultaProcedimiento_TreatmentStep_idTreatmentStep_idx" ON "ConsultaProcedimiento"("TreatmentStep_idTreatmentStep");

-- CreateIndex
CREATE INDEX "ConsultaAdjunto_Consulta_Cita_idCita_idx" ON "ConsultaAdjunto"("Consulta_Cita_idCita");

-- CreateIndex
CREATE INDEX "ConsultaAdjunto_ConsultaProcedimiento_idConsultaProcedimien_idx" ON "ConsultaAdjunto"("ConsultaProcedimiento_idConsultaProcedimiento");

-- CreateIndex
CREATE INDEX "TreatmentPlan_Paciente_idPaciente_is_active_idx" ON "TreatmentPlan"("Paciente_idPaciente", "is_active");

-- CreateIndex
CREATE INDEX "TreatmentStep_status_idx" ON "TreatmentStep"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentStep_TreatmentPlan_idTreatmentPlan_order_key" ON "TreatmentStep"("TreatmentPlan_idTreatmentPlan", "order");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_Cita_idCita_fkey" FOREIGN KEY ("Cita_idCita") REFERENCES "Cita"("idCita") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_Profesional_idProfesional_fkey" FOREIGN KEY ("Profesional_idProfesional") REFERENCES "Profesional"("idProfesional") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaProcedimiento" ADD CONSTRAINT "ConsultaProcedimiento_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaProcedimiento" ADD CONSTRAINT "ConsultaProcedimiento_Procedimiento_idProcedimiento_fkey" FOREIGN KEY ("Procedimiento_idProcedimiento") REFERENCES "ProcedimientoCatalogo"("idProcedimiento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaProcedimiento" ADD CONSTRAINT "ConsultaProcedimiento_TreatmentStep_idTreatmentStep_fkey" FOREIGN KEY ("TreatmentStep_idTreatmentStep") REFERENCES "TreatmentStep"("idTreatmentStep") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAdjunto" ADD CONSTRAINT "ConsultaAdjunto_Consulta_Cita_idCita_fkey" FOREIGN KEY ("Consulta_Cita_idCita") REFERENCES "Consulta"("Cita_idCita") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAdjunto" ADD CONSTRAINT "ConsultaAdjunto_ConsultaProcedimiento_idConsultaProcedimie_fkey" FOREIGN KEY ("ConsultaProcedimiento_idConsultaProcedimiento") REFERENCES "ConsultaProcedimiento"("idConsultaProcedimiento") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaAdjunto" ADD CONSTRAINT "ConsultaAdjunto_Usuario_idUsuario_uploadedBy_fkey" FOREIGN KEY ("Usuario_idUsuario_uploadedBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_Paciente_idPaciente_fkey" FOREIGN KEY ("Paciente_idPaciente") REFERENCES "Paciente"("idPaciente") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_Usuario_idUsuario_createdBy_fkey" FOREIGN KEY ("Usuario_idUsuario_createdBy") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentStep" ADD CONSTRAINT "TreatmentStep_TreatmentPlan_idTreatmentPlan_fkey" FOREIGN KEY ("TreatmentPlan_idTreatmentPlan") REFERENCES "TreatmentPlan"("idTreatmentPlan") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentStep" ADD CONSTRAINT "TreatmentStep_Procedimiento_idProcedimiento_fkey" FOREIGN KEY ("Procedimiento_idProcedimiento") REFERENCES "ProcedimientoCatalogo"("idProcedimiento") ON DELETE SET NULL ON UPDATE CASCADE;
