import { thayBien, type MauDonDangKy } from "@/lib/mau-in";

export type DuLieuDonDangKy = {
  laDuThi: boolean;
  // mục thông tin thí sinh theo form đăng ký; rong = chiếm cả dòng
  thongTin: { nhan: string; giaTri: string; rong?: boolean }[];
  tepMinhChung: { nhan: string; tenFile: string }[];
  // null = không in bảng (vd. hồ sơ qua đơn vị liên kết - không hiện học phí cá nhân)
  bangPhi: { noiDung: string; soTien: number }[] | null;
  donViLienKet?: string | null;
  maHoSo: string;
  ngayDangKy: string;
  hoTen: string;
  ngayLam?: Date;
};

const tien = (n: number) => n.toLocaleString("vi-VN");

/**
 * (bổ sung 07/10/2026 - HV-01/HV-05) Đơn đăng ký in theo mẫu cấu hình: quốc hiệu, tiêu đề, kính
 * gửi, căn cứ, I. thông tin thí sinh (theo form đăng ký), II. nội dung đăng ký + bảng số tiền,
 * cam kết, chữ ký. Thành phần thuần - dùng cho trang in và khung xem trước.
 */
export function BanInDonDangKy({ mau, bien, duLieu }: { mau: MauDonDangKy; bien: Record<string, string>; duLieu: DuLieuDonDangKy }) {
  const t = (s: string) => thayBien(s, bien);
  const dsCanCu = mau.canCu.split("\n").map((d) => d.trim()).filter(Boolean);
  const ngay = duLieu.ngayLam ?? new Date();
  const tong = duLieu.bangPhi?.reduce((s, d) => s + d.soTien, 0) ?? 0;
  const doiTuong = duLieu.laDuThi ? "THÍ SINH" : "HỌC VIÊN";

  return (
    <article className="bg-white px-8 py-6 text-[13pt] leading-relaxed text-black print:p-0" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
      <p className="text-center font-bold">
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        <br />
        Độc lập - Tự do - Hạnh phúc
      </p>
      <p className="text-center leading-none">---------------</p>
      <h1 className="mt-4 text-center text-[15pt] font-bold uppercase">{t(mau.tieuDe)}</h1>
      {mau.kinhGui.trim() && (
        <p className="mt-2 text-center">
          Kính gửi: <b>{t(mau.kinhGui)}</b>
        </p>
      )}
      {dsCanCu.map((d, i) => (
        <p key={i} className="mt-1 text-justify italic">
          {t(d)}
        </p>
      ))}

      <p className="mt-4 font-bold">I. THÔNG TIN {doiTuong}</p>
      <div className="grid grid-cols-2 gap-x-6">
        {duLieu.thongTin.map((m, i) => (
          <p key={i} className={m.rong ? "col-span-2" : undefined}>
            {m.nhan}: {m.nhan === "Họ và tên" ? <b>{m.giaTri}</b> : m.giaTri || "……………………"}
          </p>
        ))}
      </div>
      {duLieu.tepMinhChung.length > 0 && (
        <div>
          <p>Minh chứng đã nộp kèm:</p>
          <ul className="list-disc pl-6">
            {duLieu.tepMinhChung.map((f, i) => (
              <li key={i}>
                {f.nhan}: {f.tenFile}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 font-bold">II. NỘI DUNG ĐĂNG KÝ</p>
      {mau.dongDangKy.trim() && <p>{t(mau.dongDangKy)}</p>}
      {mau.dongDot.trim() && <p>{t(mau.dongDot)}</p>}
      {duLieu.donViLienKet && (
        <p>
          Đơn vị liên kết thu hồ sơ: <b>{duLieu.donViLienKet}</b>
        </p>
      )}
      {mau.hienBangLePhi && duLieu.bangPhi && duLieu.bangPhi.length > 0 && (
        <table className="mt-2 w-full border-collapse border border-black text-[12pt]">
          <thead>
            <tr>
              <th className="w-[8%] border border-black p-1">TT</th>
              <th className="border border-black p-1">Nội dung đăng ký</th>
              <th className="w-[24%] border border-black p-1">Số tiền (đồng)</th>
            </tr>
          </thead>
          <tbody>
            {duLieu.bangPhi.map((d, i) => (
              <tr key={i}>
                <td className="border border-black p-1 text-center">{i + 1}</td>
                <td className="border border-black p-1">{d.noiDung}</td>
                <td className="border border-black p-1 text-right tabular-nums">{tien(d.soTien)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} className="border border-black p-1 text-right font-bold">
                Tổng cộng:
              </td>
              <td className="border border-black p-1 text-right font-bold tabular-nums">{tien(tong)}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="mt-1 text-[11pt] italic">
        Mã hồ sơ: {duLieu.maHoSo} · Ngày đăng ký: {duLieu.ngayDangKy}
      </p>

      {mau.camKet.trim() && <p className="mt-3 indent-8 text-justify">{t(mau.camKet)}</p>}

      <div className="mt-4 grid grid-cols-2">
        <span />
        <div className="text-center">
          <p className="italic">
            {mau.diaDanh.trim() ? t(mau.diaDanh) : "……………"}, ngày {ngay.getDate()} tháng {ngay.getMonth() + 1} năm {ngay.getFullYear()}
          </p>
          <p className="font-bold">{t(mau.nhanKy)}</p>
          <p className="italic">(Ký và ghi rõ họ tên)</p>
          <p className="mt-16 font-semibold">{duLieu.hoTen}</p>
        </div>
      </div>
      {mau.ghiChu.trim() && <p className="mt-4 text-[11pt] whitespace-pre-line italic">{t(mau.ghiChu)}</p>}
    </article>
  );
}

/** Dữ liệu thí sinh mẫu cho khung xem trước. */
export function duLieuDonMau(laDuThi: boolean): DuLieuDonDangKy {
  return {
    laDuThi,
    thongTin: [
      { nhan: "Họ và tên", giaTri: "Nguyễn Văn An", rong: true },
      { nhan: "Ngày sinh", giaTri: "01/01/2003" },
      { nhan: "Số CCCD", giaTri: "048203000123" },
      ...(laDuThi
        ? [
            { nhan: "Mã sinh viên", giaTri: "3122990001" },
            { nhan: "Lớp sinh hoạt", giaTri: "22CNTT1" },
          ]
        : [{ nhan: "Đơn vị công tác", giaTri: "Trường THCS Nguyễn Huệ" }]),
      { nhan: "Điện thoại", giaTri: "0912990001" },
      { nhan: "Email", giaTri: "an.nguyen@example.com" },
    ],
    tepMinhChung: [],
    bangPhi: laDuThi
      ? [
          { noiDung: "Đăng ký thi", soTien: 450000 },
          { noiDung: "Đăng ký ôn thi", soTien: 300000 },
        ]
      : [{ noiDung: "Học phí khóa bồi dưỡng", soTien: 1500000 }],
    maHoSo: "HV2026000123",
    ngayDangKy: new Date().toLocaleDateString("vi-VN"),
    hoTen: "Nguyễn Văn An",
  };
}
