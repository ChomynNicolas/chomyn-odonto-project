-- DropIndex
DROP INDEX "public"."idx_paciente_active_created";

-- DropIndex
DROP INDEX "public"."idx_paciente_created_at";

-- DropIndex
DROP INDEX "public"."idx_persona_apellidos_nombres";

-- CreateTable
CREATE TABLE "audit_logs" (
    "idAuditLog" SERIAL NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "ip" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("idAuditLog")
);

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Migration: Índices optimizados para KPIs clínicos
-- Fecha: 2025-11-04
-- Descripción: Agrega índices compuestos y parciales para acelerar consultas de agregación

-- ============================================
-- ÍNDICES PARA CITA
-- ============================================

-- Índice compuesto por estado y rango de fechas
CREATE INDEX IF NOT EXISTS "idx_cita_estado_inicio" ON "Cita"("estado", "inicio");

-- CREATE INDEX IF NOT EXISTS "idx_cita_profesional_inicio" ON "Cita"("Profesional_idProfesional", "inicio");
-- CREATE INDEX IF NOT EXISTS "idx_cita_consultorio_inicio" ON "Cita"("Consultorio_idConsultorio", "inicio");
-- CREATE INDEX IF NOT EXISTS "idx_cita_paciente_inicio" ON "Cita"("Paciente_idPaciente", "inicio");

-- Índice para citas reprogramadas (self-relation)
CREATE INDEX IF NOT EXISTS "idx_cita_reprogramada_desde"
  ON "Cita"("Cita_idCita_reprog_desde")
  WHERE "Cita_idCita_reprog_desde" IS NOT NULL;

-- Índice para cancelaciones same-day (parcial)
CREATE INDEX IF NOT EXISTS "idx_cita_cancelled_at"
  ON "Cita"("cancelled_at", "inicio")
  WHERE "estado" = 'CANCELLED';

-- Índice para timestamps de flujo (solo completadas)
CREATE INDEX IF NOT EXISTS "idx_cita_timestamps"
  ON "Cita"("checked_in_at", "started_at", "completed_at")
  WHERE "estado" = 'COMPLETED';

-- ============================================
-- ÍNDICES PARA CitaEstadoHistorial
-- ============================================

CREATE INDEX IF NOT EXISTS "idx_cita_estado_historial_estado_fecha"
  ON "CitaEstadoHistorial"("estado_nuevo", "changed_at");

-- CREATE INDEX IF NOT EXISTS "idx_cita_estado_historial_cita"
--   ON "CitaEstadoHistorial"("Cita_idCita", "changed_at");

-- ============================================
-- ÍNDICES PARA Consulta
-- ============================================

CREATE INDEX IF NOT EXISTS "idx_consulta_status_dates"
  ON "Consulta"("status", "started_at", "finished_at");

CREATE INDEX IF NOT EXISTS "idx_consulta_draft_started"
  ON "Consulta"("started_at")
  WHERE "status" = 'DRAFT';

CREATE INDEX IF NOT EXISTS "idx_consulta_performed_by"
  ON "Consulta"("Profesional_idProfesional", "started_at");

-- ============================================
-- ÍNDICES PARA ConsultaProcedimiento
-- ============================================

-- CREATE INDEX IF NOT EXISTS "idx_consulta_procedimiento_consulta" ON "ConsultaProcedimiento"("Consulta_Cita_idCita");
-- CREATE INDEX IF NOT EXISTS "idx_consulta_procedimiento_procedure" ON "ConsultaProcedimiento"("Procedimiento_idProcedimiento");

CREATE INDEX IF NOT EXISTS "idx_consulta_procedimiento_precio"
  ON "ConsultaProcedimiento"("Procedimiento_idProcedimiento", "total_cents")
  WHERE "total_cents" IS NOT NULL;

-- CREATE INDEX IF NOT EXISTS "idx_consulta_procedimiento_step" ON "ConsultaProcedimiento"("TreatmentStep_idTreatmentStep");

-- ============================================
-- ÍNDICES PARA Paciente
-- ============================================

-- CREATE INDEX IF NOT EXISTS "idx_paciente_created_at" ON "Paciente"("created_at");

