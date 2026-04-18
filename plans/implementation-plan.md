# Implementation Plan - Ngepos Project
**Version:** 1.0.0
**Last Updated:** 2026-04-18
**Status:** Implementation Complete

---

## 1. Executive Summary

Ngepos adalah sistem POS (Point of Sale) mobile-first yang dirancang untuk bisnis F&B di Indonesia. Sistem ini menggunakan arsitektur offline-first dengan sinkronisasi real-time ke server PostgreSQL.

### Key Metrics
- **Total Commits**: 1 major feature commit
- **Files Changed**: 52 files
- **Lines Added**: ~5,490 lines
- **Test Coverage**: 28 unit tests (60% coverage target)

---

## 2. System Architecture

### 2.1 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend Framework** | SolidStart 2.0 (SPA) | Reactive UI with client-side rendering |
| **State Management** | Solid.js Signals + Stores | Fine-grained reactivity |
| **Local Storage** | Dexie.js (IndexedDB) | Offline data persistence |
| **Server Database** | PostgreSQL + Drizzle ORM | Server-side data storage |
| **Authentication** | Lucia Auth + JOSE | Secure authentication |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Testing** | Vitest + Testing Library | Unit and integration testing |
| **CI/CD** | GitHub Actions | Automated pipeline |

### 2.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (SPA)                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │   UI Layer   │  │ State Layer  │  │  Offline Storage     │ │
│  │  (Solid.js)  │  │  (Signals)   │  │  (Dexie.js)          │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│                            │                     │              │
│                     ┌──────┴──────┐              │              │
│                     │ Sync Service │◄─────────────┘              │
│                     │ (Conflict    │                               │
│                     │  Resolution) │                               │
│                     └──────┬───────┘                              │
│                            │                                       │
│  ┌────────────────────────┴─────────────────────────────────┐   │
│  │              Encryption Layer (AES-256-GCM)                │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVER                                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ API Routes   │  │ Auth Layer   │  │  Database Layer      │ │
│  │ (SolidStart) │  │ (Lucia+JOSE) │  │  (Drizzle+Postgres)  │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        OFFLINE-FIRST FLOW                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. USER ACTION                                                  │
│     └─► Store Action (addToCart, updateQuantity, etc.)          │
│                                                                   │
│  2. LOCAL UPDATE (Immediate)                                      │
│     └─► Dexie.js IndexedDB ◄── Encrypted sensitive fields      │
│     └─► UI Update via Solid.js signals (reactive)                │
│     └─► Mark record as PENDING sync                              │
│                                                                   │
│  3. SYNC TRIGGER (Debounced 2 seconds)                          │
│     └─► SyncService checks queue                                 │
│     └─► Prepare payload with version vectors                    │
│                                                                   │
│  4. SERVER SYNC                                                  │
│     └─► POST /api/sync with conflict resolution metadata         │
│     └─► Server processes with Drizzle ORM                       │
│     └─► Returns merged/changed records                          │
│                                                                   │
│  5. CONFLICT RESOLUTION (if needed)                              │
│     └─► Compare version vectors                                  │
│     └─► Apply strategy: server-wins, local-wins, merge, manual   │
│     └─► Update local storage                                     │
│                                                                   │
│  6. UI UPDATE (Post-sync)                                        │
│     └─► Mark synced records                                      │
│     └─► Refresh UI if needed                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Security Architecture

