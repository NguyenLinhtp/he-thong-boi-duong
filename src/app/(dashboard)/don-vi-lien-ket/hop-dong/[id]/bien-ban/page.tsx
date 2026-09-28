import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { duLieuBienBanThanhLy, NHAN_PHAN_LOAI } from "@/server/services/dvlk/dvlk-06-thanh-ly";
import { layThamSo } from "@/server/services/qt/qt-05-tham-so";
import { LoiDonViLienKet } from "@/server/services/dvlk/loi-dvlk";
import { NutIn } from "@/app/(dashboard)/khoa-hoc/[id]/chung-chi/in/nut-in";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { dinhDangTien } from "../../../nhan";

// DVLK-06: biên bản thanh lý hợp đồng - trang HTML in được (Ctrl+P / Lưu PDF), số liệu chốt lúc thanh lý
export default async function BienBanThanhLyPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("DVLK-03");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  let duLieu;
  try {
    duLieu = await duLieuBienBanThanhLy(id);
  } catch (error) {
    if (error instanceof LoiDonViLienKet) return <KhongCoQuyen thongBao={error.message} />;
    throw error;
  }
  const { hopDong, dong } = duLieu;
  const tenCoQuan = (await layThamSo("CC_TEN_CO_QUAN_CAP")) ?? "CƠ SỞ ĐÀO TẠO, BỒI DƯỠNG";
  const dsHopLe = dong.filter((d) => d.hopLe);

  return (
    <main className="flex flex-col items-center gap-6 p-6 print:p-0">
      <div className="print:hidden">
        <NutIn />
      </div>
      <article className="flex w-full max-w-3xl flex-col gap-3 p-8 text-sm">
        <div className="flex justify-between text-center">
          <p className="font-semibold uppercase">{tenCoQuan}</p>
          <div>
            <p className="font-semibold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p>Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>
        <h1 className="mt-4 text-center text-lg font-bold uppercase">Biên bản thanh lý hợp đồng liên kết tuyển sinh</h1>
        <p className="text-center">
          Số: {hopDong.soBienBanThanhLy} · Hợp đồng {hopDong.maHopDong}
        </p>
        <p>
          Hôm nay, ngày {hopDong.ngayQuyetToan?.toLocaleDateString("vi-VN")}, hai bên gồm {tenCoQuan} và đơn vị liên
          kết <b>{hopDong.donViLienKet.ten}</b>
          {hopDong.donViLienKet.nguoiDaiDien ? ` (đại diện: ${hopDong.donViLienKet.nguoiDaiDien})` : ""} thống nhất thanh
          lý hợp đồng liên kết tuyển sinh khóa <b>{hopDong.khoa.maKhoa}</b> - {hopDong.khoa.chuongTrinh.ten} như sau:
        </p>
        <ol className="list-decimal pl-6">
          <li>Số học viên dự kiến theo hợp đồng: {hopDong.soLuongDuKien ?? "—"}</li>
          <li>
            Số học viên thực tế (hợp lệ): {hopDong.soLuongThucTe}, trong đó hoàn thành: {hopDong.soHocVienHoanThanh},
            thôi học: {hopDong.soHocVienThoiHoc}
          </li>
          <li>Đơn giá thỏa thuận: {dinhDangTien(hopDong.donGiaThoaThuan)}/học viên</li>
          <li>
            Số tiền quyết toán: <b>{dinhDangTien(hopDong.soTienQuyetToan)}</b>
          </li>
          {hopDong.ghiChuThanhLy && <li>Ghi chú: {hopDong.ghiChuThanhLy}</li>}
        </ol>
        <p className="mt-2 font-semibold">Danh sách học viên hợp lệ thuộc hợp đồng</p>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {["STT", "Mã học viên", "Họ tên", "Điểm tổng kết", "Kết quả"].map((t) => (
                <th key={t} className="border px-2 py-1">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dsHopLe.map((d, i) => (
              <tr key={d.dangKyId}>
                <td className="border px-2 py-1">{i + 1}</td>
                <td className="border px-2 py-1">{d.maHocVien}</td>
                <td className="border px-2 py-1">{d.hoTen}</td>
                <td className="border px-2 py-1">{d.diemTongKet ?? "—"}</td>
                <td className="border px-2 py-1">{NHAN_PHAN_LOAI[d.phanLoai]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-8 flex justify-between text-center">
          <div>
            <p className="font-semibold">ĐẠI DIỆN ĐƠN VỊ LIÊN KẾT</p>
            <p className="mt-16">{hopDong.donViLienKet.nguoiDaiDien ?? ""}</p>
          </div>
          <div>
            <p className="font-semibold">ĐẠI DIỆN {tenCoQuan.toUpperCase()}</p>
            <p className="mt-16">{hopDong.nguoiThanhLy ?? ""}</p>
          </div>
        </div>
      </article>
    </main>
  );
}
