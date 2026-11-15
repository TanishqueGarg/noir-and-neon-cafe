# Deployment checklist

Use this checklist for a deliberate production release. It does not authorize an automatic deployment or database reset.

## 1. Prepare GitHub safely

The workspace is not currently a Git repository. From the project root:

```bash
git init
git branch -M main
git add .
git status --short
git diff --cached
git commit -m "Initial production-ready NOIR & NEON"
git remote add origin <YOUR_GITHUB_REPOSITORY_URL>
git push -u origin main
```

Before committing, verify that `.env`, `.env.local`, `.next`, `.next-dev`, `node_modules`, logs, test output, and caches are absent from `git status`. Do not replace an existing remote or force-push. Enable branch protection and secret scanning on the repository.

## 2. Create isolated Neon databases

Create distinct development, test, preview, and production databases or branches. Production must not be used by local development, previews, seed scripts, or automated tests. Retain both Neon connection strings for each environment:

- pooled/serverless URL → `DATABASE_URL`;
- direct/non-pooler URL → `DIRECT_URL` for Prisma migrations.

Both URLs must require TLS. Keep the disposable test URL only in `TEST_DATABASE_URL`; never make it equal to the runtime production URL.

## 3. Validate migrations outside production

Set development URLs locally, then run:

```bash
npm ci
npm run db:generate
npm run db:deploy
```

Apply both checked-in migrations to development and the disposable test database first. Run `npm run test:integration` only with `ALLOW_DATABASE_TESTS=true` and the isolated `TEST_DATABASE_URL`. Review the resulting tables, constraints, indexes, and `_prisma_migrations` records. Never run `prisma migrate reset` against production.

## 4. Load development data safely

For a non-production database only, temporarily set `ALLOW_DEVELOPMENT_SEED=true`, run `npm run db:seed`, then unset it. The seed refuses production mode but still requires operator review of the selected URL. Do not seed production; enter authentic menu, table, hours, contact, address, and social data through a reviewed operational process.

## 5. Configure environments

Copy `.env.example` locally and supply values through encrypted environment stores. Run `npm run env:check`; it must pass before release. Use independent high-entropy values for `RATE_LIMIT_SALT` and `CRON_SECRET`. Keep `ALLOW_DEVELOPMENT_SEED` and `ALLOW_DATABASE_TESTS` false in production. Set `NEXT_PUBLIC_SITE_URL` to the final canonical HTTPS origin before building.

Configure Vercel Production variables separately from Preview variables. Preview deployments must use a non-production database, staff email, and Resend test strategy.

## 6. Apply production migrations

Back up or confirm point-in-time recovery for the production database. From a controlled CI job or operator workstation with the production `DATABASE_URL` and direct `DIRECT_URL`:

```bash
npm ci
npm run db:generate
npm run db:deploy
```

`db:deploy` applies checked-in migrations only. Do not put migration execution inside ordinary request handlers, and do not use `migrate dev` or a reset command in production. Record the command output and verify migration status before allowing traffic.

## 7. Bootstrap the owner

After migrations, temporarily set a unique owner email and a generated password of at least 16 characters in `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`. Run:

```bash
npm run admin:bootstrap
```

The script refuses to overwrite an existing account. Confirm login and logout, then remove both bootstrap variables from every environment. Store the credential in an approved password manager. Add MFA at the identity/perimeter layer if the admin surface is internet-accessible.

## 8. Verify the Resend sender

Add the production domain to Resend and complete its DNS verification. Set `RESEND_API_KEY`, a verified `EMAIL_FROM`, and `ADMIN_NOTIFICATION_EMAIL`. Keep the key server-side. Send controlled order, reservation, status-change, and contact tests to approved addresses. Distinguish Resend API acceptance from inbox delivery.

## 9. Create the Vercel project

Import the GitHub repository without deploying production traffic yet. Select Node.js 22 and the normal Next.js preset. Keep the build command `npm run build`; on `VERCEL_ENV=production` it first runs the non-connecting fail-closed environment preflight, then generates Prisma Client, but it never applies migrations. Do not add filesystem-based persistence. Confirm `.next-dev` is not uploaded and `.next` remains the production output.

## 10. Configure email processing

The request that creates an order, reservation, or contact inquiry awaits one bounded post-commit outbox attempt. This is the prompt path; a provider failure cannot roll back the saved record. `vercel.json` invokes `GET /api/internal/email/process` once daily using Vercel's `Authorization: Bearer $CRON_SECRET` behavior. That daily job is a recovery sweep, not the only acknowledgement mechanism.

If retries must occur within minutes on Vercel Hobby, configure one low-cost external scheduler to call the same endpoint every 5–10 minutes with `Authorization: Bearer <CRON_SECRET>`. The durable database claim and Resend event idempotency make concurrent invocations safe. Never expose the secret in a browser or query string. Monitor `RETRYABLE`, `FAILED`, and long-lived `PENDING` rows.

## 11. Configure domain and transport

Attach the café domain, verify DNS and TLS, then update `NEXT_PUBLIC_SITE_URL` and rebuild. Choose one canonical host and redirect aliases at the platform/domain layer. Verify HSTS, CSP, frame denial, referrer, permissions, and no-sniff headers. Confirm the Resend sender domain is aligned with the public domain.

## 12. Run production smoke tests

Use controlled test identities and immediately clean up only those records through approved admin operations:

1. health endpoint returns minimal status;
2. public navigation, images, cart, checkout, reservations, contact, and newsletter work on desktop and mobile;
3. prices are taken from PostgreSQL, not the browser payload;
4. duplicate order submission returns the original order rather than creating another;
5. concurrent reservation attempts cannot exceed capacity;
6. customer/staff email rows are created and provider acceptance is recorded honestly;
7. admin login, CSRF rejection, logout, session expiry, role restriction, status transitions, and audit records work;
8. private admin and customer data is absent from public responses and logs;
9. `npm run qa` passes against the production candidate.

## 13. Monitor and recover

Enable Vercel error/function monitoring and Neon connection/storage alerts without logging request bodies or customer details. Monitor outbox backlog, failed logins, rate-limit growth, reservation capacity conflicts, and API 5xx rates. Retain database backups/point-in-time recovery appropriate to the business. Roll back application code by deploying a reviewed prior commit; roll database changes forward with a corrective migration rather than resetting data. Rotate any suspected secret immediately and revoke affected admin sessions.

