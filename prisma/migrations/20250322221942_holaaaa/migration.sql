/*
  Warnings:

  - Added the required column `id_grupo` to the `Evento` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Evento" ADD COLUMN     "id_grupo" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
