import { afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";

// Local Prisma Postgres dev instance (npx prisma dev) không chịu được nhiều
// connection bị bỏ ngỏ tích lũy qua nhiều test file/lần chạy - đóng pool sau
// mỗi file test để tránh rò rỉ connection (xem memory project_local_dev_db_quirks).
afterAll(async () => {
  await prisma.$disconnect();
});
