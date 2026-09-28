import { donDuLieuE2E, taoDuLieuE2E } from "./du-lieu-e2e";

// dọn tàn dư của lần chạy trước bị ngắt rồi tạo lại dữ liệu e2e
export default async function globalSetup() {
  await donDuLieuE2E();
  await taoDuLieuE2E();
}
