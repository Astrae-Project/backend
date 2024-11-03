/*
  Warnings:

  - You are about to drop the column `inversorId` on the `Evento` table. All the data in the column will be lost.
  - You are about to drop the column `startupId` on the `Evento` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_inversorId_fkey";

-- DropForeignKey
ALTER TABLE "Evento" DROP CONSTRAINT "Evento_startupId_fkey";

-- AlterTable
ALTER TABLE "Evento" DROP COLUMN "inversorId",
DROP COLUMN "startupId";
