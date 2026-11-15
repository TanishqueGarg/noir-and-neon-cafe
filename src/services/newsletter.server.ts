import { db } from "@/lib/db";
import { isPrismaCode } from "@/lib/prisma-errors";

export interface NewsletterRepository {
  findByEmail(email: string): Promise<{ active: boolean } | null>;
  create(email: string): Promise<void>;
  reactivate(email: string, consentedAt: Date): Promise<void>;
}

const prismaRepository: NewsletterRepository = {
  findByEmail: (email) => db.newsletterSubscriber.findUnique({ where: { email }, select: { active: true } }),
  create: async (email) => { await db.newsletterSubscriber.create({ data: { email } }); },
  reactivate: async (email, consentedAt) => {
    await db.newsletterSubscriber.update({ where: { email }, data: { active: true, unsubscribedAt: null, consentedAt } });
  },
};

export async function subscribeNewsletter(email: string, repository: NewsletterRepository = prismaRepository) {
  const existing = await repository.findByEmail(email);
  if (existing?.active) return { subscribed: true, alreadySubscribed: true, reactivated: false };
  if (existing) {
    await repository.reactivate(email, new Date());
    return { subscribed: true, alreadySubscribed: false, reactivated: true };
  }
  try {
    await repository.create(email);
    return { subscribed: true, alreadySubscribed: false, reactivated: false };
  } catch (error) {
    if (!isPrismaCode(error, "P2002")) throw error;
    const raced = await repository.findByEmail(email);
    if (!raced) throw error;
    if (!raced.active) await repository.reactivate(email, new Date());
    return { subscribed: true, alreadySubscribed: raced.active, reactivated: !raced.active };
  }
}
