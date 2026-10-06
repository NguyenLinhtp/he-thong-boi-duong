"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChonTep } from "@/components/chung/chon-tep";
import { importSinhVienAction, type TrangThaiImportSinhVien } from "@/app/(dashboard)/hoc-vien/sinh-vien/actions";
import type { DongGhiDeSinhVien } from "@/server/services/hv/loi-hoc-vien";

/**
 * HV-03 (sửa 05/10/2026): nạp danh sách sinh viên 2 bước - "Kiểm tra tệp" (báo lỗi
 * theo dòng, cảnh báo mã SV đã có sẽ bị ghi đè) -> "Xác nhận nạp". Dùng ở trang
 * Danh sách sinh viên và trang chương trình đăng ký dự thi (Phương thức 3).
 */
export function FormImportSinhVien({ dsCot = [] }: { dsCot?: { ma: string; nhan: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kq, setKq] = useState<TrangThaiImportSinhVien | undefined>();
  const [dangXuLy, batDau] = useTransition();

  const gui = (kiemTra: boolean) => {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    const fd = new FormData(form);
    if (kiemTra) fd.set("kiemTra", "1");
    else for (const g of kq?.kiemTra?.ghiDe ?? []) fd.append("xacNhanGhiDe", g.maSinhVien);
    batDau(async () => {
      const ketQua = await importSinhVienAction(fd);
      setKq(ketQua);
      if (ketQua.ok) form.reset();
    });
  };

  const kt = kq?.kiemTra;
  // cột bổ sung có giá trị thay đổi của 1 dòng ghi đè
  const cotKhac = (g: DongGhiDeSinhVien) => dsCot.filter((c) => (g.cu.thongTinThem[c.ma] ?? "") !== (g.moi.thongTinThem[c.ma] ?? ""));
  const coGhiDe = !!kt && kt.ghiDe.length > 0;
  const coDuLieuNap = !!kt && kt.themMoi + kt.ghiDe.length > 0;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        gui(true);
      }}
      // chọn tệp khác -> bỏ kết quả kiểm tra cũ, phải kiểm tra lại
      onChange={(e) => {
        if ((e.target as unknown as HTMLInputElement).name === "file") setKq(undefined);
      }}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
    >
      <ChonTep
        name="file"
        accept=".xlsx,.csv"
        required
        nhan="Chọn tệp Excel/CSV"
        goiY={`Các cột: Mã sinh viên, Số CCCD, Họ tên sinh viên, Lớp sinh hoạt${dsCot.map((c) => `, ${c.nhan}`).join("")} (dòng tiêu đề bắt buộc, thứ tự cột tùy ý). Mỗi lần có tệp bổ sung, nạp thêm - không nhập trùng mã sinh viên.`}
        className="max-w-xl"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={kt ? "outline" : "default"} disabled={dangXuLy}>
          {dangXuLy && !kt ? "Đang kiểm tra..." : "Kiểm tra tệp"}
        </Button>
        <a href="/api/hv/sinh-vien/mau" className="text-sm underline">
          Tải tệp mẫu
        </a>
      </div>

      {kq?.ok && <p className="text-sm text-success">{kq.ok}</p>}
      {kq?.loi && <p className="text-sm text-destructive">{kq.loi}</p>}
      {kq?.cacDongLoi && kq.cacDongLoi.length > 0 && (
        <ul className="max-h-60 list-disc overflow-auto pl-5 text-sm text-destructive">
          {kq.cacDongLoi.map((l, i) => (
            <li key={i}>
              Dòng {l.dong}: {l.loi}
            </li>
          ))}
        </ul>
      )}

      {kt && (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3 text-sm">
          <p>
            Tệp hợp lệ: <b>{kt.themMoi}</b> sinh viên mới
            {kt.khongDoi > 0 && (
              <>
                , <b>{kt.khongDoi}</b> dòng trùng y hệt dữ liệu đã có (bỏ qua)
              </>
            )}
            {coGhiDe && (
              <>
                , <b className="text-warning">{kt.ghiDe.length}</b> mã sinh viên đã có với dữ liệu khác
              </>
            )}
            .
          </p>
          {coGhiDe && (
            <div className="flex flex-col gap-2">
              <p className="font-medium text-warning">
                Cảnh báo ghi đè: các mã sinh viên dưới đây đã có trong hệ thống - nạp tệp sẽ thay dữ liệu cũ bằng dữ liệu mới.
              </p>
              <div className="max-h-72 overflow-auto rounded border bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-muted">
                    <tr>
                      <th className="p-2">Dòng</th>
                      <th className="p-2">Mã SV</th>
                      <th className="p-2">Dữ liệu cũ</th>
                      <th className="p-2">Dữ liệu mới</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kt.ghiDe.map((g) => (
                      <tr key={g.maSinhVien} className="border-t align-top">
                        <td className="p-2">{g.dong}</td>
                        <td className="p-2 font-mono">{g.maSinhVien}</td>
                        <td className="p-2">
                          {g.cu.hoTen} · <span className="font-mono">{g.cu.soCCCD}</span> · {g.cu.lopSinhHoat ?? "—"}
                          {cotKhac(g).map((c) => (
                            <div key={c.ma}>
                              {c.nhan}: {g.cu.thongTinThem[c.ma] || "—"}
                            </div>
                          ))}
                        </td>
                        <td className="p-2">
                          <MoTaKhac moi={g.moi.hoTen} cu={g.cu.hoTen} /> · <MoTaKhac moi={g.moi.soCCCD} cu={g.cu.soCCCD} mono /> ·{" "}
                          <MoTaKhac moi={g.moi.lopSinhHoat ?? "—"} cu={g.cu.lopSinhHoat ?? "—"} />
                          {cotKhac(g).map((c) => (
                            <div key={c.ma}>
                              {c.nhan}: <MoTaKhac moi={g.moi.thongTinThem[c.ma] || "—"} cu="" />
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {coDuLieuNap ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={coGhiDe ? "destructive" : "default"} disabled={dangXuLy} onClick={() => gui(false)}>
                {dangXuLy ? "Đang nạp..." : coGhiDe ? `Xác nhận ghi đè ${kt.ghiDe.length} sinh viên và nạp` : "Xác nhận nạp"}
              </Button>
              <Button type="button" variant="ghost" disabled={dangXuLy} onClick={() => setKq(undefined)}>
                Hủy
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Không có dữ liệu mới để nạp.</p>
          )}
        </div>
      )}
    </form>
  );
}

// giá trị mới khác giá trị cũ thì tô đậm để cán bộ dễ thấy
function MoTaKhac({ moi, cu, mono }: { moi: string; cu: string; mono?: boolean }) {
  return <span className={(moi !== cu ? "font-semibold text-warning " : "") + (mono ? "font-mono" : "")}>{moi}</span>;
}
