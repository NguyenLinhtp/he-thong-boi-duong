import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { layKhoa } from "@/server/services/kh/kh-01-khoi-tao-khoa";
import { hocVienTinhKetQua, laKhoaChiDuThi } from "@/server/services/kq/dung-chung";
import { bangDiemChiTietKhoa, bangTongHopKetQua } from "@/server/services/kq/kq-02-tong-hop";
import { TableHeader, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { KhongCoQuyen } from "@/components/chung/khong-co-quyen";
import { DauTrangKhoa } from "@/components/khoa/dau-trang-khoa";
import { NutTongHop, NutXetHoanThanh, FormPheDuyet, FormKetQuaThi, FormPhucKhao } from "./cac-form";
import { BangPhanTrang } from "@/components/chung/bang-phan-trang";

async function coQuyen(maCN: string): Promise<boolean> {
  try {
    await requirePermission(maCN);
    return true;
  } catch (error) {
    if (error instanceof KhongCoQuyenError) return false;
    throw error;
  }
}

function nhanHoanThanh(hoanThanh: boolean | null) {
  if (hoanThanh === null) return "Chưa xét";
  return hoanThanh ? "Đủ điều kiện" : "Không đủ điều kiện";
}

export default async function KetQuaKhoaPage({ params }: { params: Promise<{ id: string }> }) {
  let quyen;
  try {
    // trang dùng chung KQ-02/03/04/06 - vào được khi có ít nhất 1 quyền (vd Cán
    // bộ tài chính chỉ có KQ-03), từng khối thao tác hiện theo đúng quyền riêng.
    const [kq02, kq03, kq04, kq06] = await Promise.all(
      ["KQ-02", "KQ-03", "KQ-04", "KQ-06"].map(coQuyen),
    );
    if (!kq02 && !kq03 && !kq04 && !kq06) await requirePermission("KQ-03");
    quyen = { kq02, kq03, kq04, kq06 };
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <KhongCoQuyen thongBao={error.message} />;
    }
    throw error;
  }

  const { id } = await params;
  const khoa = await layKhoa(id);
  if (!khoa) notFound();

  const chiDuThi = laKhoaChiDuThi(khoa);
  const [dsDangKy, dsDiem, dsTongHop] = await Promise.all([
    hocVienTinhKetQua(id),
    bangDiemChiTietKhoa(id),
    bangTongHopKetQua(id),
  ]);
  const daPheDuyet = dsTongHop.some((kq) => kq.daPheDuyet);
  const quyetDinh = dsTongHop.find((kq) => kq.daPheDuyet);
  const tongHopTheoHocVien = new Map(dsTongHop.map((kq) => [kq.hocVienId, kq]));
  // KH-07: lớp chỉ là thông tin hiển thị - kết quả và phê duyệt vẫn theo khóa
  const maLopTheoHocVien = new Map(dsDangKy.map((dk) => [dk.hocVienId, dk.lop?.maLop ?? null]));

  return (
    <main className="flex flex-col gap-6 p-4 md:p-6 lg:px-8">
      <DauTrangKhoa khoa={khoa} dangChon="ket-qua" />
      <div className="rounded-lg border bg-card p-4 shadow-sm text-sm">
        <p>
          {chiDuThi
            ? "Phương thức 3 (chỉ dự thi): kết quả = điểm thi nhập trực tiếp (KQ-06), không tính chuyên cần."
            : "Khóa có giảng dạy: điểm tổng kết = trung bình điểm học phần theo trọng số số tiết, kèm điều kiện chuyên cần."}
        </p>
        <p>
          Trạng thái:{" "}
          {daPheDuyet
            ? `Đã phê duyệt - QĐ ${quyetDinh?.soQuyetDinh} (${quyetDinh?.ngayPheDuyet?.toLocaleDateString("vi-VN")}, ${quyetDinh?.nguoiPheDuyet})`
            : "Chưa phê duyệt"}
        </p>
      </div>

      {chiDuThi ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-06 · Nhập kết quả thi</h2>
          {quyen.kq06 && !daPheDuyet ? (
            <FormKetQuaThi
              khoaId={khoa.id}
              dsThiSinh={dsDangKy.map((dk) => {
                const kq = tongHopTheoHocVien.get(dk.hocVienId);
                return {
                  hocVienId: dk.hocVienId,
                  maHocVien: dk.hocVien.maHocVien,
                  hoTen: dk.hocVien.hoTen,
                  diemThi: kq?.diemTongKet != null ? Number(kq.diemTongKet) : null,
                };
              })}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {daPheDuyet ? "Kết quả đã phê duyệt - sửa qua phúc khảo ở bảng dưới." : "Không có quyền KQ-06."}
            </p>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-01 · Bảng điểm học phần (giảng viên nhập)</h2>
          <BangPhanTrang
            dauBang={
              <TableHeader>
                <TableRow>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Học phần</TableHead>
                  <TableHead>TP</TableHead>
                  <TableHead>KT</TableHead>
                  <TableHead>Điểm HP</TableHead>
                  <TableHead>Phúc khảo</TableHead>
                </TableRow>
              </TableHeader>
            }
            rong={
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  Giảng viên chưa nhập điểm học phần nào
                </TableCell>
              </TableRow>
            }
          >
            {dsDiem.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.hocVien.hoTen}</TableCell>
                <TableCell>{d.hocPhan.ten}</TableCell>
                <TableCell>{d.diemThanhPhan?.toString() ?? "—"}</TableCell>
                <TableCell>{d.diemKetThuc?.toString() ?? "—"}</TableCell>
                <TableCell>{d.diemHocPhan?.toString() ?? "—"}</TableCell>
                <TableCell>
                  {d.soQuyetDinhPhucKhao && (
                    <span className="mr-1 text-xs text-muted-foreground">QĐ {d.soQuyetDinhPhucKhao}</span>
                  )}
                  {quyen.kq04 && d.daPheDuyet && (
                    <FormPhucKhao khoaId={khoa.id} ketQuaId={d.id} loai="hocPhan" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </BangPhanTrang>
          {quyen.kq02 && !daPheDuyet && <NutTongHop khoaId={khoa.id} />}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-ued-blue-dam">KQ-02/03 · Kết quả toàn khóa và điều kiện hoàn thành</h2>
        <BangPhanTrang
          dauBang={
            <TableHeader>
              <TableRow>
                <TableHead>Học viên</TableHead>
                <TableHead>{chiDuThi ? "Điểm thi" : "Điểm tổng kết"}</TableHead>
                {!chiDuThi && <TableHead>Chuyên cần</TableHead>}
                <TableHead>Học tập</TableHead>
                <TableHead>Học phí (HP-06)</TableHead>
                <TableHead>Hoàn thành</TableHead>
                <TableHead>Ghi chú</TableHead>
                {chiDuThi && <TableHead>Phúc khảo</TableHead>}
              </TableRow>
            </TableHeader>
          }
          rong={
            <TableRow>
              <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                Chưa có kết quả toàn khóa - {chiDuThi ? "nhập kết quả thi (KQ-06)" : "bấm tổng hợp (KQ-02)"} trước
              </TableCell>
            </TableRow>
          }
        >
          {dsTongHop.map((kq) => (
            <TableRow key={kq.id}>
              <TableCell>
                {kq.hocVien.hoTen}
                {maLopTheoHocVien.get(kq.hocVienId) && (
                  <span className="ml-1 text-xs text-muted-foreground">({maLopTheoHocVien.get(kq.hocVienId)})</span>
                )}
              </TableCell>
              <TableCell>{kq.diemTongKet?.toString() ?? "—"}</TableCell>
              {!chiDuThi && (
                <TableCell>{kq.tyLeChuyenCan != null ? `${kq.tyLeChuyenCan.toString()}%` : "—"}</TableCell>
              )}
              <TableCell>{kq.datHocTap ? "Đạt" : "Không đạt"}</TableCell>
              <TableCell>
                {kq.duDieuKienHocPhi === null ? "Chưa xét" : kq.duDieuKienHocPhi ? "Hoàn tất" : "Chưa hoàn tất"}
              </TableCell>
              <TableCell>{nhanHoanThanh(kq.hoanThanh)}</TableCell>
              <TableCell className="text-xs">{kq.ghiChu ?? ""}</TableCell>
              {chiDuThi && (
                <TableCell>
                  {quyen.kq04 && kq.daPheDuyet && (
                    <FormPhucKhao khoaId={khoa.id} ketQuaId={kq.id} loai="thi" />
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </BangPhanTrang>
        {quyen.kq03 && !daPheDuyet && <NutXetHoanThanh khoaId={khoa.id} />}
      </section>

      {quyen.kq04 && !daPheDuyet && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-ued-blue-dam">KQ-04 · Phê duyệt kết quả cuối cùng</h2>
          <FormPheDuyet khoaId={khoa.id} />
        </section>
      )}
    </main>
  );
}
