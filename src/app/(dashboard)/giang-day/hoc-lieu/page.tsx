import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/guard";
import { ChuaDangNhapError, KhongCoQuyenError } from "@/lib/auth/loi";
import { hocLieuCuaHocVien } from "@/server/services/gd/gd-04-hoc-lieu";

const kichThuoc = (byte: number | null) =>
  byte == null ? "" : byte < 1024 * 1024 ? `${Math.ceil(byte / 1024)} KB` : `${(byte / 1024 / 1024).toFixed(1)} MB`;

// GD-04 phía học viên: tài liệu các khóa mình đang học/đã hoàn thành (cả khóa + lớp của mình)
export default async function HocLieuHocVienPage() {
  let phien;
  try {
    phien = await requirePermission("GD-04");
  } catch (error) {
    if (error instanceof ChuaDangNhapError) redirect("/dang-nhap");
    if (error instanceof KhongCoQuyenError) {
      return <p className="p-6 text-destructive">{error.message}</p>;
    }
    throw error;
  }

  const { hocVien, dsKhoa } = await hocLieuCuaHocVien(phien.userId);

  return (
    <main className="flex flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">Học liệu các khóa của tôi</h1>
      {!hocVien ? (
        <p className="text-sm text-muted-foreground">Tài khoản chưa gắn với hồ sơ học viên.</p>
      ) : dsKhoa.length === 0 ? (
        <p className="text-sm text-muted-foreground">Bạn chưa là học viên chính thức của khóa nào.</p>
      ) : (
        dsKhoa.map(({ khoa, lop, dsTaiLieu }) => (
          <section key={khoa.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <h2 className="text-sm font-semibold">
              Khóa {khoa.maKhoa} · {khoa.chuongTrinh.ten}
              {lop ? ` · lớp ${lop.maLop}` : ""}
            </h2>
            {dsTaiLieu.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có tài liệu.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {dsTaiLieu.map((tl) => (
                  <li key={tl.id}>
                    <span className="text-muted-foreground">{tl.hocPhan.ten} · </span>
                    <a href={`/api/gd/hoc-lieu/${tl.id}`} className="font-medium underline" target={tl.duongLink ? "_blank" : undefined}>
                      {tl.tieuDe}
                    </a>
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      ({tl.duongLink ? "link" : `${tl.tenFile}, ${kichThuoc(tl.kichThuoc)}`}
                      {tl.lop ? `, riêng lớp ${tl.lop.maLop}` : ""}) - {tl.nguoiDang}, {tl.createdAt.toLocaleDateString("vi-VN")}
                    </span>
                    {tl.moTa && <div className="text-xs text-muted-foreground">{tl.moTa}</div>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </main>
  );
}
