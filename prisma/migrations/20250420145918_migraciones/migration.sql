/*
  Warnings:

  - A unique constraint covering the columns `[id_inversor,id_startup]` on the table `Inversion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Inversion_id_inversor_id_startup_key" ON "Inversion"("id_inversor", "id_startup");
