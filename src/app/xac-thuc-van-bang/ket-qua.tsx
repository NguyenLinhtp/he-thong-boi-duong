import type { KetQuaXacThuc } from "@/server/services/cc/cc-05-xac-thuc";

/** CC-05: hiển thị kết quả xác thực - chỉ thông tin văn bằng, không thông tin cá nhân nhạy cảm. */
export function KetQuaXacThucView({ ketQua }: { ketQua: KetQuaXacThuc }) {
  if (ketQua.trangThai === "KHONG_TIM_THAY") {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="font-semibold text-destructive">Không tìm thấy văn bằng</p>
        <p className="mt-1 text-muted-foreground">
          Không có văn bằng hợp lệ khớp thông tin đã nhập. Vui lòng kiểm tra lại số hiệu và họ tên (ghi đúng như trên
          văn bằng).
        </p>
      </div>
    );
  }
  const hopLe = ketQua.trangThai === "HOP_LE";
  return (
    <div className={`rounded-lg border p-4 text-sm ${hopLe ? "border-green-600/40 bg-green-600/5" : "border-destructive/40 bg-destructive/5"}`}>
      <p className={`text-base font-semibold ${hopLe ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
        {hopLe ? `✓ Văn bằng hợp lệ` : `✗ Văn bằng đã bị hủy`}
      </p>
      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Loại văn bằng</dt>
        <dd className="capitalize">{ketQua.loaiVanBang}</dd>
        <dt className="text-muted-foreground">Số hiệu</dt>
        <dd className="font-medium">{ketQua.soHieu}</dd>
        <dt className="text-muted-foreground">Họ và tên</dt>
        <dd className="font-medium">{ketQua.hoTen}</dd>
        <dt className="text-muted-foreground">Năm sinh</dt>
        <dd>{ketQua.namSinh ?? "—"}</dd>
        <dt className="text-muted-foreground">Chương trình</dt>
        <dd>{ketQua.tenChuongTrinh}</dd>
        <dt className="text-muted-foreground">Khóa</dt>
        <dd>
          {ketQua.maKhoa}
          {ketQua.thoiGianKhoa ? ` (${ketQua.thoiGianKhoa})` : ""}
        </dd>
        {hopLe ? (
          <>
            <dt className="text-muted-foreground">Quyết định cấp</dt>
            <dd>
              {ketQua.soQuyetDinh ?? "—"}
              {ketQua.ngayKy ? `, ngày ${ketQua.ngayKy.toLocaleDateString("vi-VN")}` : ""}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-muted-foreground">Ngày hủy</dt>
            <dd>{ketQua.ngayHuy?.toLocaleDateString("vi-VN") ?? "—"}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Cơ quan cấp</dt>
        <dd>{ketQua.coQuanCap}</dd>
      </dl>
    </div>
  );
}
