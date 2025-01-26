/*
  Warnings:

  - A unique constraint covering the columns `[id_usuario,correo]` on the table `Contacto` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contacto_id_usuario_key";

-- CreateIndex
CREATE UNIQUE INDEX "Contacto_id_usuario_correo_key" ON "Contacto"("id_usuario", "correo");
