import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { layThamSoSo } from "@/server/services/qt/qt-05-tham-so";
import type { DuLieuForm, KetQuaKiemTra } from "@/lib/form-dang-ky";
import { kiemTraDangKyTheoKhoa } from "@/server/services/hv/form-dang-ky";

async function taoHocVienVoiMaTuSinh<T>(taoVoiMa: (maHocVien: string) => Promise<T>): Promise<T> {
  const nam = new Date().getFullYear();
  const tienTo = `HV${nam}`;
  const soLuongDaCo = await prisma.hocVien.count({
    where: { maHocVien: { startsWith: tienTo } },
  });

  for (let lanThu = 0; lanThu < 10; lanThu++) {
    const soThuTu = soLuongDaCo + 1 + lanThu;
    const maHocVien = `${tienTo}${String(soThuTu).padStart(4, "0")}`;
    try {
      return await taoVoiMa(maHocVien);
    } catch (error) {
      const laLoiTrungMa =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      if (!laLoiTrungMa) throw error;
    }
  }

  throw new Error("Không sinh được mã học viên sau nhiều lần thử");
}

/**
 * HV-02: "hồ sơ không được xác nhận nộp giấy trong thời hạn quy định sẽ tự
 * động hủy đăng ký" - đặc tả chưa nêu rõ số ngày cụ thể. Đọc từ tham số hệ
 * thống QT-05 (mã "SO_NGAY_HAN_NOP_GIAY"), mặc định 7 ngày nếu admin chưa
 * cấu hình.
 */
export async function soNgayHanNopGiay(): Promise<number> {
  return layThamSoSo("SO_NGAY_HAN_NOP_GIAY", 7);
}

export type ThongTinHocVienInput = {
  hoTen: string;
  soCCCD?: string | null;
  ngaySinh?: Date | string | null;
  soDienThoai?: string | null;
  email?: string | null;
  donViCongTac?: string | null;
  chucDanhHocViId?: string | null;
  // (bổ sung 01/10/2026) thí sinh là sinh viên của trường (lấy từ danh sách sinh viên HV-03)
  maSinhVien?: string | null;
  lopSinhHoat?: string | null;
  // (bổ sung 30/09/2026) dữ liệu form đăng ký cấu hình (gồm trường tùy chỉnh, tệp minh chứng);
  // không truyền thì kiểm tra các trường có sẵn ở trên theo cấu hình của khóa
  duLieuForm?: DuLieuForm;
};

const chuoi = (v: Date | string | null | undefined) => (v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? "").trim());

/**
 * (bổ sung 30/09/2026) Kiểm tra thông tin đăng ký theo form cấu hình của khóa
 * (trường bắt buộc, danh sách chọn, giá trị cố định, tệp minh chứng) - dùng
 * chung mọi kênh đăng ký. Trả về thông tin học viên đã chuẩn hóa + phần bổ
 * sung để lưu sau khi tạo hồ sơ (luuHoSoBoSung).
 */
export async function chuanBiThongTinDangKy<T extends ThongTinHocVienInput>(
  khoaId: string,
  input: T,
): Promise<{ input: T; boSung: KetQuaKiemTra }> {
  const duLieu: DuLieuForm = input.duLieuForm ?? {
    giaTri: {
      ngaySinh: chuoi(input.ngaySinh),
      soDienThoai: chuoi(input.soDienThoai),
      email: chuoi(input.email),
      donViCongTac: chuoi(input.donViCongTac),
      chucDanhHocViId: chuoi(input.chucDanhHocViId),
    },
    tep: {},
  };
  const boSung = await kiemTraDangKyTheoKhoa(khoaId, duLieu);
  const c = boSung.coSan;
  return {
    input: {
      ...input,
      hoTen: input.hoTen.trim(),
      soCCCD: input.soCCCD?.trim() || null,
      ngaySinh: c.ngaySinh ?? null,
      soDienThoai: c.soDienThoai ?? null,
      email: c.email ?? null,
      donViCongTac: c.donViCongTac ?? null,
      chucDanhHocViId: c.chucDanhHocViId ?? null,
    },
    boSung,
  };
}

/**
 * HV-08: "Một học viên chỉ có 1 mã duy nhất dù tham gia nhiều khóa qua các
 * phương thức khác nhau" - định danh theo CCCD; nếu đã có hồ sơ với CCCD này
 * thì dùng lại (không tạo mã học viên mới), chỉ tạo mới khi chưa từng có.
 */
export async function timHoacTaoHocVien(input: ThongTinHocVienInput) {
  // (bổ sung 01/10/2026) sinh viên đã có hồ sơ theo mã sinh viên thì dùng lại hồ sơ đó
  const theoMaSinhVien = input.maSinhVien ? await prisma.hocVien.findUnique({ where: { maSinhVien: input.maSinhVien } }) : null;
  if (input.soCCCD || theoMaSinhVien) {
    const daTonTai = theoMaSinhVien ?? (await prisma.hocVien.findUnique({ where: { soCCCD: input.soCCCD! } }));
    if (daTonTai) {
      // (bổ sung 30/09/2026) chỉ điền vào chỗ còn trống của hồ sơ cũ, không ghi đè dữ liệu đã có
      const dien = {
        ngaySinh: daTonTai.ngaySinh ? undefined : input.ngaySinh ? new Date(input.ngaySinh) : undefined,
        soDienThoai: daTonTai.soDienThoai ? undefined : input.soDienThoai || undefined,
        email: daTonTai.email ? undefined : input.email || undefined,
        donViCongTac: daTonTai.donViCongTac ? undefined : input.donViCongTac || undefined,
        chucDanhHocViId: daTonTai.chucDanhHocViId ? undefined : input.chucDanhHocViId || undefined,
        maSinhVien: daTonTai.maSinhVien ? undefined : input.maSinhVien || undefined,
        lopSinhHoat: daTonTai.lopSinhHoat ? undefined : input.lopSinhHoat || undefined,
      };
      if (Object.values(dien).some((v) => v !== undefined)) return prisma.hocVien.update({ where: { id: daTonTai.id }, data: dien });
      return daTonTai;
    }
  }

  return taoHocVienVoiMaTuSinh((maHocVien) =>
    prisma.hocVien.create({
      data: {
        maHocVien,
        hoTen: input.hoTen,
        soCCCD: input.soCCCD ?? null,
        ngaySinh: input.ngaySinh ? new Date(input.ngaySinh) : null,
        soDienThoai: input.soDienThoai ?? null,
        email: input.email ?? null,
        donViCongTac: input.donViCongTac ?? null,
        chucDanhHocViId: input.chucDanhHocViId ?? null,
        maSinhVien: input.maSinhVien ?? null,
        lopSinhHoat: input.lopSinhHoat ?? null,
      },
    }),
  );
}
