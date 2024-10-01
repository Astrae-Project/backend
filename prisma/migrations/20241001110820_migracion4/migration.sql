-- DropForeignKey
ALTER TABLE "Inversor" DROP CONSTRAINT "Inversor_id_fkey";

-- DropForeignKey
ALTER TABLE "Inversor" DROP CONSTRAINT "Inversor_id_usuario_fkey";

-- AlterTable
ALTER TABLE "Inversor" ALTER COLUMN "username" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Portfolio" ALTER COLUMN "fecha_creacion" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Inversor" ADD CONSTRAINT "Inversor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
