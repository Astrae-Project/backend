-- CreateTable
CREATE TABLE "Sesion" (
    "id" SERIAL NOT NULL,
    "id_sesion" TEXT NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "creado" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_id_sesion_key" ON "Sesion"("id_sesion");

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
