import { prisma } from "./prisma";
import { computeCostCents } from "./pricing";

const FREE_MESSAGE_LIMIT = 5;

export async function recordUsage(params: {
  userId: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
}) {
  const costCents = computeCostCents(params.model, params.promptTokens, params.completionTokens);

  await prisma.usageRecord.create({
    data: {
      userId: params.userId,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      costCents,
    },
  });

  // Increment free message counter
  await prisma.user.update({
    where: { id: params.userId },
    data: { freeMessagesUsed: { increment: 1 } },
  });

  return costCents;
}

export async function getUserUsage(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const records = await prisma.usageRecord.findMany({
    where: { userId, createdAt: { gte: startOfMonth } },
    orderBy: { createdAt: "desc" },
  });

  const totalCents = records.reduce((sum: number, r: any) => sum + r.costCents, 0);
  const totalPromptTokens = records.reduce((sum: number, r: any) => sum + r.promptTokens, 0);
  const totalCompletionTokens = records.reduce((sum: number, r: any) => sum + r.completionTokens, 0);

  return {
    records,
    totalCents,
    totalPromptTokens,
    totalCompletionTokens,
    messageCount: records.length,
  };
}

export async function checkQuota(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeMessagesUsed: true, stripeCustomerId: true },
  });

  if (!user) return { allowed: false, reason: "User not found" };

  // Has payment method → unlimited
  if (user.stripeCustomerId) return { allowed: true };

  // Within free tier
  if (user.freeMessagesUsed < FREE_MESSAGE_LIMIT) return { allowed: true };

  return {
    allowed: false,
    reason: `Free tier limit reached (${FREE_MESSAGE_LIMIT} messages). Add a payment method to continue.`,
  };
}
