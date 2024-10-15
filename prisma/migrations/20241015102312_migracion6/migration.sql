/*
  Warnings:

  - Made the column `fecha_creacion` on table `Oferta` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "Tipo" AS ENUM ('privado', 'publico');

-- DropForeignKey
ALTER TABLE "Inversion" DROP CONSTRAINT "Inversion_id_inversor_fkey";

-- DropForeignKey
ALTER TABLE "Inversion" DROP CONSTRAINT "Inversion_id_startup_fkey";

-- DropForeignKey
ALTER TABLE "Oferta" DROP CONSTRAINT "Oferta_id_inversor_fkey";

-- DropForeignKey
ALTER TABLE "Oferta" DROP CONSTRAINT "Oferta_id_startup_fkey";

-- AlterTable
ALTER TABLE "Escrow" ALTER COLUMN "fecha_creacion" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Mensaje" ADD COLUMN     "id_grupo" INTEGER,
ALTER COLUMN "fecha_envio" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notificacion" ALTER COLUMN "fecha_creacion" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Oferta" ALTER COLUMN "fecha_creacion" SET NOT NULL,
ALTER COLUMN "fecha_creacion" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "avatar" TEXT;

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "tipo" "Tipo",
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foto_grupo" TEXT,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER,
    "id_inversor" INTEGER,
    "id_startup" INTEGER,
    "tipo_evento" VARCHAR(255) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "fecha_evento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chatbot" (
    "id" SERIAL NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "configuracion" JSONB NOT NULL,

    CONSTRAINT "Chatbot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GrupoUsuarios" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_GrupoUsuarios_AB_unique" ON "_GrupoUsuarios"("A", "B");

-- CreateIndex
CREATE INDEX "_GrupoUsuarios_B_index" ON "_GrupoUsuarios"("B");

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chatbot" ADD CONSTRAINT "Chatbot_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoUsuarios" ADD CONSTRAINT "_GrupoUsuarios_A_fkey" FOREIGN KEY ("A") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GrupoUsuarios" ADD CONSTRAINT "_GrupoUsuarios_B_fkey" FOREIGN KEY ("B") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
