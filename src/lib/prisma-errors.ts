import { Prisma } from "@prisma/client";

export function isPrismaCode(error: unknown, ...codes: string[]) {
  return error instanceof Prisma.PrismaClientKnownRequestError && codes.includes(error.code);
}

export async function withTransactionRetry<T>(work: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      lastError = error;
      if (!isPrismaCode(error, "P2002", "P2034") || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
  throw lastError;
}
