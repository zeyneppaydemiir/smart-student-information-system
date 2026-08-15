const { PrismaClient } = require("@prisma/client");

// Dev modda hot reload'da her dosya değişikliğinde yeni PrismaClient
// oluşmaması için global'e cache'liyoruz.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
