-- CreateEnum
CREATE TYPE "TrangThaiHopTac" AS ENUM ('DANG_HOP_TAC', 'TAM_NGUNG');

-- AlterTable
ALTER TABLE "don_vi_lien_ket" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "trangThaiHopTac" "TrangThaiHopTac" NOT NULL DEFAULT 'DANG_HOP_TAC';
