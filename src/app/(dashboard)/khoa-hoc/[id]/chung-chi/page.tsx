import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { xetDeNghiCapChungChi, danhSachChungChiCuaKhoa } from "@/server/services/cc/cc-01-de-nghi";
import { hopDongChoBanGiao } from "@/server/services/cc/cc-04-so-cap";
import { ChuaPheDuyetKetQuaError } from "@/server/services/cc/loi-chung-chi";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import {
  NutLapDeNghi,
  NutSinhSoHieu,
  NutHuyChungChi,
  FormKyDuyet,
  NutTraTrucTiep,
  FormBanGiaoLo,
} from "./cac-form";
import { NHAN_TRANG_THAI_CHUNG_CHI, NHAN_KENH_NHAN } from "./nhan";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

const TRANG_THAI_HUY_DUOC = ["DE_NGHI", "CHO_KY_DUYET", "DA_KY_DUYET"];

export default async function ChungChiKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("CC-01");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  let xet;
  try {
    xet = await xetDeNghiCapChungChi(id);
  } catch (error) {
    if (!(error instanceof ChuaPheDuyetKetQuaError)) throw error;
    xet = null;
  }
  const [dsChungChi, dsHopDong, choPhepCC02, choPhepCC03, choPhepCC04] = await Promise.all([
    danhSachChungChiCuaKhoa(id),
    hopDongChoBanGiao(id),
    coQuyen("CC-02"),
    coQuyen("CC-03"),
    coQuyen("CC-04"),
  ]);
  // học viên do ĐVLK tuyển sinh chỉ nhận qua lô bàn giao, không trao trực tiếp
  const hocVienQuaDvlk = new Set(dsHopDong.flatMap((hd) => hd.hocVienIds));
  const soChoKy = dsChungChi.filter((cc) => cc.trangThai === "CHO_KY_DUYET").length;
  const soDeNghi = dsChungChi.filter((cc) => cc.trangThai === "DE_NGHI").length;
  const coChungChiDeIn = dsChungChi.some((cc) => cc.soHieu && cc.trangThai !== "DA_HUY");

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">CC · Chứng chỉ khóa {khoa.maKhoa}</h1>
        <a href={`/khoa-hoc/${khoa.id}`} className="text-sm underline">
          Về trang khóa
        </a>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">CC-01 · Lập danh sách đề nghị cấp chứng chỉ</h2>
        <p className="text-sm text-muted-foreground">
          Đủ điều kiện = kết quả đã phê duyệt (KQ-04) đạt học tập/thi <b>và</b> hoàn tất tài chính:
          học phí cá nhân đã nộp đủ, hoặc - với học viên do đơn vị liên kết tuyển sinh - hợp đồng
          liên kết đã thanh lý. Điều kiện tài chính được kiểm tra lại mỗi lần mở trang, nên học
          viên qua đơn vị liên kết sẽ tự xuất hiện ở đây ngay khi hợp đồng được thanh lý.
        </p>
        {!xet ? (
          <p className="rounded-lg border p-4 text-sm text-destructive">
            Kết quả khóa chưa được phê duyệt (KQ-04) - chưa lập được danh sách đề nghị.
          </p>
        ) : (
          <>
            <NutLapDeNghi khoaId={khoa.id} soDuDieuKien={xet.duDieuKien.length} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Điểm tổng kết</TableHead>
                  <TableHead>Xét đề nghị</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {xet.duDieuKien.map((kq) => (
                  <TableRow key={kq.id}>
                    <TableCell>{kq.hocVien.hoTen}</TableCell>
                    <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
                    <TableCell>Đủ điều kiện</TableCell>
                  </TableRow>
                ))}
                {xet.khongDuDieuKien.map((kq) => (
                  <TableRow key={kq.id}>
                    <TableCell>{kq.hocVien.hoTen}</TableCell>
                    <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
                    <TableCell className="text-destructive">{kq.lyDo}</TableCell>
                  </TableRow>
                ))}
                {xet.daCoChungChi.map((kq) => (
                  <TableRow key={kq.id}>
                    <TableCell>{kq.hocVien.hoTen}</TableCell>
                    <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      Đã có: {NHAN_TRANG_THAI_CHUNG_CHI[kq.trangThaiChungChi]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </section>

      {choPhepCC02 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">CC-02 · Sinh số hiệu và in chứng chỉ</h2>
          <p className="text-sm text-muted-foreground">
            Số hiệu tăng dần theo năm, không trùng; số của chứng chỉ đã hủy không bao giờ được cấp
            lại. Điều kiện cấp được kiểm tra lại ngay trước khi cấp số.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <NutSinhSoHieu khoaId={khoa.id} soDeNghi={soDeNghi} />
            {coChungChiDeIn && (
              <a href={`/khoa-hoc/${khoa.id}/chung-chi/in`} target="_blank" className="text-sm underline">
                In tất cả chứng chỉ đã có số hiệu
              </a>
            )}
          </div>
        </section>
      )}

      {choPhepCC03 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">CC-03 · Ký duyệt</h2>
          <p className="text-sm text-muted-foreground">
            Ghi nhận việc lãnh đạo ký, đóng dấu (số quyết định, ngày ký, người ký). Chỉ chứng chỉ đã
            ký duyệt mới được trả cho học viên (CC-04).
          </p>
          <FormKyDuyet khoaId={khoa.id} soChoKy={soChoKy} />
        </section>
      )}

      {choPhepCC04 && dsHopDong.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">CC-04 · Bàn giao theo lô về đơn vị liên kết</h2>
          <p className="text-sm text-muted-foreground">
            Chứng chỉ của học viên do đơn vị liên kết tuyển sinh chỉ được bàn giao theo lô, sau khi
            hợp đồng liên kết đã thanh lý. Học viên tự đăng ký nhận trực tiếp ở bảng dưới.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hợp đồng</TableHead>
                <TableHead>Đơn vị liên kết</TableHead>
                <TableHead>Các lô đã giao</TableHead>
                <TableHead>Bàn giao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dsHopDong.map((hd) => (
                <TableRow key={hd.id}>
                  <TableCell className="font-mono">{hd.maHopDong}</TableCell>
                  <TableCell>{hd.donViLienKet.ten}</TableCell>
                  <TableCell className="text-xs">
                    {hd.banGiaos.length === 0
                      ? "—"
                      : hd.banGiaos
                          .map((lo) => `${lo.maLo} (${lo.ngayBanGiao.toLocaleDateString("vi-VN")}, ${lo.nguoiDaiDienNhan})`)
                          .join("; ")}
                  </TableCell>
                  <TableCell>
                    <FormBanGiaoLo
                      khoaId={khoa.id}
                      hopDongLienKetId={hd.id}
                      soChoBanGiao={hd.soChoBanGiao}
                      daThanhLy={hd.trangThai === "DA_THANH_LY"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Chứng chỉ của khóa</h2>
          {choPhepCC04 && (
            <a href="/chung-chi/so-cap" className="text-sm underline">
              Sổ cấp chứng chỉ (CC-04)
            </a>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số hiệu</TableHead>
              <TableHead>Học viên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dsChungChi.map((cc) => (
              <TableRow key={cc.id}>
                <TableCell className="font-mono">{cc.soHieu ?? "—"}</TableCell>
                <TableCell>{cc.hocVien.hoTen}</TableCell>
                <TableCell>
                  {NHAN_TRANG_THAI_CHUNG_CHI[cc.trangThai]}
                  {cc.soQuyetDinh && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (QĐ {cc.soQuyetDinh}, {cc.nguoiKy})
                    </span>
                  )}
                  {cc.trangThai === "DA_CAP" && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      - sổ {cc.soVaoSo}, {cc.kenhNhan ? NHAN_KENH_NHAN[cc.kenhNhan] : ""}
                      {cc.banGiao ? ` lô ${cc.banGiao.maLo}` : ""}, {cc.ngayNhan?.toLocaleDateString("vi-VN")}
                    </span>
                  )}
                  {cc.trangThai === "DA_HUY" && (
                    <span className="ml-1 text-xs text-muted-foreground">({cc.lyDoHuy})</span>
                  )}
                </TableCell>
                <TableCell className="flex flex-wrap gap-1.5">
                  {cc.soHieu && cc.trangThai !== "DA_HUY" && (
                    <a href={`/khoa-hoc/${khoa.id}/chung-chi/in?ids=${cc.id}`} target="_blank" className="text-sm underline">
                      In
                    </a>
                  )}
                  {choPhepCC04 && cc.trangThai === "DA_KY_DUYET" && !hocVienQuaDvlk.has(cc.hocVienId) && (
                    <NutTraTrucTiep khoaId={khoa.id} chungChiId={cc.id} hoTen={cc.hocVien.hoTen} />
                  )}
                  {choPhepCC02 && TRANG_THAI_HUY_DUOC.includes(cc.trangThai) && (
                    <NutHuyChungChi khoaId={khoa.id} chungChiId={cc.id} soHieu={cc.soHieu} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {dsChungChi.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Chưa có chứng chỉ nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
