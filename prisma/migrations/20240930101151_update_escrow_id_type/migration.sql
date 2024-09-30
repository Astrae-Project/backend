/*
  Warnings:

  - The `escrow_id` column on the `Oferta` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Oferta" DROP COLUMN "escrow_id",
ADD COLUMN     "escrow_id" INTEGER;
