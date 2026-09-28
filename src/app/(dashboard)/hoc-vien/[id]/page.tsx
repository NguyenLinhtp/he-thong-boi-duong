import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layHoSoHocVien, phamViHoSoHocVien } from "@/server/services/hv/hv-08-ho-so-hoc-vien";
import { KhongTimThayHocVienError, NgoaiPhamViHoSoHocVienError } from "@/server/services/hv/loi-hoc-vien";
import { danhSachChucDanhHocVi } from "@/server/services/dm/dm-02-chuc-danh-hoc-vi";
import { danhSachThongBaoCuaHocVien } from "@/server/services/hv/hv-10-thong-bao";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { NhanTrangThai } from "@/components/chung/nhan-trang-thai";
import { FormSuaHoSo } from "./form-sua-ho-so";

const NHAN_LOAI_SU_KIEN: Record<string, string> = {
  TRUNG_TUYEN: "Trúng tuyển",
  NHAC_NOP_HO_SO_GIAY: "Nhắc nộp hồ sơ giấy",
  LICH_HOC_LICH_THI: "Lịch học/lịch thi",
  NHAC_HOC_PHI: "Nhắc học phí",
  KET_QUA: "Kết quả",
  CAP_CHUNG_CHI: "Cấp chứng chỉ",
};

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

const NHAN_TRANG_THAI_DANG_KY: Record<string, string> = {
  CHO_NOP_GIAY: "Chờ nộp bản giấy",
  DA_NOP_GIAY: "Đã nộp bản giấy - chờ duyệt",
  HUY_QUA_HAN_NOP_GIAY: "Hủy (quá hạn nộp giấy)",
  CHO_TU_XAC_NHAN: "Chờ tự xác nhận",
  DA_XAC_NHAN_THAM_GIA: "Đã xác nhận tham gia",
  CHO_DUYET: "Chờ duyệt",
  HOP_LE: "Hợp lệ",
  KHONG_HOP_LE: "Không hợp lệ",
  CHINH_THUC: "Chính thức",
  HOAN_THANH: "Hoàn thành",
  THOI_HOC: "Thôi học",
};

export default async function ChiTietHocVienPage({ params }: { params: Promise<{ id: string }> }) {
  let phien;
  try {
    phien = await requirePermission("HV-08");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const phamVi = await phamViHoSoHocVien(phien.userId);
  let hocVien;
  try {
    hocVien = await layHoSoHocVien(id, phamVi);
  } catch (error) {
    if (error instanceof KhongTimThayHocVienError) notFound();
    if (error instanceof NgoaiPhamViHoSoHocVienError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const dsChucDanhHocVi = await danhSachChucDanhHocVi();

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <h1 className="text-xl font-bold text-ued-blue-dam">
        {hocVien.maHocVien} · {hocVien.hoTen}
      </h1>

      <FormSuaHoSo
        hocVien={hocVien}
        hocVienTuCapNhat={!phamVi.toanBo}
        dsChucDanhHocVi={dsChucDanhHocVi.map((cd) => ({ id: cd.id, ten: cd.ten }))}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold text-ued-blue-dam">Lịch sử các khóa/kỳ thi đã hoặc đang tham gia</h2>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã khóa</TableHead>
              <TableHead>Chương trình</TableHead>
              <TableHead>Ngày đăng ký</TableHead>
              <TableHead>Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hocVien.dangKys.map((dk) => (
              <TableRow key={dk.id}>
                <TableCell>{dk.khoa.maKhoa}</TableCell>
                <TableCell>{dk.khoa.chuongTrinh.ten}</TableCell>
                <TableCell>{new Date(dk.ngayDangKy).toLocaleDateString("vi-VN")}</TableCell>
                <TableCell><NhanTrangThai ma={dk.trangThai}>{NHAN_TRANG_THAI_DANG_KY[dk.trangThai] ?? dk.trangThai}</NhanTrangThai></TableCell>
              </TableRow>
            ))}
            {hocVien.dangKys.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Học viên chưa tham gia khóa/kỳ thi nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>

      {(await coQuyen("HV-10")) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-bold text-ued-blue-dam">HV-10 · Nhật ký thông báo đã gửi</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Sự kiện</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(await danhSachThongBaoCuaHocVien(hocVien.id)).map((tb) => (
                <TableRow key={tb.id}>
                  <TableCell>{new Date(tb.createdAt).toLocaleString("vi-VN")}</TableCell>
                  <TableCell>{NHAN_LOAI_SU_KIEN[tb.loaiSuKien] ?? tb.loaiSuKien}</TableCell>
                  <TableCell>{tb.tieuDe}</TableCell>
                  <TableCell>
                    {tb.daGuiEmail ? (
                      <span className="text-emerald-600">Đã gửi</span>
                    ) : (
                      <span className="text-muted-foreground">{tb.loiGuiEmail ?? "Chưa gửi"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </main>
  );
}
