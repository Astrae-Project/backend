-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('evento', 'inversion', 'oferta', 'contraoferta', 'grupo', 'reseña', 'seguimiento');

-- AlterTable
ALTER TABLE "Notificacion" ADD COLUMN     "tipo" "TipoNotificacion" NOT NULL DEFAULT 'evento';
