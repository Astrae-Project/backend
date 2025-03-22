-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
