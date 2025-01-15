/*
  Warnings:

  - You are about to drop the column `valorTotal` on the `PortfolioHistorico` table. All the data in the column will be lost.
  - Added the required column `valoracion` to the `PortfolioHistorico` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PortfolioHistorico" DROP COLUMN "valorTotal",
ADD COLUMN     "valoracion" DECIMAL(12,2) NOT NULL;
