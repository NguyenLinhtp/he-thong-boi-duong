-- AlterTable
ALTER TABLE "dang_ky_hoc" ADD COLUMN     "phuongThuc" "PhuongThucDangKy";

-- Điền phương thức cho hồ sơ đã có: qua đơn vị liên kết -> PT4; khóa dự thi -> PT3;
-- có hạn nộp giấy (HV-01) -> PT1; đang/đã tự xác nhận theo danh sách import -> PT2;
-- khóa chỉ mở 1 phương thức -> phương thức đó. Còn lại (cán bộ thêm/chuyển khóa) để trống.
UPDATE "dang_ky_hoc" SET "phuongThuc" = 'QUA_DON_VI_LIEN_KET' WHERE "hopDongLienKetId" IS NOT NULL;
UPDATE "dang_ky_hoc" d SET "phuongThuc" = 'CHI_DU_THI'
  FROM "khoa" k JOIN "chuong_trinh" c ON c."id" = k."chuongTrinhId"
  WHERE d."khoaId" = k."id" AND d."phuongThuc" IS NULL AND 'CHI_DU_THI' = ANY(c."phuongThucDangKys");
UPDATE "dang_ky_hoc" SET "phuongThuc" = 'TRUC_TUYEN_NOP_GIAY' WHERE "phuongThuc" IS NULL AND "hanNopGiay" IS NOT NULL;
UPDATE "dang_ky_hoc" SET "phuongThuc" = 'IMPORT_TU_XAC_NHAN' WHERE "phuongThuc" IS NULL AND "trangThai" IN ('CHO_TU_XAC_NHAN', 'DA_XAC_NHAN_THAM_GIA');
UPDATE "dang_ky_hoc" d SET "phuongThuc" = c."phuongThucDangKys"[1]
  FROM "khoa" k JOIN "chuong_trinh" c ON c."id" = k."chuongTrinhId"
  WHERE d."khoaId" = k."id" AND d."phuongThuc" IS NULL AND cardinality(c."phuongThucDangKys") = 1;
