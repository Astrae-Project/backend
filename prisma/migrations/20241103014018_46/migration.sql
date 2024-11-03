/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `Evento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "usuarioId";