CREATE INDEX IF NOT EXISTS "idx_paciente_activo_created"
  ON "Paciente"("esta_activo", "created_at");

-- ============================================
-- ÍNDICES PARA Persona
-- ============================================

-- CREATE INDEX IF NOT EXISTS "idx_persona_nombres_apellidos" ON "Persona"("nombres", "apellidos");

CREATE INDEX IF NOT EXISTS "idx_persona_fecha_nacimiento"
  ON "Persona"("fecha_nacimiento")
  WHERE "fecha_nacimiento" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_persona_genero"
  ON "Persona"("genero")
  WHERE "genero" IS NOT NULL;

-- ============================================
-- ÍNDICES PARA Adjunto
-- ============================================

-- CREATE INDEX IF NOT EXISTS "idx_adjunto_tipo_created"   ON "Adjunto"("tipo", "created_at");
-- CREATE INDEX IF NOT EXISTS "idx_adjunto_paciente"       ON "Adjunto"("Paciente_idPaciente", "created_at");
-- CREATE INDEX IF NOT EXISTS "idx_adjunto_consulta"       ON "Adjunto"("Consulta_Cita_idCita", "created_at");

CREATE INDEX IF NOT EXISTS "idx_adjunto_active"
  ON "Adjunto"("is_active", "created_at");

-- ============================================
-- ÍNDICES PARA PatientVitals
-- ============================================

CREATE INDEX IF NOT EXISTS "idx_patient_vitals_paciente_measured"
  ON "PatientVitals"("Paciente_idPaciente", "measured_at");

-- CREATE INDEX IF NOT EXISTS "idx_patient_vitals_consulta" ON "PatientVitals"("Consulta_Cita_idCita");

-- ============================================
-- ÍNDICES PARA PatientDiagnosis
-- ============================================

CREATE INDEX IF NOT EXISTS "idx_patient_diagnosis_paciente_status"
  ON "PatientDiagnosis"("Paciente_idPaciente", "status", "noted_at");

-- CREATE INDEX IF NOT EXISTS "idx_patient_diagnosis_consulta" ON "PatientDiagnosis"("Consulta_Cita_idCita");

CREATE INDEX IF NOT EXISTS "idx_patient_diagnosis_catalog"
  ON "PatientDiagnosis"("DiagnosisCatalog_id", "noted_at")
  WHERE "DiagnosisCatalog_id" IS NOT NULL;

-- ============================================
-- ÍNDICES PARA TreatmentStep
-- ============================================

CREATE INDEX IF NOT EXISTS "idx_treatment_step_plan_order"
  ON "TreatmentStep"("TreatmentPlan_idTreatmentPlan", "order");

-- CREATE INDEX IF NOT EXISTS "idx_treatment_step_status" ON "TreatmentStep"("status");

CREATE INDEX IF NOT EXISTS "idx_treatment_step_procedure"
  ON "TreatmentStep"("Procedimiento_idProcedimiento")
  WHERE "Procedimiento_idProcedimiento" IS NOT NULL;

-- ============================================
-- ÍNDICES PARA TreatmentPlan
-- ============================================

CREATE INDEX IF NOT EXISTS "idx_treatment_plan_paciente_active"
  ON "TreatmentPlan"("Paciente_idPaciente", "is_active");

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON INDEX "idx_cita_estado_inicio"                     IS 'Acelera filtrado de citas por estado y rango de fechas';
COMMENT ON INDEX "idx_cita_reprogramada_desde"                 IS 'Índice parcial para tasa de reprogramaciones';
COMMENT ON INDEX "idx_cita_cancelled_at"                       IS 'Índice parcial para cancelaciones same-day';
COMMENT ON INDEX "idx_cita_timestamps"                         IS 'Cálculo de tiempos de espera/puntualidad';
COMMENT ON INDEX "idx_consulta_status_dates"                   IS 'Filtrado de consultas por estado y fechas';
COMMENT ON INDEX "idx_consulta_draft_started"                  IS 'Alertas de consultas en DRAFT > N horas';
COMMENT ON INDEX "idx_consulta_procedimiento_precio"           IS 'Agregación de ingresos por procedimiento';
COMMENT ON INDEX "idx_paciente_activo_created"                 IS 'Cálculo de pacientes nuevos activos';
COMMENT ON INDEX "idx_persona_fecha_nacimiento"                IS 'Distribución por edad';
COMMENT ON INDEX "idx_patient_diagnosis_catalog"               IS 'Agregación de diagnósticos por catálogo';


