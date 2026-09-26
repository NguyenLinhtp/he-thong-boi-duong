-- CC: tach rieng buoc them gia tri enum - Postgres khong cho dung gia tri enum
-- vua them (DE_NGHI lam default) trong cung transaction voi ADD VALUE.
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TrangThaiChungChi" ADD VALUE 'DE_NGHI';
ALTER TYPE "TrangThaiChungChi" ADD VALUE 'DA_HUY';
