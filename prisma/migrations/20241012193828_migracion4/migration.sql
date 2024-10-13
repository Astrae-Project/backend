-- CreateTable
CREATE TABLE "Ingreso" (
    "id" SERIAL NOT NULL,
    "id_inversion" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingreso_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_id_inversion_fkey" FOREIGN KEY ("id_inversion") REFERENCES "Inversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
