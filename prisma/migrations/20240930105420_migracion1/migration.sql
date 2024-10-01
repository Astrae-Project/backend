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
    "username" VARCHAR(255) NOT NULL DEFAULT '',
    "perfil_inversion" TEXT NOT NULL,

    CONSTRAINT "Inversor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(255) NOT NULL,
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
    "portfolioId" INTEGER,

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
    "escrow_id" INTEGER,
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

-- CreateTable
CREATE TABLE "Escrow" (
    "id" SERIAL NOT NULL,
    "id_oferta" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(50) NOT NULL,
    "fecha_creacion" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Inversor_username_key" ON "Inversor"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Startup_username_key" ON "Startup"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_id_inversor_key" ON "Portfolio"("id_inversor");

-- AddForeignKey
ALTER TABLE "Inversor" ADD CONSTRAINT "Inversor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inversor" ADD CONSTRAINT "Inversor_id_fkey" FOREIGN KEY ("id") REFERENCES "Portfolio"("id_inversor") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Startup" ADD CONSTRAINT "Startup_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
