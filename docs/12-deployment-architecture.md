# 12 — Production Deployment Architecture

**Phase:** 14 — Deployment (design)
**Covers:** Deliverable P
**BRD:** §17 (Cloud Availability, Backup & Recovery, Scalability), master prompt §33, §34
**Status:** Design baseline — **nothing in this document is provisioned yet**

> Per master prompt §34: backup and recovery are not claimed as complete. This document
> describes what will be built and how it will be verified. Status is tracked in §9.

---

## 1. Target architecture (AWS)

```
                        Internet
                            │
                   ┌────────┴────────┐
                   │   Route 53      │   (domains pending OI-17)
                   └────────┬────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
     ┌────────▼────────┐          ┌────────▼─────────┐
     │  CloudFront     │          │       ACM        │
     │  (web static)   │          │  TLS certs       │
     └────────┬────────┘          └──────────────────┘
              │
     ┌────────▼──────────────────────────────────────┐
     │  Application Load Balancer  (HTTPS only)      │
     │  /api/*  → API target group                   │
     │  /*      → Web target group                   │
     └────────┬──────────────────────┬───────────────┘
              │                      │
   ┌──────────▼─────────┐  ┌─────────▼──────────┐
   │ ECS Fargate        │  │ ECS Fargate        │
   │ SERVICE: api       │  │ SERVICE: web       │
   │ Laravel + php-fpm  │  │ Next.js            │
   │ 2 tasks (min)      │  │ 2 tasks (min)      │
   └──────────┬─────────┘  └────────────────────┘
              │
   ┌──────────┼──────────────────┐
   │          │                  │
┌──▼────────┐ │  ┌───────────────▼──────┐
│ ECS       │ │  │ ECS SERVICE: sched   │
│ SERVICE:  │ │  │ Laravel scheduler    │
│ worker    │ │  │ 1 task               │
│ queue:work│ │  └──────────────────────┘
│ 1 task    │ │
└──┬────────┘ │
   │          │
   └──────────┼───────────────────────────┐
              │                           │
   ┌──────────▼──────────┐   ┌────────────▼─────────┐
   │  RDS MySQL 8.0      │   │  S3                  │
   │  Multi-AZ           │   │  exports · labels    │
   │  private subnets    │   │  import files        │
   │  encrypted (KMS)    │   │  SSE, lifecycle      │
   │  automated backups  │   └──────────────────────┘
   └─────────────────────┘

  Supporting: ECR (images) · Secrets Manager · CloudWatch Logs & Alarms
              SES (optional alerts, CFG-19) · VPC with public/private subnets + NAT
```

**No Redis. No message broker. No microservices.** The queue runs on the `database` driver
and carries only exports and label PDFs.

### Why this shape

| Choice | Reason |
|---|---|
| ECS Fargate over EC2 | No servers to patch; the operations burden matches the team size |
| Two API tasks minimum | Survives an AZ loss and allows zero-downtime deploys |
| One worker task | Export volume is low; a second is added only if the queue depth alarm fires |
| Multi-AZ RDS | The database is the single source of truth; its loss is unrecoverable operationally |
| S3 for files | Container filesystems are ephemeral; exports must outlive a task |
| CloudFront for web | Static asset caching; also the TLS and WAF attachment point |

---

## 2. Environments

| | Development | Staging | Production |
|---|---|---|---|
| Location | Developer machine | AWS | AWS |
| Orchestration | Docker Compose | ECS Fargate | ECS Fargate |
| Database | MySQL 8 container | RDS single-AZ, `db.t4g.small` | RDS Multi-AZ, size per `OI-06` |
| API tasks | 1 | 1 | 2+ (autoscaling) |
| Web tasks | 1 (`next dev`) | 1 | 2+ |
| `APP_DEBUG` | `true` | `false` | `false` |
| Data | Demo seeders | Anonymised / synthetic | Real |
| Deploy trigger | — | auto on merge to `develop` | manual approval on tag `v*` |
| Backups | none | daily, 7-day retention | automated + PITR (`OI-18`) |
| Domain | `localhost` | pending `OI-17` | pending `OI-17` |

Every environment-specific value is an environment variable or a `system_settings` row.
Nothing is compiled in. `.env.example` documents each variable with a placeholder, never a
real value.

---

## 3. Containers

| Image | Base | Contents |
|---|---|---|
| `api` | `php:8.3-fpm-alpine` + nginx | Laravel, opcache enabled, JIT off, composer install `--no-dev` |
| `web` | `node:20-alpine` | Next.js standalone output, multi-stage build |
| `worker` | same image as `api` | Entrypoint `php artisan queue:work --tries=3 --max-time=3600` |
| `scheduler` | same image as `api` | Entrypoint `php artisan schedule:work` |

Reusing one image for api/worker/scheduler guarantees they run identical code. All images
are multi-stage, run as a non-root user, and carry no build toolchain in the final layer.

### Local development

`docker compose up` brings the full stack: mysql, api, web, worker, mailpit. One command,
seeded demo data, no AWS dependency. Onboarding a developer must not require an AWS account.

---

## 4. CI/CD (GitHub Actions)

