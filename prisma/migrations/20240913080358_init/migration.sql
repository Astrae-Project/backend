-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('inversor', 'startup');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol",

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inversor" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "perfil_inversion" TEXT NOT NULL,

    CONSTRAINT "Inversor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(255) NOT NULL,
    "fase_desarrollo" VARCHAR(255) NOT NULL,
    "estado_financiacion" VARCHAR(255) NOT NULL,
    "plantilla" INTEGER,
    "porcentaje_disponible" DECIMAL(5,2) NOT NULL DEFAULT 100,

    CONSTRAINT "Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inversion" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "monto_invertido" DECIMAL(12,2) NOT NULL,
    "porcentaje_adquirido" DECIMAL(5,2) NOT NULL,
    "fecha" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "monto_ofrecido" DECIMAL(12,2) NOT NULL,
    "porcentaje_ofrecido" DECIMAL(5,2) NOT NULL,
    "estado" VARCHAR(50) NOT NULL,
    "escrow_id" VARCHAR(255),
    "contraoferta_monto" DECIMAL(12,2),
    "contraoferta_porcentaje" DECIMAL(5,2),
    "fecha_creacion" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_id_inversor_key" ON "Portfolio"("id_inversor");

-- AddForeignKey
ALTER TABLE "Inversor" ADD CONSTRAINT "Inversor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Startup" ADD CONSTRAINT "Startup_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
