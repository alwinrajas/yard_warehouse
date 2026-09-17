# 09 — Security Design

**Phase:** 3 — Architecture (security)
**BRD:** §17 (Security), §15 (Audit), §6 (Access), master prompt §30
**Status:** Baseline for review

---

## 1. Threat model

The realistic threats for this system, in order of likelihood:

| # | Threat | Control |
|---|---|---|
| T-01 | An operator uses a colleague's credentials to cover a mistake | Individual accounts, single active PDA session (`CFG-20`), every transaction carries user + device |
| T-02 | A lost or stolen PDA | Token TTL, server-side revocation, remote deactivation of the user, no cached inventory data on the device |
| T-03 | An insider quietly rewrites history to hide an error | No update path on transactions; corrections are append-only, permissioned and audited |
| T-04 | Privilege escalation by a lower-tier administrator | Only `SUPER_ADMIN` may edit role permissions |
| T-05 | Credential stuffing against the internet-facing login | Rate limiting, account lockout, strong password policy |
| T-06 | Data exfiltration via export | Exports are permissioned, scoped, audited, and delivered by short-lived signed URLs |
| T-07 | Injection / XSS via scanned barcode values or free-text remarks | Parameterised queries throughout; output encoding; React escapes by default |
| T-08 | Leaked secrets in source or logs | Secrets Manager, no credentials in the repo, log scrubbing, secret scanning in CI |

The operational risks (T-01, T-03) are ranked above the classic web risks deliberately —
they are what this system exists to control, and they are the ones a warehouse actually
experiences.

---

## 2. Transport and network

| Control | Implementation |
|---|---|
| HTTPS everywhere | TLS 1.2+ terminated at the ALB with an ACM certificate. Plain HTTP redirects to HTTPS. |
| HSTS | `max-age=31536000; includeSubDomains` |
| Database | Private subnets only. No public endpoint. Reachable solely from the application security group. |
| TLS to RDS | Enforced; the RDS CA bundle ships in the image |
| CORS | Explicit origin allow-list from `APP_CORS_ORIGINS`. Never `*`. The PDA sends no `Origin`, so it is unaffected. |
| Security headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP on the web app |

---

## 3. Authentication

| Control | Implementation |
|---|---|
| Hashing | bcrypt cost 12. Plain-text passwords are never logged, stored, emailed or displayed. |
| Password policy | `CFG-10` — min 12 chars, mixed case, digit, symbol, last 3 blocked. **Placeholder pending `OI-15`.** |
| Lockout | 5 failed attempts → 15-minute lock, recorded as `login.failed` audit rows |
| Forced change | On first login and after any administrative reset |
| PDA tokens | Sanctum personal access tokens, device-bound, server-side idle expiry per `CFG-11` |
| Single session | One active PDA token per user (`CFG-20`); a new login revokes the previous one |
| Web sessions | BFF pattern — token held in an `httpOnly`, `Secure`, `SameSite=Strict` cookie, never in JavaScript-readable storage |
| Revocation | Deactivating a user revokes all their tokens immediately, not at next expiry |

The single-session rule is what makes "no shared operator credentials" (BRD §6) enforceable
rather than aspirational: two forklifts cannot run concurrently on one account.

---

## 4. Authorisation

Three layers, all server-side, detailed in `07-permission-matrix.md`:
permission check → site scope → facility scope. Client-side permission data drives rendering
only. A generated test asserts every role × permission combination against live endpoints.

Out-of-scope and unpermitted both return `403` with the same body, so the API cannot be used
to enumerate facilities a user may not see.

---

## 5. Input handling

