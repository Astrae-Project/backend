/*
  Warnings:

  - Added the required column `fase_desarrollo` to the `Startup` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Startup" ADD COLUMN     "fase_desarrollo" VARCHAR(255) NOT NULL;
