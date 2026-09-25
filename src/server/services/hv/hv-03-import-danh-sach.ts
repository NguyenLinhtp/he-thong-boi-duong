import { prisma } from "@/lib/db/prisma";
import { timHoacTaoHocVien } from "@/server/services/hv/dung-chung";
import {
  KhongTimThayKhoaError,
  SaiPhuongThucDangKyError,
  KhoaKhongConNhanImportError,
  ImportVuotSiSoToiDaError,
  DuLieuImportLoiError,
  FileImportRongError,
  type DongLoiImport,
} from "@/server/services/hv/loi-hoc-vien";

/** Parse 1 dòng CSV, hỗ trợ trường bọc dấu ngoặc kép chứa dấu phẩy. */
function parseCsvLine(dong: string): string[] {
  const ketQua: string[] = [];
  let hienTai = "";
  let trongDauNhay = false;

  for (let i = 0; i < dong.length; i++) {
    const ky = dong[i];
    if (trongDauNhay) {
      if (ky === '"') {
        if (dong[i + 1] === '"') {
          hienTai += '"';
          i++;
        } else {
          trongDauNhay = false;
        }
      } else {
        hienTai += ky;
      }
    } else if (ky === '"') {
      trongDauNhay = true;
    } else if (ky === ",") {
      ketQua.push(hienTai);
      hienTai = "";
    } else {
      hienTai += ky;
    }
  }
  ketQua.push(hienTai);
  return ketQua.map((c) => c.trim());
}

type DongHopLe = {
  soDong: number;
  hoTen: string;
  soCCCD: string;
  donViCongTac?: string;
  soDienThoai?: string;
  email?: string;
};

/**
 * HV-03: cột theo đúng thứ tự "họ tên, CCCD/mã số, đơn vị công tác..." -
 * hoTen,soCCCD,donViCongTac,soDienThoai,email (bỏ dòng tiêu đề đầu tiên).
 */
function phanTichVaKiemTraCsv(noiDungCsv: string): { hopLe: DongHopLe[]; loi: DongLoiImport[] } {
  const dsDong = noiDungCsv.split(/\r?\n/).filter((d) => d.trim().length > 0);
  if (dsDong.length <= 1) throw new FileImportRongError();

  const hopLe: DongHopLe[] = [];
  const loi: DongLoiImport[] = [];
  const cccdDaGapTrongFile = new Set<string>();

  dsDong.slice(1).forEach((dong, idx) => {
    const soDong = idx + 2; // +2: bỏ dòng tiêu đề (dòng 1) + idx bắt đầu từ 0
    const [hoTen, soCCCD, donViCongTac, soDienThoai, email] = parseCsvLine(dong);

    if (!hoTen) {
      loi.push({ dong: soDong, loi: "Thiếu họ tên" });
      return;
    }
    if (!soCCCD) {
      loi.push({ dong: soDong, loi: "Thiếu CCCD/mã số" });
      return;
    }
    if (cccdDaGapTrongFile.has(soCCCD)) {
      loi.push({ dong: soDong, loi: `Trùng CCCD/mã số "${soCCCD}" với 1 dòng khác trong file` });
      return;
    }
    cccdDaGapTrongFile.add(soCCCD);

    hopLe.push({
      soDong,
      hoTen,
      soCCCD,
      donViCongTac: donViCongTac || undefined,
      soDienThoai: soDienThoai || undefined,
      email: email || undefined,
    });
  });

  return { hopLe, loi };
}

/**
 * HV-03 (Phương thức 2): import "trước khi mở đăng ký" - chỉ chặn khi khóa
 * đã qua hẳn giai đoạn tuyển sinh (Đang diễn ra/Đã kết thúc/Hủy), vẫn cho
 * phép ở Chuẩn bị lẫn Đang tuyển sinh.
 */
export async function importDanhSachHocVien(khoaId: string, noiDungCsv: string) {
  const khoa = await prisma.khoa.findUnique({
    where: { id: khoaId },
    include: { chuongTrinh: true },
  });
  if (!khoa) throw new KhongTimThayKhoaError();

  if (khoa.chuongTrinh.phuongThucDangKy !== "IMPORT_TU_XAC_NHAN") {
    throw new SaiPhuongThucDangKyError("Phương thức 2 (import danh sách, học viên tự xác nhận)");
  }
  if (["DANG_DIEN_RA", "DA_KET_THUC", "HUY"].includes(khoa.trangThai)) {
    throw new KhoaKhongConNhanImportError();
  }

  const { hopLe, loi } = phanTichVaKiemTraCsv(noiDungCsv);

  const soDongDaDangKy = new Set<number>();
  for (const hang of hopLe) {
    const hocVienDaTonTai = await prisma.hocVien.findUnique({ where: { soCCCD: hang.soCCCD } });
    if (hocVienDaTonTai) {
      const daDangKyKhoaNay = await prisma.dangKyHoc.findUnique({
        where: { hocVienId_khoaId: { hocVienId: hocVienDaTonTai.id, khoaId } },
      });
      if (daDangKyKhoaNay) {
        soDongDaDangKy.add(hang.soDong);
        loi.push({
          dong: hang.soDong,
          loi: `CCCD/mã số "${hang.soCCCD}" đã có trong danh sách của khóa này (có thể đã import trước đó)`,
        });
      }
    }
  }

  if (loi.length > 0) throw new DuLieuImportLoiError(loi.sort((a, b) => a.dong - b.dong));

  const siSoHienTai = await prisma.dangKyHoc.count({
    where: { khoaId, trangThai: { notIn: ["KHONG_HOP_LE", "THOI_HOC"] } },
  });
  const soDongMoiThucSu = hopLe.filter((h) => !soDongDaDangKy.has(h.soDong)).length;
  const choConLai = khoa.siSoToiDa - siSoHienTai;
  if (soDongMoiThucSu > choConLai) {
    throw new ImportVuotSiSoToiDaError(Math.max(choConLai, 0));
  }

  const ketQua = [];
  for (const hang of hopLe) {
    const hocVien = await timHoacTaoHocVien({
      hoTen: hang.hoTen,
      soCCCD: hang.soCCCD,
      donViCongTac: hang.donViCongTac,
      soDienThoai: hang.soDienThoai,
      email: hang.email,
    });
    ketQua.push(
      await prisma.dangKyHoc.create({
        data: { hocVienId: hocVien.id, khoaId, trangThai: "CHO_TU_XAC_NHAN" },
        include: { hocVien: true },
      }),
    );
  }

  return ketQua;
}

export async function danhSachChoTuXacNhan(khoaId: string) {
  return prisma.dangKyHoc.findMany({
    where: { khoaId, trangThai: "CHO_TU_XAC_NHAN" },
    include: { hocVien: true },
    orderBy: { ngayDangKy: "asc" },
  });
}
