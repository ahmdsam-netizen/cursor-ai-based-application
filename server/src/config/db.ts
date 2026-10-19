import { PrismaClient } from "@prisma/client";

let prismaInstance: PrismaClient | null = null;
let dbConnected = false;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return prismaInstance;
}

export const prisma = getPrisma();

export function isDbConnected(): boolean {
  return dbConnected;
}

export async function connectDb(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn("DATABASE_URL is not set. Running with in-memory sample catalog.");
    dbConnected = false;
    return;
  }

  try {
    const client = getPrisma();
    await client.$connect();
    // Test connection
    await client.$queryRaw`SELECT 1`;
    dbConnected = true;
    console.log("PostgreSQL (Prisma) connected");

    // Ensure pgvector extension is created
    try {
      await client.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    } catch (extErr: any) {
      console.warn("Notice: pgvector extension auto-create check:", extErr?.message);
    }
  } catch (error: any) {
    dbConnected = false;
    console.warn("PostgreSQL connection failed via Prisma:", error?.message);
  }
}

export async function disconnectDb(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    dbConnected = false;
  }
}
