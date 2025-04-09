/*
  Warnings:

  - The values [aprobar_solicitudes,crear_publicaciones,eliminar_publicaciones,fijar_publicaciones,gestionar_ofertas] on the enum `Permiso` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Permiso_new" AS ENUM ('editar_grupo', 'eliminar_grupo', 'gestionar_roles', 'ver_estadisticas', 'invitar_miembros', 'expulsar_miembros', 'crear_ofertas', 'subir_documentos', 'eliminar_documentos');
ALTER TABLE "ConfiguracionPermiso" ALTER COLUMN "permiso" TYPE "Permiso_new" USING ("permiso"::text::"Permiso_new");
ALTER TYPE "Permiso" RENAME TO "Permiso_old";
ALTER TYPE "Permiso_new" RENAME TO "Permiso";
DROP TYPE "Permiso_old";
COMMIT;

-- AlterTable
ALTER TABLE "Mensaje" ADD COLUMN     "archivo_url" TEXT;
