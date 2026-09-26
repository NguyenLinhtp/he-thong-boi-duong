-- AlterTable
ALTER TABLE "chung_chi" ADD COLUMN     "maXacThuc" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "chung_chi_maXacThuc_key" ON "chung_chi"("maXacThuc");

-- CC-05: cấp mã xác thực cho văn bằng đã có số hiệu trước khi có tính năng này
UPDATE "chung_chi" SET "maXacThuc" = substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 16)
WHERE "soHieu" IS NOT NULL AND "maXacThuc" IS NULL;
