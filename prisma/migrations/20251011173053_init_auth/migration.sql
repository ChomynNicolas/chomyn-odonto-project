-- CreateEnum
CREATE TYPE "RolNombre" AS ENUM ('ADMIN', 'ODONT', 'RECEP');

-- CreateTable
CREATE TABLE "Rol" (
    "idRol" SERIAL NOT NULL,
    "nombreRol" "RolNombre" NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("idRol")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "idUsuario" SERIAL NOT NULL,
    "usuario" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "nombre_apellido" TEXT NOT NULL,
    "Rol_idRol" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("idUsuario")
);

-- CreateTable
CREATE TABLE "Profesional" (
    "idProfesional" SERIAL NOT NULL,
    "numeroLicencia" TEXT,
    "estaActivo" BOOLEAN NOT NULL DEFAULT true,
    "Usuario_idUsuario" INTEGER NOT NULL,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("idProfesional")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rol_nombreRol_key" ON "Rol"("nombreRol");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_Rol_idRol_idx" ON "Usuario"("Rol_idRol");

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_Usuario_idUsuario_key" ON "Profesional"("Usuario_idUsuario");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_Rol_idRol_fkey" FOREIGN KEY ("Rol_idRol") REFERENCES "Rol"("idRol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_Usuario_idUsuario_fkey" FOREIGN KEY ("Usuario_idUsuario") REFERENCES "Usuario"("idUsuario") ON DELETE RESTRICT ON UPDATE CASCADE;
