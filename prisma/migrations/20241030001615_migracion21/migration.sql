/*
  Warnings:

  - You are about to drop the `resenas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "resenas" DROP CONSTRAINT "resenas_id_inversor_fkey";

-- DropTable
DROP TABLE "resenas";

-- CreateTable
CREATE TABLE "reseñas" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "puntuacion" INTEGER NOT NULL DEFAULT 0,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reseñas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "reseñas" ADD CONSTRAINT "reseñas_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reseñas" ADD CONSTRAINT "reseñas_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
