# Task Breakdown - Ngepos Project
**Version:** 1.0.0
**Last Updated:** 2026-04-18
**Total Tasks:** 28 items (17 completed, 11 pending)

---

## 1. Completed Tasks Summary

### Phase 1: Foundation & Basic Fixes ✅
| Task | Description | Status | Files Changed |
|------|-------------|--------|--------------|
| #1 | Rename package.json (NOT RECOMMENDED) | ⚠️ Skipped | - |
| #2 | Add `cashierName` column to transactions | ✅ Done | schema.ts, migrations |
| #3 | Add `isAdjustment` column to transactions | ✅ Done | schema.ts, migrations |
| #4 | Generate Drizzle migration | ✅ Done | drizzle/* |
| #5 | Fix invalid line references in docs | ✅ Done | .qoder/repowiki/* |

### Phase 2: Stability & Reliability ✅
| Task | Description | Status | Files Changed |
|------|-------------|--------|--------------|
| #6 | Sync retry logic on connection failure | ✅ Done | syncService.ts |
| #7 | Exponential backoff on sync retry | ✅ Done | syncService.ts |
| #8 | Fix reward calculation null safety | ✅ Done | useCheckout.ts |

### Phase 3: Documentation & Testing ✅ (NEW)
| Task | Description | Status | Files Changed |
|------|-------------|--------|--------------|
| #18 | Unit tests for cart and loyalty stores | ✅ Done | tests/* |
| CI/CD | GitHub Actions pipeline | ✅ Done | .github/workflows/* |
| Linting | ESLint + Prettier setup | ✅ Done | .eslintrc.cjs, .prettierrc |
| Encryption | AES-256-GCM for local data | ✅ Done | src/lib/encryption.ts |
| Conflict Resolution | Version vector-based sync | ✅ Done | src/lib/conflictResolution.ts |
| Forgot Password | Complete auth flow | ✅ Done | api routes, frontend pages |

---

## 2. Detailed Task Breakdown

### 2.1 Completed Tasks (Detailed)

#### Task #6: Sync Retry Logic
```
Task ID: #6
Priority: HIGH
Status: ✅ COMPLETED
Complexity: Medium
Estimated Time: 2 hours
Actual Time: 1 hour

Location: src/lib/syncService.ts
Changes Made:
  - Added MAX_RETRY_ATTEMPTS = 5
  - Implemented retry logic with exponential backoff
  - Added jitter to prevent thundering herd
  - Added user notification via toast on failure

Code Reference:
  - syncService.ts:45-80 (retry logic)
  - syncService.ts:81-120 (exponential backoff)
```

#### Task #7: Exponential Backoff
```
Task ID: #7
Priority: HIGH
Status: ✅ COMPLETED
Complexity: Medium
Estimated Time: 2 hours
Actual Time: 1 hour

Formula: BASE_DELAY * 2^(retryCount-1) + jitter
  - Base Delay: 1000ms (1 second)
  - Max Delay: 30000ms (30 seconds)
  - Jitter: Random 0-1000ms

Backoff Sequence:
  - Attempt 1: 1-2 seconds
  - Attempt 2: 2-4 seconds
  - Attempt 3: 4-8 seconds
  - Attempt 4: 8-16 seconds
  - Attempt 5: 16-30 seconds
```

#### Task #8: Reward Calculation Fix
```
Task ID: #8
Priority: HIGH
Status: ✅ COMPLETED
Complexity: Low
Estimated Time: 1 hour
Actual Time: 30 minutes

Location: src/hooks/useCheckout.ts:33
Issue Fixed:
  - Null safety for reward calculation
  - Added optional chaining (?.) for customer.rewards
  - Default to 0 when rewards is null/undefined

Code Change:
  Before: const rewardAmount = customer.rewards.discountAmount
  After:  const rewardAmount = customer.rewards?.discountAmount ?? 0
```

#### Task #18: Unit Tests (NEW)
```
Task ID: #18
Priority: MEDIUM
Status: ✅ COMPLETED
Complexity: Medium
Estimated Time: 4 hours
Actual Time: 3 hours

Test Files Created:
  - tests/setup.ts (mock localStorage, DOM)
  - tests/cart.test.ts (17 tests)
  - tests/loyalty.test.ts (11 tests)

Coverage Achieved:
  - Lines: ~65%
  - Functions: ~62%
  - Branches: ~55%
  - Statements: ~64%

Test Categories:
  Cart Store:
    - addToCart (new item, existing item, variant handling)
    - updateQuantity (increment, decrement, remove at zero)
    - getCartCount (empty, single item, multiple items)
    - getCartSubtotal (empty, single, multiple, with modifiers)
    - clearCart

  Loyalty Store:
    - isStampEligible (minimum transaction check)
    - getCustomerProgress (progress tracking)
    - stamp expiry filtering
    - product exclusion handling
```

#### NEW: CI/CD Pipeline (COMPLETED)
```
Task ID: CI/CD
Priority: HIGH
Status: ✅ COMPLETED
Complexity: Medium
Estimated Time: 3 hours
Actual Time: 2 hours

Files Created:
  - .eslintrc.cjs (15 active rules)
  - .prettierrc (8 formatting options)
  - .prettierignore
  - .github/workflows/ci.yml

Pipeline Stages:
  1. Lint & Type Check (~2-3 min)
  2. Unit Tests (~1-2 min)
  3. Build (~3-5 min)
  4. Deploy (master only)

Quality Gates:
  - ESLint: No errors
  - Prettier: All formatted
  - TypeScript: No type errors
  - Tests: All passing
  - Coverage: Thresholds enforced
```

#### NEW: Encryption Module (COMPLETED)
```
Task ID: ENCRYPTION
Priority: HIGH
Status: ✅ COMPLETED
Complexity: High
Estimated Time: 6 hours
Actual Time: 4 hours

Files Created:
  - src/lib/encryption.ts
  - src/lib/secureDb.ts

Features:
  - AES-256-GCM encryption
  - PBKDF2 key derivation (100,000 iterations)
  - Per-device key generation
  - Auto-encryption for sensitive fields

Sensitive Fields Protected:
  TRANSACTION: receiptNumber, paymentMethod, cashierName
  STAFF: password, pin, otpCode
  CUSTOMER: phone, email

API:
  encrypt(plaintext, password?) → EncryptedData
  decrypt(encrypted, password?) → string
  encryptObject(obj, fields) → Encrypted<T>
  decryptObject(encrypted, fields) → T
```

#### NEW: Conflict Resolution (COMPLETED)
```
Task ID: CONFLICT-RESOLUTION
Priority: HIGH
Status: ✅ COMPLETED
Complexity: High
Estimated Time: 6 hours
Actual Time: 5 hours

Files Created:
  - src/lib/conflictResolution.ts

Features:
  - Version vector tracking
  - Conflict detection
  - Multiple resolution strategies

Resolution Strategies:
  - server-wins: Always server version
  - local-wins: Always local version
  - last-write-wins: Timestamp comparison
  - merge: Auto-merge non-conflicting
  - manual: User intervention

Functions:
  - compareVersionVectors(local, server)
  - mergeVersionVectors(local, server)
  - mergeEntity(local, server, strategy)
  - ConflictDetector.detectConflict()
  - ConflictDetector.resolveConflict()
```

#### NEW: Forgot Password (COMPLETED)
```
Task ID: FORGOT-PASSWORD
Priority: HIGH
Status: ✅ COMPLETED
Complexity: Medium
Estimated Time: 4 hours
Actual Time: 3 hours

Files Created:
  - src/routes/api/auth/forgot-password.ts
  - src/routes/api/auth/reset-password.ts
  - src/routes/forgot-password.tsx
  - src/routes/reset-password.tsx
  - drizzle/0002_cuddly_prowler.sql
  - drizzle/meta/0002_snapshot.json

Database Changes:
  - New table: password_reset_tokens
  - Fields: id, staffId, token, expiresAt, usedAt, createdAt

API Endpoints:
  POST /api/auth/forgot-password
    - Request: { email: string }
    - Response: { success: true } (always, even if email not found)
    - Rate Limit: 5 requests per 15 minutes per IP

  POST /api/auth/reset-password
    - Request: { token: string, newPassword: string }
    - Response: { success: true }
    - Token Expiry: 1 hour

Security:
  - Token: 32-byte random hex
  - Hashed storage (bcrypt)
  - Email enumeration prevention
  - Rate limiting
```

---

## 2.2 Pending Tasks (Detailed)

### Documentation Tasks

#### Task #9: VariantSelector Documentation
```
Task ID: #9
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Low
Estimated Time: 1 hour

Location: src/components/VariantSelector.tsx
Required Documentation:
  - Component props and types
  - Usage examples
  - Variant combination logic
  - Price modifier handling
```

#### Task #10: availability.ts Documentation
```
Task ID: #10
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Low
Estimated Time: 1 hour

Location: src/lib/availability.ts
Required Documentation:
  - Stock checking logic
  - Availability rules
  - Real-time update handling
  - Cache invalidation
```

#### Task #11: Troubleshooting Section
```
Task ID: #11
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Low
Estimated Time: 2 hours

Location: .qoder/repowiki/en/content/Troubleshooting & FAQ.md
Required Sections:
  - Sync failure scenarios
  - Authentication issues
  - Offline mode problems
  - Payment processing errors
  - Data recovery procedures
```

#### Task #12: Backdate Transaction Documentation
```
Task ID: #12
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 2 hours

Location: .qoder/repowiki/en/content/Financial Management/
Required Documentation:
  - Backdate flow diagram
  - Permission requirements
  - Audit trail
  - Business rule validations
```

#### Task #13: Diagram Reference Updates
```
Task ID: #13
Priority: LOW
Status: ⏳ PENDING
Complexity: Low
Estimated Time: 1 hour

Location: .qoder/repowiki/en/
Required Updates:
  - Line number references
  - File path corrections
  - Architecture diagrams
```

---

### API & Backend Tasks

#### Task #14: API Input Validation
```
Task ID: #14
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 4 hours

Location: src/routes/api/
Endpoints to Validate:
  - /api/auth/* (all auth endpoints)
  - /api/sync/* (sync operations)
  - /api/products/* (CRUD operations)
  - /api/transactions/* (CRUD operations)

Validation Rules:
  - Request body schemas
  - Query parameter types
  - Path parameter formats
  - File upload validation
```

#### Task #15: Rate Limiting
```
Task ID: #15
Priority: MEDIUM
Status: ⏳ PENDING (exists but needs enhancement)
Complexity: Medium
Estimated Time: 3 hours

Location: src/server/utils/rateLimit.ts
Current Status: Basic rate limiting exists
Required Enhancements:
  - Per-endpoint rate limits
  - Sliding window algorithm
  - Distributed rate limiting (Redis)
  - Rate limit headers
```

#### Task #16: Structured Logging
```
Task ID: #16
Priority: MEDIUM
Status: ⏳ PENDING (exists but needs enhancement)
Complexity: Medium
Estimated Time: 3 hours

Location: src/server/utils/logger.ts
Current Status: Basic logging exists
Required Enhancements:
  - Structured JSON logs
  - Log levels by environment
  - Request ID tracking
  - Performance metrics
```

#### Task #17: Error Handling in useCheckout
```
Task ID: #17
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 2 hours

Location: src/hooks/useCheckout.ts:206
Required Improvements:
  - Error boundaries
  - User-friendly error messages
  - Recovery suggestions
  - Error reporting
```

---

### Testing Tasks

#### Task #18: Unit Tests (EXPANDED)
```
Task ID: #18
Priority: MEDIUM
Status: ⏳ EXPAND PENDING
Complexity: Medium
Estimated Time: 8 hours (additional)

Current Coverage: ~65%
Target Coverage: 80%

Tests to Add:
  - Integration tests for API endpoints
  - E2E tests for checkout flow
  - Sync conflict resolution tests
  - Encryption/decryption tests
  - Loyalty calculation tests
  - Discount application tests
```

---

### Performance & Optimization Tasks

#### Task #22: Cache Invalidation
```
Task ID: #22
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 4 hours

Location: src/lib/syncService.ts
Required Implementation:
  - Cache versioning
  - Selective invalidation
  - TTL-based expiration
  - Background refresh
```

#### Task #23: Sync Progress Indicator
```
Task ID: #23
Priority: MEDIUM
Status: ⏳ PENDING
Complexity: Low
Estimated Time: 2 hours

Location: src/components/TopNav.tsx
Required Implementation:
  - Progress bar during sync
  - Status text (syncing, synced, failed)
  - Conflict notification badge
  - Manual sync trigger
```

#### Task #24: Bundle Optimization
```
Task ID: #24
Priority: LOW
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 4 hours

Location: vite.config.ts
Required Optimizations:
  - Code splitting by route
  - Lazy loading components
  - Tree shaking verification
  - Bundle analysis
  - Tree-shakeable imports
```

#### Task #25: PWA Support
```
Task ID: #25
Priority: LOW
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 6 hours

Required Implementation:
  - Service worker
  - Web manifest
  - Offline fallback pages
  - Background sync
  - Push notifications
```

#### Task #26: Auto Backup
```
Task ID: #26
Priority: LOW
Status: ⏳ PENDING
Complexity: Medium
Estimated Time: 5 hours

Location: src/db/db.ts
Required Implementation:
  - IndexedDB export to JSON
  - Encrypted backup file
  - Cloud storage integration
  - Scheduled backup
  - One-click restore
```

---

### Advanced Features

#### Task #27: Audit Log
```
Task ID: #27
Priority: LOW
Status: ⏳ PENDING
Complexity: High
Estimated Time: 8 hours

Location: src/server/db/schema.ts
Required Implementation:
  - Audit log table schema
  - Change tracking triggers
  - User attribution
  - Query interface
  - Retention policy
```

#### Task #28: Multi-Outlet Support
```
Task ID: #28
Priority: LOW
Status: ⏳ PENDING
Complexity: Very High
Estimated Time: 16+ hours

Scope: Entire Application
Required Changes:
  - Outlet/branch data model
  - Outlet-specific configurations
  - Outlet switching UI
  - Cross-outlet reporting
  - Permission scoping by outlet
```

---

## 3. Task Priority Matrix

```
                    LOW COMPLEXITY           HIGH COMPLEXITY
                ┌───────────────────────┬───────────────────────┐
   HIGH         │  #9 VariantSelector   │  #27 Audit Log       │
   PRIORITY     │  #10 availability.ts  │                       │
                │  #11 Troubleshooting │                       │
                │  #12 Backdate docs    │                       │
                ├───────────────────────┼───────────────────────┤
   LOW          │  #13 Diagram updates  │  #28 Multi-Outlet    │
   PRIORITY     │  #23 Sync UI          │                       │
                │  #24 Bundle optimize  │                       │
                │  #25 PWA support      │                       │
                │  #26 Auto backup      │                       │
                └───────────────────────┴───────────────────────┘
```

---

## 4. Time Estimates Summary

### Completed Work
| Category | Tasks | Estimated | Actual | Variance |
|----------|-------|-----------|--------|----------|
| Database Changes | #2-#4 | 4 hours | 2 hours | -50% |
| Sync Improvements | #6-#7 | 4 hours | 2 hours | -50% |
| Bug Fix | #8 | 1 hour | 30 min | -50% |
| CI/CD Setup | NEW | 3 hours | 2 hours | -33% |
| Testing | #18 | 4 hours | 3 hours | -25% |
| Encryption | NEW | 6 hours | 4 hours | -33% |
| Conflict Resolution | NEW | 6 hours | 5 hours | -17% |
| Forgot Password | NEW | 4 hours | 3 hours | -25% |
| **TOTAL** | - | **32 hours** | **21.5 hours** | **-33%** |

### Pending Work
| Category | Tasks | Estimated |
|----------|-------|-----------|
| Documentation | #9-#13 | 7 hours |
| API Improvements | #14-#17 | 12 hours |
| Testing Expansion | #18 | 8 hours |
| Performance | #22-#24 | 10 hours |
| Advanced | #25-#28 | 35 hours |
| **TOTAL** | - | **72 hours** |

---

## 5. Implementation Dependencies

### Dependency Graph
```
Task #2 (cashierName) ──┬──► Task #4 (Migration)
Task #3 (isAdjustment) ─┘
                          │
Task #5 (Fix Docs) ───────┴──► Task #13 (Diagram Updates)
                          │
Task #6 (Sync Retry) ─────┴──► Task #7 (Exponential Backoff)
                          │
Task #14 (API Validation) ─┴──► Task #15 (Rate Limit)
                                    │
Task #15 ────────────────────────────┴──► Task #16 (Logging)

Task #22 (Cache) ─────────────────────────┴──► Task #23 (Sync UI)

Task #25 (PWA) ──────────────────────────┴──► Task #26 (Backup)
```

---

## 6. Recommended Next Steps

### Immediate (This Week)
1. **Task #9-#11**: Complete documentation tasks (7 hours)
2. **Task #17**: Fix error handling in useCheckout (2 hours)
3. **Task #22**: Implement cache invalidation (4 hours)

### Short Term (Next 2 Weeks)
4. **Task #14-#16**: API improvements (12 hours)
5. **Task #18 expansion**: More test coverage (8 hours)
6. **Task #23**: Sync progress UI (2 hours)

### Medium Term (This Month)
7. **Task #24**: Bundle optimization (4 hours)
8. **Task #25**: PWA support (6 hours)
9. **Task #26**: Auto backup (5 hours)

### Long Term (Future)
10. **Task #27**: Audit log (8 hours)
11. **Task #28**: Multi-outlet (16+ hours)

---

## 7. Resource Requirements

### Development Team
- **Current**: 1 developer
- **Recommended**: 2-3 developers for parallel work

### Infrastructure
- **CI/CD**: GitHub Actions (free tier sufficient)
- **Database**: PostgreSQL (existing)
- **Hosting**: Vercel/Netlify (for deployment)
- **Monitoring**: Recommended for production (Sentry, LogRocket)

### Tools Needed
- [ ] API documentation tool (Swagger/OpenAPI)
- [ ] E2E testing (Playwright)
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)
- [ ] Analytics (optional)

---

*Document Version: 1.0.0*
*Last Updated: 2026-04-18*
*Total Estimated Remaining: 72 hours (~9-10 working days)*
