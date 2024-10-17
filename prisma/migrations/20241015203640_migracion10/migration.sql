-- CreateTable
CREATE TABLE "Contacto" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "correo" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "otros" TEXT,

    CONSTRAINT "Contacto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contacto_correo_key" ON "Contacto"("correo");

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
