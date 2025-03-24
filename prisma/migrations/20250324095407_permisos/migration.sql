-- CreateEnum
CREATE TYPE "Permiso" AS ENUM ('editar_grupo', 'eliminar_grupo', 'gestionar_roles', 'ver_estadisticas', 'invitar_miembros', 'expulsar_miembros', 'aprobar_solicitudes', 'crear_publicaciones', 'eliminar_publicaciones', 'fijar_publicaciones', 'crear_ofertas', 'gestionar_ofertas', 'subir_documentos', 'eliminar_documentos');

-- CreateTable
CREATE TABLE "ConfiguracionPermiso" (
    "id" SERIAL NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "permiso" "Permiso" NOT NULL,
    "abierto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConfiguracionPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionPermiso_id_grupo_permiso_key" ON "ConfiguracionPermiso"("id_grupo", "permiso");

-- AddForeignKey
ALTER TABLE "ConfiguracionPermiso" ADD CONSTRAINT "ConfiguracionPermiso_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
