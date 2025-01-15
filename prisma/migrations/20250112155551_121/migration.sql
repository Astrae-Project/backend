/*
  Warnings:

  - You are about to drop the `ValoracionHistorica` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ValoracionHistorica" DROP CONSTRAINT "ValoracionHistorica_startupId_fkey";

-- DropTable
DROP TABLE "ValoracionHistorica";

-- CreateTable
CREATE TABLE "valoracionHistorica" (
    "id" SERIAL NOT NULL,
    "startupId" INTEGER NOT NULL,
    "valoracion" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valoracionHistorica_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "valoracionHistorica" ADD CONSTRAINT "valoracionHistorica_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
