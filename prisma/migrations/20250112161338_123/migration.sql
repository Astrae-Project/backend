-- CreateTable
CREATE TABLE "PortfolioHistorico" (
    "id" SERIAL NOT NULL,
    "inversorId" INTEGER NOT NULL,
    "valorTotal" DECIMAL(12,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioHistorico_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PortfolioHistorico" ADD CONSTRAINT "PortfolioHistorico_inversorId_fkey" FOREIGN KEY ("inversorId") REFERENCES "Inversor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
