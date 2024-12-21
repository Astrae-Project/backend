/*
  Warnings:

  - A unique constraint covering the columns `[id_usuario]` on the table `Inversor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id_usuario]` on the table `Startup` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Inversor_id_usuario_key" ON "Inversor"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Startup_id_usuario_key" ON "Startup"("id_usuario");
