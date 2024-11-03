/*
  Warnings:

  - You are about to drop the `EventoParticipante` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventoParticipante" DROP CONSTRAINT "EventoParticipante_id_evento_fkey";

-- DropForeignKey
ALTER TABLE "EventoParticipante" DROP CONSTRAINT "EventoParticipante_id_usuario_fkey";

-- DropTable
DROP TABLE "EventoParticipante";

-- CreateTable
CREATE TABLE "Participante" (
    "id" SERIAL NOT NULL,
    "id_evento" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_union" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Participante_id_evento_id_usuario_key" ON "Participante"("id_evento", "id_usuario");

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