-- Migration: Vistas materializadas para KPIs clínicos
-- Fecha: 2025-11-04
-- Descripción: Crea vistas materializadas para agregaciones pesadas (KPI)

-- =========================================================
-- 1) appointments_day_facts
-- =========================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS appointments_day_facts AS
SELECT
  CAST(c."inicio" AT TIME ZONE 'America/Asuncion' AS date)                                   AS fecha,
  c."Profesional_idProfesional"                                                               AS profesional_id,
  c."Consultorio_idConsultorio"                                                               AS consultorio_id,
  c."tipo"                                                                                    AS tipo,
  c."estado"                                                                                  AS estado,
  COUNT(*)                                                                                    AS total_citas,
  COUNT(*) FILTER (WHERE c."estado" = 'COMPLETED'::"EstadoCita")                              AS completadas,
  COUNT(*) FILTER (WHERE c."estado" = 'CANCELLED'::"EstadoCita")                              AS canceladas,
  COUNT(*) FILTER (WHERE c."estado" = 'NO_SHOW'::"EstadoCita")                                AS no_show,
  COUNT(*) FILTER (WHERE c."Cita_idCita_reprog_desde" IS NOT NULL)                            AS reprogramadas,
  AVG(EXTRACT(EPOCH FROM (c."inicio" - c."created_at")) / 86400.0)                            AS lead_time_dias_promedio,
  AVG(CASE
        WHEN c."started_at" IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c."started_at" - c."inicio")) / 60.0
      END)                                                                                   AS puntualidad_minutos_promedio,
  AVG(CASE
        WHEN c."started_at" IS NOT NULL AND c."checked_in_at" IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c."started_at" - c."checked_in_at")) / 60.0
      END)                                                                                   AS espera_minutos_promedio,
  SUM(c."duracion_minutos")                                                                   AS duracion_estimada_total,
  SUM(CASE
        WHEN c."completed_at" IS NOT NULL AND c."started_at" IS NOT NULL
        THEN EXTRACT(EPOCH FROM (c."completed_at" - c."started_at")) / 60.0
        ELSE c."duracion_minutos"
      END)                                                                                   AS duracion_real_total
FROM "Cita" c
WHERE c."inicio" >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY fecha, profesional_id, consultorio_id, tipo, estado;

-- Índice UNIQUE requerido para REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS appointments_day_facts_uidx
  ON appointments_day_facts (fecha, profesional_id, consultorio_id, tipo, estado);

COMMENT ON MATERIALIZED VIEW appointments_day_facts IS
'Hechos diarios de citas por profesional/consultorio/tipo/estado. Refresh diario recomendado.';

-- =========================================================
-- 2) procedures_day_facts
-- =========================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS procedures_day_facts AS
SELECT
  CAST(c."inicio" AT TIME ZONE 'America/Asuncion' AS date)                                    AS fecha,
  co."Profesional_idProfesional"                                                              AS profesional_id,
  cp."Procedimiento_idProcedimiento"                                                          AS procedure_id,
  pc."code"                                                                                   AS procedure_code,
  pc."nombre"                                                                                 AS procedure_nombre,
  COUNT(*)                                                                                    AS total_procedimientos,
  SUM(cp."quantity")                                                                          AS cantidad_total,
  SUM(COALESCE(
        cp."total_cents",
        cp."quantity" * COALESCE(cp."unit_price_cents", pc."default_price_cents", 0)
      ))                                                                                      AS ingresos_cents_total,
  COUNT(*) FILTER (
    WHERE cp."total_cents" IS NULL
      AND cp."unit_price_cents" IS NULL
      AND pc."default_price_cents" IS NULL
  )                                                                                           AS sin_precio
