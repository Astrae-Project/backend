/*
  Warnings:

  - A unique constraint covering the columns `[id_seguidor,id_seguido]` on the table `Seguimiento` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Seguimiento" DROP CONSTRAINT "Seguimiento_id_seguido_fkey";

-- DropForeignKey
ALTER TABLE "Seguimiento" DROP CONSTRAINT "Seguimiento_id_seguidor_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "Seguimiento_id_seguidor_id_seguido_key" ON "Seguimiento"("id_seguidor", "id_seguido");

-- AddForeignKey
ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_id_seguido_fkey" FOREIGN KEY ("id_seguido") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_id_seguidor_fkey" FOREIGN KEY ("id_seguidor") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
