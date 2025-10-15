/*
  Warnings:

  - A unique constraint covering the columns `[Persona_idPersona]` on the table `Profesional` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[numeroLicencia]` on the table `Profesional` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Persona_idPersona` to the `Profesional` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Profesional` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('MASCULINO', 'FEMENINO', 'OTRO', 'NO_ESPECIFICADO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CI', 'DNI', 'PASAPORTE', 'RUC', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoContacto" AS ENUM ('PHONE', 'EMAIL');

-- DropForeignKey
ALTER TABLE "public"."Profesional" DROP CONSTRAINT "Profesional_Usuario_idUsuario_fkey";

-- AlterTable
ALTER TABLE "Profesional" ADD COLUMN     "Persona_idPersona" INTEGER NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disponibilidad" JSONB,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "esta_activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ultimo_login_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Persona" (
    "idPersona" SERIAL NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3),
    "genero" "Genero",
    "direccion" TEXT,
    "esta_activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("idPersona")
);

-- CreateTable
CREATE TABLE "Documento" (
    "idDocumento" SERIAL NOT NULL,
    "Persona_idPersona" INTEGER NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "numero" TEXT NOT NULL,
    "pais_emision" TEXT,
    "fecha_emision" TIMESTAMP(3),
    "fecha_vencimiento" TIMESTAMP(3),
    "ruc" TEXT,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("idDocumento")
);

-- CreateTable
CREATE TABLE "PersonaContacto" (
    "idContacto" SERIAL NOT NULL,
    "Persona_idPersona" INTEGER NOT NULL,
    "tipo" "TipoContacto" NOT NULL,
    "valor_raw" TEXT NOT NULL,
    "valor_norm" TEXT NOT NULL,
    "label" TEXT,
    "whatsapp_capaz" BOOLEAN,
    "sms_capaz" BOOLEAN,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "es_pref_recordatorio" BOOLEAN NOT NULL DEFAULT false,
    "es_pref_cobranza" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonaContacto_pkey" PRIMARY KEY ("idContacto")
);

-- CreateTable
CREATE TABLE "Especialidad" (
    "idEspecialidad" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Especialidad_pkey" PRIMARY KEY ("idEspecialidad")
);

-- CreateTable
CREATE TABLE "ProfesionalEspecialidad" (
    "profesionalId" INTEGER NOT NULL,
    "especialidadId" INTEGER NOT NULL,

    CONSTRAINT "ProfesionalEspecialidad_pkey" PRIMARY KEY ("profesionalId","especialidadId")
);

-- CreateIndex
CREATE INDEX "Persona_nombres_apellidos_idx" ON "Persona"("nombres", "apellidos");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_Persona_idPersona_key" ON "Documento"("Persona_idPersona");

-- CreateIndex
CREATE UNIQUE INDEX "Documento_tipo_numero_pais_emision_key" ON "Documento"("tipo", "numero", "pais_emision");

-- CreateIndex
CREATE INDEX "PersonaContacto_Persona_idPersona_tipo_es_principal_idx" ON "PersonaContacto"("Persona_idPersona", "tipo", "es_principal");

-- CreateIndex
CREATE INDEX "PersonaContacto_Persona_idPersona_es_pref_recordatorio_idx" ON "PersonaContacto"("Persona_idPersona", "es_pref_recordatorio");

-- CreateIndex
CREATE INDEX "PersonaContacto_Persona_idPersona_es_pref_cobranza_idx" ON "PersonaContacto"("Persona_idPersona", "es_pref_cobranza");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaContacto_Persona_idPersona_tipo_valor_norm_key" ON "PersonaContacto"("Persona_idPersona", "tipo", "valor_norm");

-- CreateIndex
CREATE UNIQUE INDEX "Especialidad_nombre_key" ON "Especialidad"("nombre");

-- CreateIndex
CREATE INDEX "Profesional_estaActivo_idx" ON "Profesional"("estaActivo");

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_Persona_idPersona_key" ON "Profesional"("Persona_idPersona");

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_numeroLicencia_key" ON "Profesional"("numeroLicencia");

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_Usuario_idUsuario_fkey" FOREIGN KEY ("Usuario_idUsuario") REFERENCES "Usuario"("idUsuario") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_Persona_idPersona_fkey" FOREIGN KEY ("Persona_idPersona") REFERENCES "Persona"("idPersona") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_Persona_idPersona_fkey" FOREIGN KEY ("Persona_idPersona") REFERENCES "Persona"("idPersona") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaContacto" ADD CONSTRAINT "PersonaContacto_Persona_idPersona_fkey" FOREIGN KEY ("Persona_idPersona") REFERENCES "Persona"("idPersona") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalEspecialidad" ADD CONSTRAINT "ProfesionalEspecialidad_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("idProfesional") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalEspecialidad" ADD CONSTRAINT "ProfesionalEspecialidad_especialidadId_fkey" FOREIGN KEY ("especialidadId") REFERENCES "Especialidad"("idEspecialidad") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Un solo principal por (persona, tipo)
CREATE UNIQUE INDEX uq_personacontacto_principal
ON "PersonaContacto" ("Persona_idPersona", "tipo")
WHERE "es_principal" = true;

-- Un solo contacto preferido para recordatorios por persona
CREATE UNIQUE INDEX uq_personacontacto_pref_recordatorio
ON "PersonaContacto" ("Persona_idPersona")
WHERE "es_pref_recordatorio" = true;

-- Un solo contacto preferido para cobranza por persona
CREATE UNIQUE INDEX uq_personacontacto_pref_cobranza
ON "PersonaContacto" ("Persona_idPersona")
WHERE "es_pref_cobranza" = true;


