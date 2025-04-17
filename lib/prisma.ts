// /src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// Creates a Prisma Client instance (this allows interaction with your DB)
const prisma = new PrismaClient();

// Export it to use it in your app
export default prisma;
