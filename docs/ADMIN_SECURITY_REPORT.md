# Admin security and operations report

Date: 2026-10-29

## Authentication approach

- No public registration route exists.
- The initial owner is created only by `npm run admin:bootstrap` using `ADMIN_BOOTSTRAP_EMAIL` and a password of at least 16 characters.
- Bootstrap refuses to overwrite an existing account.
- Passwords use bcrypt with cost 12.
- Login responses do not reveal whether an email exists.
- Login attempts are rate-limited by both client fingerprint and account identifier using PostgreSQL-backed counters.

Successful login creates a 256-bit random opaque session token. Only its SHA-256 hash is stored in `AdminSession`. Sessions are revocable, expire after eight hours by default (configurable from one to 24 hours), update activity timestamps, and are bound to the creating browser user-agent hash.

The session cookie is HTTP-only, Secure in production, SameSite Strict, path `/`, and uses the `__Host-` prefix in production. A separate random CSRF token is stored as a readable Strict cookie while only its hash is stored server-side. Every state-changing admin API requires a matching CSRF header and strict same-origin request.

Logout records an audit event, revokes the database session, and clears both cookies. Inactive, expired, or revoked sessions are rejected server-side.

## Authorization and data protection

Every admin page is nested under a server-side protected layout and independently authorizes before its first database query. This second check is required because Next.js can render layouts and pages concurrently; it prevents an unauthenticated page render from starting customer-data reads while the layout redirect is still resolving. Every admin mutation route independently verifies the database session and CSRF token before parsing or modifying data. Customer records are never exposed by public APIs.

The dashboard supports:

- Order viewing/filtering and guarded status transitions.
- Reservation viewing/filtering, capacity visibility, atomic confirmation, rejection, and cancellation.
- Menu creation, name/description editing, price changes, availability, activation, and deactivation.
- Contact inquiry review and resolution.
- Newsletter consent record viewing and activation/deactivation; there is no bulk marketing sender.
- Business identity, contact, social, hours, pickup, reservation, and seating-capacity management.
- Durable email queue visibility and processing.

Order and reservation changes use optimistic status checks. Reservation confirmation uses a date-scoped PostgreSQL advisory lock and rechecks overlapping capacity inside a serializable transaction. Seating reductions are rejected when they would place existing future pending/confirmed bookings above capacity.

Administrative changes write audit records without storing passwords, session tokens, API keys, or email bodies in audit metadata.

Business settings and seating-capacity mutations are restricted to `OWNER`. Managers retain operational order, reservation, menu, contact, and consent-record access. The protected navigation and settings page enforce the same distinction, while the API remains the authoritative authorization boundary.

## Schema changes

- Added `AdminSession` with hashed tokens/CSRF, expiry, revocation, activity, browser/IP hashes, and indexes.
- Extended `EmailDelivery` into an outbox with event IDs, payloads, claim/retry timestamps, provider status, acceptance/delivery timestamps, attempt limits, and due-job indexes.
- Added configurable business contact email and Facebook URL.
- Added migration `20261029180000_admin_and_email_outbox`.

The migration was generated and compiled but was not applied to a real database.

## Verification and remaining blockers

- Invalid credentials, inactive accounts, expired/revoked sessions, CSRF mismatch, transition rules, templates, retry timing, and missing email credentials have automated coverage.
- TypeScript, ESLint, production build, combined verification, and public visual QA passed.
- Live login/logout, concurrent admin mutations, database outbox claims, and reservation approval conflicts were not integration-tested because no isolated PostgreSQL credentials were supplied.
- Live Resend delivery was not tested.
- Multi-factor authentication is not implemented. It is recommended before granting remote access to high-privilege production accounts.
- Multi-factor authentication and any finer-grained permissions beyond the current OWNER/MANAGER split remain recommended hardening for a larger staff deployment.
- No deployment occurred.
