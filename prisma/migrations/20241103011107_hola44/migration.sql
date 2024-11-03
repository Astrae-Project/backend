/*
  Warnings:

  - You are about to drop the column `id_inversor` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `id_startup` on the `Evento` table. All the data in the column will be lost.
  - Added the required column `titulo` to the `Evento` table without a default value. This is not possible if the table is not empty.
  - Made the column `id_usuario` on table `Evento` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_id_inversor_fkey";

-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_id_startup_fkey";

-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_id_usuario_fkey";

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "id_inversor",
DROP COLUMN "id_startup",
ADD COLUMN     "inversorId" INTEGER,
ADD COLUMN     "startupId" INTEGER,
ADD COLUMN     "titulo" VARCHAR(255) NOT NULL,
ADD COLUMN     "usuarioId" INTEGER,
ALTER COLUMN "id_usuario" SET NOT NULL;

-- CreateTable
CREATE TABLE "EventoParticipante" (
    "id" SERIAL NOT NULL,
    "id_evento" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_union" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventoParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventoParticipante_id_evento_id_usuario_key" ON "EventoParticipante"("id_evento", "id_usuario");

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_inversorId_fkey" FOREIGN KEY ("inversorId") REFERENCES "Inversor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoParticipante" ADD CONSTRAINT "EventoParticipante_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventoParticipante" ADD CONSTRAINT "EventoParticipante_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
