-- AlterTable
ALTER TABLE "TreatmentPlan" ADD COLUMN     "TreatmentPlanCatalog_idTreatmentPlanCatalog" INTEGER;

-- CreateTable
CREATE TABLE "TreatmentPlanCatalog" (
    "idTreatmentPlanCatalog" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlanCatalog_pkey" PRIMARY KEY ("idTreatmentPlanCatalog")
);

-- CreateTable
CREATE TABLE "TreatmentPlanCatalogStep" (
    "idTreatmentPlanCatalogStep" SERIAL NOT NULL,
    "TreatmentPlanCatalog_idTreatmentPlanCatalog" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "Procedimiento_idProcedimiento" INTEGER,
    "service_type" TEXT,
    "tooth_number" INTEGER,
    "tooth_surface" "DienteSuperficie",
    "estimated_duration_min" INTEGER,
    "estimated_cost_cents" INTEGER,
    "priority" INTEGER,
    "notes" TEXT,
    "requires_multiple_sessions" BOOLEAN NOT NULL DEFAULT false,
    "total_sessions" INTEGER,
    "current_session" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TreatmentPlanCatalogStep_pkey" PRIMARY KEY ("idTreatmentPlanCatalogStep")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlanCatalog_code_key" ON "TreatmentPlanCatalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlanCatalogStep_TreatmentPlanCatalog_idTreatmentPl_key" ON "TreatmentPlanCatalogStep"("TreatmentPlanCatalog_idTreatmentPlanCatalog", "order");

-- CreateIndex
CREATE INDEX "TreatmentPlan_TreatmentPlanCatalog_idTreatmentPlanCatalog_idx" ON "TreatmentPlan"("TreatmentPlanCatalog_idTreatmentPlanCatalog");

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_TreatmentPlanCatalog_idTreatmentPlanCatalog_fkey" FOREIGN KEY ("TreatmentPlanCatalog_idTreatmentPlanCatalog") REFERENCES "TreatmentPlanCatalog"("idTreatmentPlanCatalog") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanCatalogStep" ADD CONSTRAINT "TreatmentPlanCatalogStep_TreatmentPlanCatalog_idTreatmentP_fkey" FOREIGN KEY ("TreatmentPlanCatalog_idTreatmentPlanCatalog") REFERENCES "TreatmentPlanCatalog"("idTreatmentPlanCatalog") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanCatalogStep" ADD CONSTRAINT "TreatmentPlanCatalogStep_Procedimiento_idProcedimiento_fkey" FOREIGN KEY ("Procedimiento_idProcedimiento") REFERENCES "ProcedimientoCatalogo"("idProcedimiento") ON DELETE SET NULL ON UPDATE CASCADE;
