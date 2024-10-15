/*
  Warnings:

  - Made the column `tipo` on table `Grupo` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Grupo" ALTER COLUMN "tipo" SET NOT NULL,
ALTER COLUMN "tipo" SET DEFAULT 'publico';
