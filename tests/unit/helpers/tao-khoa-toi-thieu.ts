import { prisma } from "@/lib/db/prisma";

/**
 * Fixture dùng chung cho test: tạo 1 chuỗi tối thiểu LoaiHinhBoiDuong ->
 * ChuongTrinh -> Khoa để test các CN cần tham chiếu tới 1 khóa có thật
 * (DM-04 buổi học, DM-05 đợt tuyển sinh, và các module KH/HV/... sau này).
 * Trả về id của cả 3 bản ghi để test tự dọn dẹp theo thứ tự ngược lại.
 */
export async function taoKhoaToiThieu() {
  const hauTo = crypto.randomUUID();

  const loaiHinh = await prisma.loaiHinhBoiDuong.create({
    data: { ma: `LH_TEST_${hauTo}`, ten: "Loại hình test" },
  });

  const chuongTrinh = await prisma.chuongTrinh.create({
    data: {
      maCT: `CT_TEST_${hauTo}`,
      ten: "Chương trình test",
      loaiHinhBoiDuongId: loaiHinh.id,
    },
  });

  const khoa = await prisma.khoa.create({
    data: {
      maKhoa: `KH_TEST_${hauTo}`,
      chuongTrinhId: chuongTrinh.id,
      siSoToiDa: 30,
    },
  });

  return {
    khoaId: khoa.id,
    chuongTrinhId: chuongTrinh.id,
    loaiHinhId: loaiHinh.id,
    donDep: async () => {
      await prisma.khoa.delete({ where: { id: khoa.id } });
      await prisma.chuongTrinh.delete({ where: { id: chuongTrinh.id } });
      await prisma.loaiHinhBoiDuong.delete({ where: { id: loaiHinh.id } });
    },
  };
}
