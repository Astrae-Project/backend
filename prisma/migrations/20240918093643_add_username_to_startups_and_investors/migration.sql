/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `Inversor` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Startup` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Inversor" ADD COLUMN     "username" VARCHAR(255) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Startup" ADD COLUMN     "username" VARCHAR(255) NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Inversor_username_key" ON "Inversor"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Startup_username_key" ON "Startup"("username");
