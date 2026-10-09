-- (08/10/2026 - CT-07) chương trình chọn được nhiều phương thức đăng ký: chuyển cột đơn sang mảng, giữ dữ liệu cũ
ALTER TABLE "chuong_trinh" ADD COLUMN "phuongThucDangKys" "PhuongThucDangKy"[] DEFAULT ARRAY[]::"PhuongThucDangKy"[];
UPDATE "chuong_trinh" SET "phuongThucDangKys" = ARRAY["phuongThucDangKy"] WHERE "phuongThucDangKy" IS NOT NULL;
ALTER TABLE "chuong_trinh" DROP COLUMN "phuongThucDangKy";
