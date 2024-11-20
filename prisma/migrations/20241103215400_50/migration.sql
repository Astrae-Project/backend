/*
  Warnings:

  - You are about to drop the column `username` on the `Startup` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Startup_username_key";

-- AlterTable
ALTER TABLE "Startup" DROP COLUMN "username";

-- AlterTable
ALTER TABLE "Usuario" ALTER COLUMN "username" DROP DEFAULT;