FROM "ConsultaProcedimiento" cp
INNER JOIN "Consulta" co ON cp."Consulta_Cita_idCita" = co."Cita_idCita"
INNER JOIN "Cita" c      ON co."Cita_idCita"          = c."idCita"
LEFT  JOIN "ProcedimientoCatalogo" pc
       ON cp."Procedimiento_idProcedimiento" = pc."idProcedimiento"
WHERE c."inicio" >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY fecha, profesional_id, procedure_id, procedure_code, procedure_nombre;

CREATE UNIQUE INDEX IF NOT EXISTS procedures_day_facts_uidx
  ON procedures_day_facts (fecha, profesional_id, procedure_id);

COMMENT ON MATERIALIZED VIEW procedures_day_facts IS
'Hechos diarios de procedimientos por profesional y tipo. Refresh diario recomendado.';

-- =========================================================
-- 3) vitals_day_facts
-- =========================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS vitals_day_facts AS
SELECT
  CAST(c."inicio" AT TIME ZONE 'America/Asuncion' AS date)                                    AS fecha,
  co."Profesional_idProfesional"                                                              AS profesional_id,
  COUNT(DISTINCT co."Cita_idCita")                                                            AS total_consultas,
  COUNT(DISTINCT pv."idPatientVitals")                                                        AS consultas_con_vitales,
  ROUND(
    100.0 * COUNT(DISTINCT pv."idPatientVitals") / NULLIF(COUNT(DISTINCT co."Cita_idCita"), 0),
    2
  )                                                                                           AS cobertura_vitales_percent
FROM "Consulta" co
INNER JOIN "Cita" c ON co."Cita_idCita" = c."idCita"
LEFT  JOIN "PatientVitals" pv ON pv."Consulta_Cita_idCita" = co."Cita_idCita"
WHERE c."inicio" >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY fecha, profesional_id;

CREATE UNIQUE INDEX IF NOT EXISTS vitals_day_facts_uidx
  ON vitals_day_facts (fecha, profesional_id);

COMMENT ON MATERIALIZED VIEW vitals_day_facts IS
'Cobertura diaria de signos vitales por profesional. Refresh diario recomendado.';

-- =========================================================
-- 4) revenue_day_facts
-- =========================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS revenue_day_facts AS
SELECT
  CAST(c."inicio" AT TIME ZONE 'America/Asuncion' AS date)                                    AS fecha,
  co."Profesional_idProfesional"                                                              AS profesional_id,
  SUM(COALESCE(
        cp."total_cents",
        cp."quantity" * COALESCE(cp."unit_price_cents", pc."default_price_cents", 0)
      ))                                                                                      AS ingresos_cents_total,
  COUNT(DISTINCT cp."idConsultaProcedimiento")                                                AS total_procedimientos,
  COUNT(DISTINCT c."Paciente_idPaciente")                                                     AS pacientes_unicos
FROM "ConsultaProcedimiento" cp
INNER JOIN "Consulta" co ON cp."Consulta_Cita_idCita" = co."Cita_idCita"
INNER JOIN "Cita" c      ON co."Cita_idCita"          = c."idCita"
LEFT  JOIN "ProcedimientoCatalogo" pc
       ON cp."Procedimiento_idProcedimiento" = pc."idProcedimiento"
WHERE c."inicio" >= CURRENT_DATE - INTERVAL '365 days'
  AND c."estado" = 'COMPLETED'::"EstadoCita"
GROUP BY fecha, profesional_id;

CREATE UNIQUE INDEX IF NOT EXISTS revenue_day_facts_uidx
  ON revenue_day_facts (fecha, profesional_id);

COMMENT ON MATERIALIZED VIEW revenue_day_facts IS
'Ingresos diarios por profesional. Acceso restringido por RBAC (ADMIN/ODONT).';

-- =========================================================
-- 5) Función para refrescar todas las MVs
--    (nota: REFRESH ... CONCURRENTLY requiere los UNIQUE INDEX arriba)
-- =========================================================
CREATE OR REPLACE FUNCTION refresh_kpi_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY appointments_day_facts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY procedures_day_facts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY vitals_day_facts;
  REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_day_facts;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_kpi_materialized_views() IS
'Refresca todas las vistas materializadas de KPIs. Ejecutar diariamente (batch nocturno) o manualmente desde UI.';
