/* eslint-disable @typescript-eslint/no-explicit-any */

let _PrismaClient: any;
let _PrismaPg: any;

try {
  _PrismaClient = require("@prisma/client").PrismaClient;
  _PrismaPg = require("@prisma/adapter-pg").PrismaPg;
} catch {
  // Dependencies not installed or generated — prisma will be undefined
}

const globalForPrisma = globalThis as unknown as { prisma: any };

function makePrisma(): any {
  if (!process.env.DATABASE_URL || !_PrismaClient) return undefined;
  const adapter = new _PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new _PrismaClient({ adapter });
}

export const prisma: any = globalForPrisma.prisma || makePrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
