import { prisma } from "@/lib/db/prisma";
import { canTaiKhoanKhiDangKy } from "@/lib/form-dang-ky";
import { coTheNhanDangKy, siSoHienTai } from "@/server/services/kh/kh-05-trang-thai-si-so";

/**
 * (bổ sung 01/10/2026 - KH-06) Trang chủ công khai: các chương trình đang có
 * khóa mở đăng ký, hiển thị dạng khối; chọn chương trình -> danh sách khóa
 * đang mở -> trang đăng ký của khóa. Chỉ lộ thông tin tuyển sinh công khai
 * (tên, mục tiêu, đối tượng, lịch, lệ phí, số chỗ còn lại).
 */
async function khoaDangMo(chuongTrinhId?: string) {
  const ds = await prisma.khoa.findMany({
    where: {
      trangThai: "DANG_TUYEN_SINH",
      chuongTrinh: { trangThai: "DA_BAN_HANH", ...(chuongTrinhId ? { id: chuongTrinhId } : {}) },
      OR: [{ hanDangKy: null }, { hanDangKy: { gte: new Date() } }],
    },
    include: { chuongTrinh: { include: { loaiHinhBoiDuong: true } } },
    orderBy: [{ hanDangKy: "asc" }, { thoiGianKhaiGiang: "asc" }],
  });
  const conMo = await Promise.all(ds.map((k) => coTheNhanDangKy(k.id)));
  return ds.filter((_, i) => conMo[i]);
}

export async function chuongTrinhDangMoDangKy() {
  const theoCt = new Map<string, Awaited<ReturnType<typeof khoaDangMo>>>();
  for (const k of await khoaDangMo()) theoCt.set(k.chuongTrinhId, [...(theoCt.get(k.chuongTrinhId) ?? []), k]);
  return [...theoCt.values()].map((dsKhoa) => {
    const ct = dsKhoa[0].chuongTrinh;
    const phi = dsKhoa.map((k) => (k.mucHocPhi === null ? null : Number(k.mucHocPhi))).filter((x): x is number => x !== null);
    const han = dsKhoa.map((k) => k.hanDangKy).filter((x): x is Date => x !== null);
    return {
      maCT: ct.maCT,
      ten: ct.ten,
      mucTieu: ct.mucTieu,
      doiTuong: ct.doiTuongApDung,
      loaiHinh: ct.loaiHinhBoiDuong.ten,
      laDuThi: ct.phuongThucDangKy === "CHI_DU_THI",
      canTaiKhoan: canTaiKhoanKhiDangKy(ct.phuongThucDangKy),
      soKhoa: dsKhoa.length,
      phiThapNhat: phi.length ? Math.min(...phi) : null,
      hanGanNhat: han.length ? new Date(Math.min(...han.map((h) => h.getTime()))) : null,
    };
  });
}

export async function chuongTrinhCongKhai(maCT: string) {
  const ct = await prisma.chuongTrinh.findUnique({ where: { maCT }, include: { loaiHinhBoiDuong: true } });
  if (!ct || ct.trangThai !== "DA_BAN_HANH") return null;
  const dsKhoa = await khoaDangMo(ct.id);
  const siSo = await Promise.all(dsKhoa.map((k) => siSoHienTai(k.id)));
  return {
    ct,
    laDuThi: ct.phuongThucDangKy === "CHI_DU_THI",
    canTaiKhoan: canTaiKhoanKhiDangKy(ct.phuongThucDangKy),
    dsKhoa: dsKhoa.map((k, i) => ({
      maKhoa: k.maKhoa,
      khaiGiang: k.thoiGianKhaiGiang,
      beGiang: k.thoiGianBeGiang,
      hanDangKy: k.hanDangKy,
      mucHocPhi: k.mucHocPhi === null ? null : Number(k.mucHocPhi),
      // (bổ sung 01/10/2026) lệ phí thí sinh tự do (khóa dự thi); null = như sinh viên
      mucHocPhiTuDo: k.mucHocPhiTuDo === null ? null : Number(k.mucHocPhiTuDo),
      hinhThuc: k.hinhThucGiangDay,
      conCho: Math.max(k.siSoToiDa - siSo[i], 0),
    })),
  };
}
