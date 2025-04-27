-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'under_review', 'active', 'restricted', 'rejected', 'closed');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('evento', 'inversion', 'oferta');

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('evento', 'inversion', 'oferta', 'contraoferta', 'grupo', 'reseña', 'seguimiento');

-- CreateEnum
CREATE TYPE "Tipo" AS ENUM ('privado', 'publico');

-- CreateEnum
CREATE TYPE "RolGrupo" AS ENUM ('miembro', 'administrador');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('inversor', 'startup');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'CANCELADA', 'PENDIENTE', 'EXPIRADA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('TARJETA', 'PAYPAL', 'OTRO');

-- CreateEnum
CREATE TYPE "Permiso" AS ENUM ('editar_grupo', 'eliminar_grupo', 'gestionar_roles', 'ver_estadisticas', 'invitar_miembros', 'expulsar_miembros', 'crear_ofertas', 'subir_documentos', 'eliminar_documentos');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol",
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "stripeCustomerId" TEXT,
    "payment_method_id" TEXT,

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
CREATE TABLE "PortfolioHistorico" (
    "id" SERIAL NOT NULL,
    "inversorId" INTEGER NOT NULL,
    "valoracion" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioHistorico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Startup" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "sector" VARCHAR(255) NOT NULL,
    "estado_financiacion" VARCHAR(255) NOT NULL,
    "plantilla" INTEGER,
    "porcentaje_disponible" DECIMAL(5,2) NOT NULL DEFAULT 100,
    "valoracion" DECIMAL(12,2),

    CONSTRAINT "Startup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValoracionHistorica" (
    "id" SERIAL NOT NULL,
    "startupId" INTEGER NOT NULL,
    "valoracion" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValoracionHistorica_pkey" PRIMARY KEY ("id")
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
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tipo_movimiento" "TipoMovimiento" NOT NULL DEFAULT 'inversion',

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
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_movimiento" "TipoMovimiento" NOT NULL DEFAULT 'oferta',
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "termsAcceptedAt" TIMESTAMP(3),

    CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valor_total" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" SERIAL NOT NULL,
    "id_oferta" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "estado" VARCHAR(50) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stripePaymentIntentId" TEXT,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingreso" (
    "id" SERIAL NOT NULL,
    "id_inversion" INTEGER NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripeAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "accountStatus" "Status" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stripeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suscripcion" (
    "id" SERIAL NOT NULL,
    "id_suscriptor" INTEGER NOT NULL,
    "id_suscrito" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_expiracion" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "auto_renovacion" BOOLEAN NOT NULL DEFAULT false,
    "metodo_pago" "MetodoPago" NOT NULL,

    CONSTRAINT "Suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seguimiento" (
    "id" SERIAL NOT NULL,
    "id_seguidor" INTEGER NOT NULL,
    "id_seguido" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Seguimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "contenido" VARCHAR(255) NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL DEFAULT 'evento',
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mensaje" (
    "id" SERIAL NOT NULL,
    "contenido" TEXT NOT NULL,
    "id_emisor" INTEGER NOT NULL,
    "id_receptor" INTEGER NOT NULL,
    "fecha_envio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id_grupo" INTEGER,

    CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grupo" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "tipo" "Tipo" NOT NULL DEFAULT 'publico',
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foto_grupo" TEXT,
    "id_usuario" INTEGER NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoUsuario" (
    "id" SERIAL NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "rol" "RolGrupo" NOT NULL DEFAULT 'miembro',

    CONSTRAINT "GrupoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionPermiso" (
    "id" SERIAL NOT NULL,
    "id_grupo" INTEGER NOT NULL,
    "permiso" "Permiso" NOT NULL,
    "abierto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConfiguracionPermiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "fecha_evento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo_movimiento" "TipoMovimiento" NOT NULL DEFAULT 'evento',
    "titulo" VARCHAR(255) NOT NULL,
    "tipo" "Tipo" NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" SERIAL NOT NULL,
    "id_evento" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "fecha_union" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chatbot" (
    "id" SERIAL NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "configuracion" JSONB NOT NULL,

    CONSTRAINT "Chatbot_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "reseñas" (
    "id" SERIAL NOT NULL,
    "id_inversor" INTEGER NOT NULL,
    "id_startup" INTEGER NOT NULL,
    "puntuacion" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "comentario" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reseñas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistUser" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "nombre" TEXT,
    "tipo_usuario" VARCHAR(50) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitlistUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_stripeCustomerId_key" ON "Usuario"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Inversor_id_usuario_key" ON "Inversor"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Startup_id_usuario_key" ON "Startup"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Inversion_id_inversor_id_startup_key" ON "Inversion"("id_inversor", "id_startup");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_id_inversor_key" ON "Portfolio"("id_inversor");

-- CreateIndex
CREATE UNIQUE INDEX "stripeAccount_userId_key" ON "stripeAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "stripeAccount_stripeAccountId_key" ON "stripeAccount"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Seguimiento_id_seguidor_id_seguido_key" ON "Seguimiento"("id_seguidor", "id_seguido");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoUsuario_id_grupo_id_usuario_key" ON "GrupoUsuario"("id_grupo", "id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracionPermiso_id_grupo_permiso_key" ON "ConfiguracionPermiso"("id_grupo", "permiso");

-- CreateIndex
CREATE UNIQUE INDEX "Participante_id_evento_id_usuario_key" ON "Participante"("id_evento", "id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Contacto_id_usuario_key" ON "Contacto"("id_usuario");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistUser_correo_key" ON "WaitlistUser"("correo");

-- AddForeignKey
ALTER TABLE "Inversor" ADD CONSTRAINT "Inversor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioHistorico" ADD CONSTRAINT "PortfolioHistorico_inversorId_fkey" FOREIGN KEY ("inversorId") REFERENCES "Inversor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Startup" ADD CONSTRAINT "Startup_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ValoracionHistorica" ADD CONSTRAINT "ValoracionHistorica_startupId_fkey" FOREIGN KEY ("startupId") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inversion" ADD CONSTRAINT "Inversion_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portfolio" ADD CONSTRAINT "Portfolio_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_id_oferta_fkey" FOREIGN KEY ("id_oferta") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ingreso" ADD CONSTRAINT "Ingreso_id_inversion_fkey" FOREIGN KEY ("id_inversion") REFERENCES "Inversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stripeAccount" ADD CONSTRAINT "stripeAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_id_suscriptor_fkey" FOREIGN KEY ("id_suscriptor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_id_suscrito_fkey" FOREIGN KEY ("id_suscrito") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_id_seguido_fkey" FOREIGN KEY ("id_seguido") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_id_seguidor_fkey" FOREIGN KEY ("id_seguidor") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_id_emisor_fkey" FOREIGN KEY ("id_emisor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mensaje" ADD CONSTRAINT "Mensaje_id_receptor_fkey" FOREIGN KEY ("id_receptor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoUsuario" ADD CONSTRAINT "GrupoUsuario_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoUsuario" ADD CONSTRAINT "GrupoUsuario_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfiguracionPermiso" ADD CONSTRAINT "ConfiguracionPermiso_id_grupo_fkey" FOREIGN KEY ("id_grupo") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_id_evento_fkey" FOREIGN KEY ("id_evento") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chatbot" ADD CONSTRAINT "Chatbot_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reseñas" ADD CONSTRAINT "reseñas_id_inversor_fkey" FOREIGN KEY ("id_inversor") REFERENCES "Inversor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reseñas" ADD CONSTRAINT "reseñas_id_startup_fkey" FOREIGN KEY ("id_startup") REFERENCES "Startup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
