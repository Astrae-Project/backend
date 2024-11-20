/*
  Warnings:

  - You are about to drop the column `username` on the `Inversor` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Inversor_username_key";

-- AlterTable
ALTER TABLE "Inversor" DROP COLUMN "username";

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "username" VARCHAR(255) NOT NULL DEFAULT 'usuario';

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");
