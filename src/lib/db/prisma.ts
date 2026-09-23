import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  // disposeExternalPool: true - để prisma.$disconnect() đóng luôn pg.Pool bên
  // dưới, tránh rò rỉ connection tích lũy qua nhiều lần chạy test (local
  // Prisma Postgres dev instance không chịu được nhiều connection bỏ ngỏ).
  const adapter = new PrismaPg(pool, { disposeExternalPool: true });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
