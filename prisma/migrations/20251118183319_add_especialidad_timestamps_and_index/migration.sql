/*
  Warnings:

  - Added the required column `updated_at` to the `Especialidad` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add created_at column with default value
ALTER TABLE "Especialidad" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column with default value for existing rows
ALTER TABLE "Especialidad" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Especialidad_is_active_idx" ON "Especialidad"("is_active");
