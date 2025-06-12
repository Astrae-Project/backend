-- CreateTable
CREATE TABLE "Documento" (
    "id" SERIAL NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
