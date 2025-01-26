/*
  Warnings:

  - A unique constraint covering the columns `[id_usuario]` on the table `Contacto` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contacto_correo_key";

-- CreateIndex
CREATE UNIQUE INDEX "Contacto_id_usuario_key" ON "Contacto"("id_usuario");
