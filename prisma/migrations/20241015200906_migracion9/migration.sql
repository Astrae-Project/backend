-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('evento', 'inversion', 'oferta');

-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "tipo_movimiento" "TipoMovimiento" NOT NULL DEFAULT 'evento';

-- AlterTable
ALTER TABLE "Inversion" ADD COLUMN     "tipo_movimiento" "TipoMovimiento" NOT NULL DEFAULT 'inversion';

-- AlterTable
ALTER TABLE "Oferta" ADD COLUMN     "tipo_movimiento" "TipoMovimiento" NOT NULL DEFAULT 'oferta';
