/*
  Warnings:

  - You are about to drop the `valoracionHistorica` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "valoracionHistorica" DROP CONSTRAINT "valoracionHistorica_startupId_fkey";

-- DropTable
DROP TABLE "valoracionHistorica";

-- CreateTable
CREATE TABLE "ValoracionHistorica" (
    "id" SERIAL NOT NULL,
    "startupId" INTEGER NOT NULL,
    "valoracion" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValoracionHistorica_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ValoracionHistorica" ADD CONSTRAINT "ValoracionHistorica_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