### Pull request — `ci.yml`
```
┌─ backend ──────────────────────────────────────────┐
│ PHP 8.3 · composer install · Pint (lint)           │
│ PHPStan level 6 · Pest unit + feature (MySQL 8)    │
│ Concurrency suite (real MySQL, parallel processes) │
│ Architecture tests (InventoryLedger isolation)     │
│ Permission-matrix test (all roles × permissions)   │
└────────────────────────────────────────────────────┘
┌─ web ──────────────────────────────────────────────┐
│ Node 20 · tsc --noEmit · ESLint · Vitest · build   │
└────────────────────────────────────────────────────┘
┌─ pda ──────────────────────────────────────────────┐
│ JDK 17 · ktlint · detekt · unit tests · assemble   │
└────────────────────────────────────────────────────┘
┌─ security ─────────────────────────────────────────┐
│ secret scan · composer audit · npm audit           │
└────────────────────────────────────────────────────┘
```
All jobs must pass. No merge to `develop` or `main` without them.

### Merge to `develop` — `deploy-staging.yml`
Build and push images to ECR → run migrations as a one-off ECS task → update services →
wait for stable → smoke test (health, login, `APP_DEBUG=false`, a put-away round-trip).

### Tag `v*` — `deploy-production.yml`
**Manual approval gate** → RDS snapshot taken before migrations → build/push → migrate →
rolling deploy (`minimumHealthyPercent: 100`) → smoke test → automatic rollback to the
previous task definition if the smoke test fails.

AWS access uses GitHub OIDC. No long-lived AWS keys exist anywhere.

---

## 5. Migration strategy

| Rule | Reason |
|---|---|
| Migrations run as a one-off ECS task before the service update | Never inside an application container at boot — concurrent tasks would race |
| Forward-only in production | Rollback is by restore, not by `migrate:rollback` on live data |
| Additive first | Add column → deploy code that writes both → backfill → deploy code that reads new → drop old, in separate releases |
| Large-table changes | Reviewed for lock duration; performed in a maintenance window if blocking |
| Pre-migration snapshot | Automatic RDS snapshot on every production deploy |
| Seeders | Reference data (permissions, roles, settings, reason-code categories) only. **No customer data.** |

---

## 6. Observability

| Signal | Implementation |
|---|---|
| Application logs | JSON to stdout → CloudWatch Logs, tagged with `correlation_id`, `user_id`, `device_id` |
| Access logs | ALB logs to S3 |
| Metrics | CloudWatch: ECS CPU/memory, ALB 5xx and latency, RDS connections/CPU/storage, queue depth |
| Health | `GET /api/v1/health` — process liveness. `GET /api/v1/health/ready` — database reachable, migrations current, queue worker heartbeat fresh. |
| Alarms | API 5xx > 1% for 5 min · p95 latency > 2 s · RDS CPU > 80% · RDS free storage < 20% · queue depth > 100 · failed deploy · **failed backup** |
| Business alarm | No successful inventory transaction in 60 minutes during configured working hours — catches "the PDAs stopped working" before the phone rings |

The last alarm is the one that matters operationally. Infrastructure can be perfectly
healthy while every forklift in the yard is stuck on a login screen.

---

## 7. Backup and recovery

**Planned configuration** (`OI-18` must confirm retention):

| Item | Target |
|---|---|
| RDS automated backups | Daily, 7-day retention (placeholder) |
| Point-in-time recovery | Enabled, 5-minute granularity |
| Manual snapshots | Before every production deploy; retained 35 days (placeholder) |
| Cross-region copy | To be confirmed with the customer |
| S3 | Versioning enabled; lifecycle expiry for exports at 7 days |
| Encryption | KMS on snapshots and objects |

### Recovery objectives (proposed, not yet agreed)
| | Target |
|---|---|
| RPO | ≤ 5 minutes (PITR granularity) |
| RTO | ≤ 4 hours |

### Documented restore procedure
1. Identify the target timestamp from the incident record.
2. Restore the RDS instance to a **new** instance at that point in time. Never restore over
   the live instance.
3. Verify: row counts on `inventory_transactions` and `inventory_current`; confirm the
   invariant (`SELECT pallet_id FROM inventory_current GROUP BY pallet_id HAVING COUNT(*)>1`
   returns zero rows — it cannot, but the check documents the state); spot-check known
   pallets.
4. Repoint the application to the restored instance by updating the Secrets Manager value
   and restarting services.
5. Reconcile the gap: transactions committed between the restore point and the incident are
   lost and must be re-entered from the PDA Recent Activity screens and physical records.
6. Record the incident, the data gap and the reconciliation in the operations log.

### Verification
A restore drill is executed in staging **before go-live** and **quarterly thereafter**, and
the result recorded. Until the first drill is complete and recorded, backup and recovery are
reported as *not verified*.

---

## 8. Scaling

| Trigger | Action |
|---|---|
| API CPU > 70% for 5 min | Scale out, maximum 6 tasks |
| API CPU < 30% for 15 min | Scale in, minimum 2 tasks |
| Queue depth > 100 | Add a worker task |
| RDS CPU sustained > 70% | Vertical scale; add a read replica for reporting if reports dominate |
| Connections near limit | Tune `DB_POOL` per task; review connection lifetime |

Sizing is deliberately unspecified beyond the minimums until `OI-06` supplies expected
volumes. `ASM-05` is a placeholder for planning, not a commitment.

---

## 9. Provisioning status

| Item | Status |
|---|---|
| Architecture design | **Complete (this document)** |
| Docker images | Not built |
| Local compose stack | Not built |
| GitHub Actions workflows | Not written |
| AWS account / region | **Blocked on `OI-17`** |
| VPC, ECS, RDS, S3 | Not provisioned |
| Domains and TLS | **Blocked on `OI-17`** |
| Backups configured | Not provisioned |
| **Restore drill executed** | **Not performed — backup/recovery is NOT complete** |
| Monitoring and alarms | Not configured |

This table is updated as each item is genuinely completed, and is the source for the release
checklist.
