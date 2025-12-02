-- AlterTable: Add multi-session support fields to TreatmentStep
ALTER TABLE "TreatmentStep" ADD COLUMN "requires_multiple_sessions" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TreatmentStep" ADD COLUMN "total_sessions" INTEGER;
ALTER TABLE "TreatmentStep" ADD COLUMN "current_session" INTEGER DEFAULT 1;
ALTER TABLE "TreatmentStep" ADD COLUMN "completed_at" TIMESTAMP(3);

