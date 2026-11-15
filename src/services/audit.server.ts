import { Prisma } from "@prisma/client";

export function recordAudit(transaction: Prisma.TransactionClient, input: { adminId: string; action: string; entityType: string; entityId?: string; metadata?: Prisma.InputJsonValue }) {
  return transaction.auditLog.create({ data: { adminId: input.adminId, action: input.action, entityType: input.entityType, entityId: input.entityId, metadata: input.metadata } });
}