| Control | Implementation |
|---|---|
| Validation | Laravel `FormRequest` on every endpoint. No controller reads unvalidated input. |
| Mass assignment | Explicit `$fillable` on every model. `$guarded = []` is banned by a static check in CI. |
| SQL injection | Eloquent and the query builder throughout; parameter binding in the few raw reporting queries, with no string interpolation of user input |
| Barcode values | Treated as untrusted strings — length-bounded, control characters stripped, stored parameterised, escaped on output |
| Free text | Remarks and justifications are length-bounded and escaped on render. React escapes by default; no `dangerouslySetInnerHTML` anywhere. |
| File uploads | Import files: extension and MIME allow-list, size cap, parsed in a sandboxed job, never executed, stored outside the web root |
| Rate limiting | Login 5/min per IP+username · scan endpoints 120/min per user · exports 10/hour per user · general API 300/min per user |

---

## 6. Secrets and configuration

| Rule | Implementation |
|---|---|
| No secret in source control | `.env` is git-ignored; only `.env.example` with placeholder values is committed |
| Production secrets | AWS Secrets Manager, injected as container environment variables at task start |
| Rotation | Database credentials rotated via Secrets Manager; `APP_KEY` rotation documented in the runbook |
| CI credentials | GitHub Actions authenticates to AWS via OIDC. No long-lived AWS keys exist. |
| Scanning | Secret scanning and dependency audit run on every pull request |

---

## 7. Error handling and information disclosure

| Rule | Implementation |
|---|---|
| `APP_DEBUG=false` in staging and production | Asserted by a post-deployment smoke test, not left to discipline |
| Stack traces never returned | Central `Handler` maps every exception to the standard envelope |
| 500 responses | Generic message plus a `trace_id`. Support correlates the id to the log; the client learns nothing internal. |
| No internal identifiers leaked | Table names, SQL, file paths and framework versions are absent from responses |
| Server header | Suppressed at the ALB |

---

## 8. Audit and accountability

| Audited | Where |
|---|---|
| Every inventory-changing transaction | `inventory_transactions` (append-only, `user_id NOT NULL`) |
| Master data create/update/delete | `audit_logs` with old and new value JSON |
| User activation, deactivation, role change, password reset | `audit_logs` |
| Login success, failure, lockout, logout | `audit_logs` |
| Barcode print and reprint | `audit_logs` |
| Manual overrides (`scan.manual_override`, `dispatch.override_hold`) | `audit_logs` with mandatory justification |
| Settings changes | `audit_logs` |
| Report exports | `audit_logs` with report code and filter JSON |

Neither audit store has an update or delete path in the application. `audit_logs` has no
`updated_at` column at all — a row that can be modified is not an audit record.

---

## 9. Data protection

| Item | Control |
|---|---|
| At rest | RDS encryption (KMS), S3 SSE, EBS encryption |
| In transit | TLS everywhere, including application → database |
| Backups | Encrypted; restore access restricted to the operations role |
| PDA local storage | Auth token and UI preferences only, in EncryptedSharedPreferences. **No inventory data cached.** A stolen device yields no stock information. |
| Logs | Structured JSON with password, token and authorisation-header fields scrubbed by a Monolog processor |
| PII | Limited to user names, usernames and emails. No customer personal data beyond company name and LPO reference. |

---

## 10. Pre-go-live security checklist

- [ ] `APP_DEBUG=false` verified in staging and production by automated smoke test
- [ ] `APP_KEY` generated per environment and stored in Secrets Manager
- [ ] All default and seeded credentials removed or rotated
- [ ] Database not reachable from the public internet (verified by scan)
- [ ] TLS certificate valid, HSTS active, HTTP redirecting
- [ ] CORS allow-list contains only the real web origins
- [ ] Rate limits active and verified against the login endpoint
- [ ] Permission matrix test suite green for all roles × all permissions
- [ ] Facility-scope leakage test green, including exports
- [ ] No secret present in the repository (scanner clean)
- [ ] Dependency audit clean for high and critical advisories
- [ ] Audit trail verified: a correction produces a new row and leaves the original untouched
- [ ] Token revocation verified: deactivating a user immediately ends their PDA session
- [ ] Stack traces confirmed absent from 500 responses in staging
