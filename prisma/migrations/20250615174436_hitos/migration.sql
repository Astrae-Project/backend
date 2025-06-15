-- CreateEnum
CREATE TYPE "EstadoHito" AS ENUM ('cumplido', 'fallado', 'actual', 'futuro');

-- CreateTable
CREATE TABLE "Hito" (
    "id" SERIAL NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "fechaObjetivo" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoHito" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hito_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hito" ADD CONSTRAINT "Hito_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