### 3.1 Encryption Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SENSITIVE DATA ──► FIELD DETECTION ──► AES-256-GCM ENCRYPTION   │
│       │                   │                    │                │
│       │                   ▼                    ▼                │
│       │          ┌────────────────┐    ┌───────────────┐        │
│       │          │ SensitiveField │    │ PBKDF2 Key    │        │
│       │          │ Definitions    │    │ Derivation    │        │
│       │          │ (TRANSACTION,   │    │ (100k iter)   │        │
│       │          │  STAFF, CUSTOMER│    │               │        │
│       │          └────────────────┘    └───────────────┘        │
│       │                                       │                  │
│       │                                       ▼                  │
│       │                              ┌───────────────┐          │
│       │                              │ 128-bit IV    │          │
│       │                              │ Generation    │          │
│       │                              └───────────────┘          │
│       │                                       │                  │
│       ▼                                       ▼                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              ENCRYPTED PACKAGE                       │        │
│  │  { iv, ciphertext, tag, version, keyId }           │        │
│  └─────────────────────────────────────────────────────┘        │
│                          │                                       │
│                          ▼                                       │
│                   IndexedDB Storage                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Sensitive Fields Classification

| Category | Fields | Encryption Priority |
|----------|--------|-------------------|
| **TRANSACTION** | `receiptNumber`, `paymentMethod`, `cashierName` | High |
| **STAFF** | `password`, `pin`, `otpCode` | Critical |
| **CUSTOMER** | `phone`, `email` | High |

---

## 4. Sync & Conflict Resolution Architecture

### 4.1 Version Vector System

```
┌─────────────────────────────────────────────────────────────────┐
│                   VERSION VECTOR SYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Entity Metadata:                                                │
│  {                                                               │
│    id: "tx_123",                                                 │
│    versionVector: {                                              │
│      "device_A": 3,     // device_A has seen 3 versions         │
│      "device_B": 5,     // device_B has seen 5 versions        │
│      "server": 10       // server has processed 10 versions     │
│    },                                                            │
│    updatedAt: 1713465600000,                                     │
│    lastModifiedBy: "device_A"                                    │
│  }                                                               │
│                                                                  │
│  Comparison Rules:                                              │
│  - local.version > server.version  → local is newer             │
│  - local.version < server.version  → server is newer             │
│  - local forks from common ancestor → CONFLICT                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Conflict Resolution Strategies

| Strategy | Use Case | Behavior |
|----------|----------|----------|
| **server-wins** | Default for critical data | Always prefer server version |
| **local-wins** | User-initiated actions | Always prefer local version |
| **last-write-wins** | Non-critical updates | Use timestamp comparison |
| **merge** | Collaborative fields | Auto-merge non-conflicting fields |
| **manual** | Critical conflicts | User decides via UI prompt |

### 4.3 Merge Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                      MERGE ALGORITHM                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: local {a:1, b:2}, server {a:1, c:3}                      │
│                                                                  │
│  Step 1: Find common base (a:1 exists in both)                  │
│                                                                  │
│  Step 2: Identify changed fields                                │
│          local: {b:2} (only b changed locally)                 │
│          server: {c:3} (only c changed on server)               │
│                                                                  │
│  Step 3: Merge non-conflicting changes                         │
│          merged: {a:1, b:2, c:3}                                │
│                                                                  │
│  Step 4: If same field modified differently → CONFLICT          │
│          local {x:1}, server {x:2} → Conflict!                  │
│                                                                  │
│  Output: {merged: {...}, conflicts: [...]}                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. CI/CD Pipeline

### 5.1 GitHub Actions Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                      CI/CD PIPELINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  TRIGGER: Push to any branch (PR checks)                        │
│           Push to master (full pipeline + deploy)               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STAGE 1: LINT & TYPE CHECK (Parallel)                     │   │
│  │  ├── ESLint (src/**/*.ts, src/**/*.tsx)                   │   │
│  │  ├── Prettier (format check)                             │   │
│  │  └── TypeScript (tsc --noEmit)                           │   │
│  │  Duration: ~2-3 minutes                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STAGE 2: UNIT TESTS                                      │   │
│  │  ├── Vitest (jsdom environment)                          │   │
│  │  ├── Coverage thresholds enforced                        │   │
│  │  └── Required: 60% lines, 60% funcs, 50% branches        │   │
│  │  Duration: ~1-2 minutes                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STAGE 3: BUILD                                           │   │
│  │  ├── Vite build                                          │   │
│  │  ├── Bundle size check                                   │   │
│  │  └── Artifact upload                                     │   │
│  │  Duration: ~3-5 minutes                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ STAGE 4: DEPLOY (Master only)                            │   │
│  │  └── Vercel/Netlify deployment                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Quality Gates

| Gate | Requirement | Blocking |
|------|-------------|----------|
| ESLint | No errors (warnings allowed) | ✅ Yes |
| Prettier | All files formatted | ✅ Yes |
| TypeScript | No type errors | ✅ Yes |
| Tests | All tests pass | ✅ Yes |
| Coverage | Above thresholds | ⚠️ Warning only |
| Build | Successful | ✅ Yes |

---

## 6. Project Timeline

### Phase 1: Foundation (Completed)
- **Duration**: 2 weeks
- **Focus**: Core POS functionality
- **Deliverables**: Cart, checkout, basic sync

### Phase 2: Authentication & Security (Completed)
- **Duration**: 1 week
- **Focus**: Auth system, password reset
- **Deliverables**: Login, register, forgot password, encryption

### Phase 3: Quality Infrastructure (Completed - Current)
- **Duration**: 1 week
- **Focus**: CI/CD, testing, documentation
- **Deliverables**: Vitest, ESLint, GitHub Actions, conflict resolution

### Phase 4: Advanced Features (Planned)
- **Duration**: 2 weeks
- **Focus**: PWA, offline enhancements
- **Deliverables**: Service worker, background sync, push notifications

### Phase 5: Optimization (Planned)
- **Duration**: 1 week
- **Focus**: Performance, bundle size
- **Deliverables**: Code splitting, lazy loading

---

## 7. Implementation Metrics

### Code Quality
- **ESLint Rules**: 15 active rules
- **Prettier**: 8 formatting options
- **TypeScript**: Strict mode enabled

### Testing
- **Unit Tests**: 28 tests
- **Test Files**: 3 (cart, loyalty, setup)
- **Coverage Target**: 60% lines, 60% functions

### Security
- **Encryption**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Sensitive Fields**: 9 fields across 3 categories

### Documentation
- **Wiki Files**: 32 updated
- **Plans**: 2 implementation docs
- **API Docs**: Updated authentication endpoints

---

## 8. Dependencies Added

### Production Dependencies
None (all existing)

### Development Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | ^9.0.0 | Linting |
| `prettier` | ^3.0.0 | Code formatting |
| `vitest` | ^2.0.0 | Testing |
| `@vitest/coverage-v8` | ^2.0.0 | Coverage |
| `@testing-library/jest-dom` | ^6.4.0 | Test assertions |
| `@testing-library/preact` | ^3.2.0 | Component testing |
| `eslint-config-prettier` | ^10.0.0 | ESLint+Prettier compat |
| `eslint-plugin-prettier` | ^5.0.0 | Prettier in ESLint |
| `eslint-plugin-solid` | ^12.0.0 | Solid.js linting |
| `jsdom` | ^24.0.0 | DOM simulation |

---

## 9. Future Roadmap

### High Priority
1. **Documentation Tasks (#9-#13)**
   - VariantSelector documentation
   - availability.ts documentation
   - Troubleshooting section
   - Backdate feature docs

2. **Error Handling (#17)**
   - Enhanced error boundaries in useCheckout
   - User-friendly error messages

### Medium Priority
3. **Testing Expansion (#18)**
   - Integration tests
   - E2E tests with Playwright
   - API endpoint tests

4. **Cache Invalidation (#22)**
   - Sync cache management
   - Selective re-sync

5. **Sync UI (#23)**
   - Progress indicator
   - Conflict resolution UI

### Low Priority
6. **Bundle Optimization (#24)**
   - Code splitting
   - Tree shaking

7. **PWA Support (#25)**
   - Service worker
   - Background sync
   - Push notifications

8. **Auto Backup (#26)**
   - IndexedDB export/import
   - Cloud backup

9. **Audit Log (#27)**
   - Change tracking
   - Activity history

10. **Multi-Outlet (#28)**
    - Multi-store support
    - Outlet switching

---

## 10. Appendix

### A. File Structure Overview
```
ngepos/
├── .eslintrc.cjs           # ESLint configuration
├── .prettierrc            # Prettier configuration
├── .github/
│   └── workflows/
│       └── ci.yml         # GitHub Actions pipeline
├── vitest.config.ts       # Vitest configuration
├── tests/
│   ├── setup.ts           # Test environment setup
│   ├── cart.test.ts       # Cart store tests
│   └── loyalty.test.ts   # Loyalty store tests
├── src/
│   ├── lib/
│   │   ├── encryption.ts      # AES-256-GCM encryption
│   │   ├── secureDb.ts       # Encrypted Dexie wrapper
│   │   ├── conflictResolution.ts  # Version vector conflict resolution
│   │   └── syncService.ts    # Sync with retry logic
│   └── routes/
│       ├── forgot-password.tsx
│       ├── reset-password.tsx
│       └── api/auth/
│           ├── forgot-password.ts
│           └── reset-password.ts
└── plans/
    ├── implementation-summary.md
    └── forgot-password-implementation.md
```

### B. Environment Variables Required
```bash
# Database
DATABASE_URL=postgresql://...

# Auth
AUTH_SECRET=...

# Mail
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=noreply@ngepos.com

# App
APP_URL=http://localhost:3000
```

### C. Installation Steps
```bash
# 1. Install dependencies
bun install

# 2. Setup database
bun run db:generate
bun run db:migrate

# 3. Run development server
bun run dev

# 4. Run tests
bun run test

# 5. Run linting
bun run lint
```
