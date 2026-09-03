# LUMINAe Release Operations v1.0

## Environment Separation

Staging and production use separate databases, origins, service accounts, storefront credentials, email credentials, operational-health secrets, reconciliation secrets, log sinks, and build labels. Production secrets never enter Vite variables or the client bundle.

Required client identity is validated by `scripts/validate-release-environment.mjs`. The API refuses production startup without `LUMINAE_ALLOWED_ORIGINS`. Keep `BLUEPRINT_COMPETITIVE_ENABLED` unset or `false` at launch.

## Deployment Sequence

1. Record commit SHA, release version, build label, and database migration journal.
2. Create and verify an encrypted database backup.
3. Restore that backup into staging and run rollback-only migration validators.
4. Apply migrations to staging, deploy API, then deploy the compatible web/native clients.
5. Complete smoke tests: login, create/join room, reconnect, Chronicle state, Vault state, Lume ledger, and operational health.
6. Repeat backup and migration sequence for production.
7. Release web to a bounded cohort before native rollout.
8. Halt rollout on any P0/P1, purchase double-grant, migration data loss, private Blueprint leak, or material frame regression.

## Database Backup And Restore Drill

- Back up before every migration and on a daily schedule; encrypt in transit and at rest, retain off the primary host, and restrict restore credentials.
- A backup is not accepted until restored into an isolated database and checked for account count, active room count, Chronicle outcomes, Blueprint clearance rows, Lume balances, ledger totals, and native purchase rows.
- Run a restore drill before launch and quarterly thereafter. Record start/end time, operator, source snapshot, checksums, recovery-point gap, recovery time, and failed checks.
- Never test restoration against production. Never edit immutable Lume/Chronicle ledgers to make totals agree; investigate and add a source-attributed corrective transaction if required.

## Migration Rollback

- Prefer additive, idempotent migrations and compatibility reads.
- Deploy migrations before code that requires them; old application code must tolerate additive fields during rollout.
- If application deployment fails after an additive migration, roll back the application first and leave compatible schema additions in place.
- Destructive rollback requires a reviewed data-preservation plan and a fresh backup. The current release migrations are validated only through rollback-only fixtures; they are not authorization to drop production data.

## Purchase Operations

- Backend verification is the sole grant authority. Purchase tokens are unique per provider and grants use ledger idempotency keys.
- Pending/cancelled/unverifiable purchases grant nothing. Acknowledge or consume only after a successful server grant.
- Reconciliation calls are authenticated with `LUMINAE_PURCHASE_RECONCILIATION_SECRET`, logged without raw credentials, and scheduled independently for Play and Samsung.
- Daily checks: provider settled count, verified count, pending age, failed verification count, duplicate callback count, refund count, negative balances, and ledger/purchase reconciliation.
- A refund creates an idempotent negative adjustment. Existing historical awards are never rewritten.
- Follow the server-backed lifecycle required by [Google Play Billing](https://developer.android.com/google/play/billing/lifecycle/one-time) and [Samsung IAP server APIs](https://developer.samsung.com/iap/programming-guide/samsung-iap-server-api.html).

## Account Deletion

- A password-confirmed request revokes sessions immediately and schedules hard deletion after seven days.
- Run `pnpm --filter @workspace/api-server accounts:process-deletions` from a protected scheduled job at least daily.
- Monitor pending age and processor failures. Storefronts may retain their independent financial records; the in-service account, progress, social state, moderation links allowed by policy, and purchase records are removed by database cascades.
- The public deletion URL must be reachable without login and match the store listing.

## Monitoring

- Poll authenticated `/ops/health` from outside the hosting network. Alert on API failure, database latency/failure, or WebSocket anomalies.
- Keep the scheduled external WebSocket probe enabled with `WS_PROBE_TARGET` set to production.
- Monitor: login failures, reset failures, room creation, reconnect success, match completion, Chronicle closures, Lumii outcomes, client crashes, long frames, purchase verification, pending purchases, refunds, and deletion jobs.
- Telemetry is operational only: no ad ID, contact list, precise location, message content, or open-ended client detail objects.

## Incident Priorities

- **P0:** security breach, purchase double-grant at scale, destructive data loss, account isolation failure, or broad inability to play. Freeze rollout and commerce immediately.
- **P1:** private Blueprint leak, persistent login/reconnect failure, Chronicle/Vault progression block, migration inconsistency, or material late-game frame regression. Halt rollout.
- **P2:** localized presentation/accessibility defects with a viable workaround. Triage before expansion.

For every P0/P1: name incident commander, preserve logs and build identity, disable the narrow affected feature, communicate status, reconcile impacted ledgers/accounts, document root cause, and add a regression gate before resuming.

## Store And Rollout Controls

- Google Play and Galaxy use distinct signing keys, package configuration, billing credentials, products, tester cohorts, and reconciliation dashboards.
- Localized storefront price is authoritative; never hardcode a currency amount in the game.
- Start with internal/closed cohorts, then staged percentages. Compare crash, ANR, frame, purchase, reconnect, and progression rates before each expansion.
- Mac beta is downloadable only after HTTPS production-service smoke tests, code signing, notarization, and update/support instructions. It does not block the web/Android launch.

