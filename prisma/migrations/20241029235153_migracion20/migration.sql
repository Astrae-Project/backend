-- CreateTable
CREATE TABLE "resenas" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "puntuacion" INTEGER NOT NULL DEFAULT 0,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resenas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "resenas" ADD CONSTRAINT "resenas_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
