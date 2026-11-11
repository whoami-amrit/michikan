/**
 * Grants, extends or revokes a Pro pass for a user.
 *
 *   pnpm --filter api grant-pro -- --email <email> --days 30
 *   pnpm --filter api grant-pro -- --email <email> --revoke
 *
 * Granting sets `plan = PRO` and `planExpiresAt = max(now, current expiry) + days`, so calling
 * it on an active pass extends it. `--revoke` sets `plan = FREE` and clears the expiry.
 * Reads DB_URL from the root `.env`, so it runs against whichever database that points to.
 * The user's JWT and user page pick the change up on their next token refresh.
 */
import { parseArgs } from 'node:util';

import { Plan, PrismaClient, PrismaPg } from 'db';

const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const main = async () => {
  const { values } = parseArgs({
    // pnpm forwards the `--` separator to the script
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    options: {
      email: { type: 'string' },
      days: { type: 'string' },
      revoke: { type: 'boolean', default: false },
    },
  });

  const { email, revoke } = values;

  if (!email) {
    return fail('Usage: grant-pro --email <email> (--days <n> | --revoke)');
  }

  if (revoke === (values.days !== undefined)) {
    return fail('Pass either --days <n> to grant or --revoke, not both and not neither');
  }

  const days = Number(values.days);

  if (!revoke && (!Number.isInteger(days) || days <= 0)) {
    return fail('--days must be a positive whole number');
  }

  const connectionString = process.env.DB_URL;

  if (!connectionString) {
    return fail('DB_URL is not set. Run through `pnpm --filter api grant-pro` to load the .env');
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return fail(`No user with email ${email}`);
    }

    if (revoke) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: Plan.FREE, planExpiresAt: null },
      });

      console.log(`Revoked Pro for ${email}. Plan is now FREE.`);
      return;
    }

    const now = Date.now();
    const base = Math.max(now, user.planExpiresAt?.getTime() ?? now);
    const planExpiresAt = new Date(base + days * DAY_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { plan: Plan.PRO, planExpiresAt },
    });

    console.log(`Granted Pro to ${email} until ${planExpiresAt.toISOString()}.`);
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
