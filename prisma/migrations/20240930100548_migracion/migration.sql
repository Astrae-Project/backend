-- CreateTable
CREATE TABLE "Escrow" (
    "id" SERIAL NOT NULL,
    "id_oferta" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(50) NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
