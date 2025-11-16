-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "contacto_emergencia_nombre" TEXT,
ADD COLUMN     "contacto_emergencia_relacion" TEXT,
ADD COLUMN     "contacto_emergencia_telefono" TEXT,
ADD COLUMN     "pais" TEXT DEFAULT 'PY',
ADD COLUMN     "segundo_apellido" TEXT;
