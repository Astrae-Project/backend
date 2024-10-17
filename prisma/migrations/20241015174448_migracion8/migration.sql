/*
  Warnings:

  - You are about to drop the `_GrupoUsuarios` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RolGrupo" AS ENUM ('miembro', 'administrador');

-- DropForeignKey
ALTER TABLE "_GrupoUsuarios" DROP CONSTRAINT "_GrupoUsuarios_A_fkey";

-- DropForeignKey
ALTER TABLE "_GrupoUsuarios" DROP CONSTRAINT "_GrupoUsuarios_B_fkey";

-- DropTable
DROP TABLE "_GrupoUsuarios";

-- CreateTable
CREATE TABLE "GrupoUsuario" (
    "id" SERIAL NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "rol" "RolGrupo" NOT NULL DEFAULT 'miembro',

    CONSTRAINT "GrupoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrupoUsuario_id_grupo_id_usuario_key" ON "GrupoUsuario"("id_grupo", "id_usuario");

-- AddForeignKey
ALTER TABLE "GrupoUsuario" ADD CONSTRAINT "GrupoUsuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoUsuario" ADD CONSTRAINT "GrupoUsuario_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
