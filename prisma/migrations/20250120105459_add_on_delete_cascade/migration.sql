-- DropForeignKey
ALTER TABLE "Participante" DROP CONSTRAINT "Participante_id_evento_fkey";

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
