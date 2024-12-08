/*
  Warnings:

  - Added the required column `fecha_expiracion` to the `Suscripcion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metodo_pago` to the `Suscripcion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'CANCELADA', 'PENDIENTE', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TARJETA', 'PAYPAL', 'OTRO');

-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN     "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "fecha_expiracion" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "metodo_pago" "MetodoPago" NOT NULL;
