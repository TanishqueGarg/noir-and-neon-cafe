# Transactional email integration report

Date: 2026-10-29

## Implemented notification flows

- Order acknowledgement to the customer with reference, pickup time, item summary, total, pay-at-counter instructions, and accurate pending status.
- New order notification to the configured staff address.
- Reservation request acknowledgement that explicitly says the request is pending rather than confirmed.
- New reservation notification to staff.
- Reservation confirmed, rejected, and cancelled messages generated only after the corresponding database status transition succeeds.
- New contact-inquiry notification to staff; the private message body remains in the protected dashboard rather than being copied into email.

Templates use the NOIR & NEON dark visual language, escape customer-controlled values, include configured café contact details when available, and avoid unnecessary mobile numbers or private message content.

## Durable delivery architecture

Email jobs are created in `EmailDelivery` inside the same PostgreSQL transaction as the related order, reservation, status change, or contact inquiry. Stable event IDs and unique database constraints prevent duplicate logical notifications.

Lifecycle states include `PENDING`, `PROCESSING`, `ACCEPTED`, `DELIVERED`, `RETRYABLE`, `FAILED`, and `SKIPPED`. Resend API acceptance is stored as `ACCEPTED`, never as proof of inbox delivery. `DELIVERED` is reserved for a future verified webhook integration.

Workers atomically claim a due row with optimistic concurrency, recover claims older than five minutes, and apply exponential backoff from one minute up to one hour. Provider attempts are bounded by `maxAttempts` (default five). Resend receives the stable event ID as its idempotency key, making a retry safe if a serverless invocation stops after provider acceptance but before the database update.

Missing provider or staff-recipient configuration leaves jobs pending with an honest setup error and does not increment provider attempts. Email failures never roll back a saved order, reservation, or inquiry.

## Processing entry points

- Customer API flows await a bounded post-commit processing pass for prompt acknowledgements. The related database transaction is already committed, and provider failure cannot change the saved customer record.
- An authenticated administrator can process due jobs from the dashboard.
- `GET` and `POST /api/internal/email/process` support Vercel Cron or an external scheduler using `Authorization: Bearer <CRON_SECRET>`.
- `vercel.json` schedules a once-daily authenticated recovery sweep. On Vercel Hobby this is a durability fallback, not the prompt-delivery path. An external 5–10 minute scheduler can be added for faster retries.

No in-memory queue is used. A scheduler still needs to be configured by the deployment operator.

## Configuration required

- `RESEND_API_KEY`
- `EMAIL_FROM` using a Resend-verified sender domain
- `ADMIN_NOTIFICATION_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `CRON_SECRET` containing a high-entropy random value

Sender-domain verification and live email acceptance were not tested because verified Resend credentials were not supplied.

## Verification

Automated tests cover branded template generation, HTML escaping, confirmed reservation wording, stable event identifiers, exponential retry timing, and the missing-credential result. The final unit suite passed 21/21. Database-backed duplicate claims and live provider delivery remain configuration-dependent integration work.

Webhook delivery tracking is intentionally not implemented in this phase because no verified webhook secret/configuration was available. The application does not fabricate delivered status.
