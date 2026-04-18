# Technical Documentation - Ngepos Project
**Version:** 1.0.0
**Last Updated:** 2026-04-18
**Stack:** SolidStart 2.0 + Bun + PostgreSQL + Dexie.js

---

## Table of Contents

1. [Environment Setup](#1-environment-setup)
2. [Installation & Dependencies](#2-installation--dependencies)
3. [Application Configuration](#3-application-configuration)
4. [API Endpoints](#4-api-endpoints)
5. [Database Schema](#5-database-schema)
6. [Security Architecture](#6-security-architecture)
7. [Testing Guide](#7-testing-guide)
8. [Deployment Guide](#8-deployment-guide)

---

## 1. Environment Setup

### 1.1 Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | >= 22 | Server runtime |
| **Bun** | >= 1.0 | Package manager & runtime |
| **PostgreSQL** | >= 14 | Server database |
| **Git** | any | Version control |

### 1.2 Environment Variables

Create a `.env` file in the project root:

```bash
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://username:password@host:5432/ngepos

# ============================================
# AUTHENTICATION
# ============================================
AUTH_SECRET=your-super-secret-jwt-key-min-32-chars

# ============================================
# MAIL CONFIGURATION (for password reset)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Ngepos <noreply@ngepos.com>

# ============================================
# APPLICATION
# ============================================
APP_URL=http://localhost:3000
NODE_ENV=development

# ============================================
# ENCRYPTION (auto-generated, don't change after setup)
# ============================================
ENCRYPTION_KEY_ID=default
```

### 1.3 Required Tools

```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Verify installations
bun --version    # Should output: 1.x.x
node --version   # Should output: v22.x.x
psql --version   # Should output: psql (PostgreSQL) 14.x
```

---

## 2. Installation & Dependencies

### 2.1 Project Structure

```
ngepos/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── .qoder/                      # Wiki documentation
├── drizzle/
│   ├── meta/
│   │   ├── _journal.json       # Migration journal
│   │   └── 0000_snapshot.json  # Initial schema snapshot
│   └── 0000_little_strong_guy.sql  # Migration files
├── plans/                       # Implementation documentation
├── src/
│   ├── components/             # Reusable UI components
│   ├── hooks/                 # Custom Solid.js hooks
│   ├── lib/                   # Utility libraries
│   │   ├── availability.ts
│   │   ├── conflictResolution.ts
│   │   ├── encryption.ts
│   │   ├── exportService.ts
│   │   ├── secureDb.ts
│   │   ├── syncService.ts
│   │   └── utils.ts
│   ├── routes/                # SolidStart routes
│   │   ├── api/               # API endpoints
│   │   │   └── auth/         # Auth endpoints
│   │   ├── app/              # Protected app routes
│   │   ├── login.tsx
│   │   ├── forgot-password.tsx
│   │   └── reset-password.tsx
│   ├── server/
│   │   ├── db/
│   │   │   └── schema.ts     # Drizzle schema
│   │   └── utils/
│   │       ├── auth.ts
│   │       ├── logger.ts
│   │       ├── mail.ts
│   │       ├── rateLimit.ts
│   │       └── validation.ts
│   ├── stores/                # Solid.js stores
│   └── db/
│       └── db.ts             # Dexie.js local database
├── tests/
│   ├── setup.ts               # Test environment setup
│   ├── cart.test.ts
│   └── loyalty.test.ts
├── .eslintrc.cjs             # ESLint configuration
├── .prettierrc               # Prettier configuration
├── vitest.config.ts          # Vitest configuration
├── package.json
└── vite.config.ts
```

### 2.2 Install Dependencies

```bash
# Install all dependencies (including devDependencies)
bun install

# Expected output:
# +[number] packages installed in [time]
```

### 2.3 Available Scripts

```bash
# Development
bun run dev              # Start development server
bun run build           # Build for production
bun run start           # Start production server
bun run preview         # Preview production build

# Code Quality
bun run lint            # Run ESLint
bun run lint:fix        # Fix ESLint errors automatically
bun run format          # Format code with Prettier
bun run format:check    # Check formatting without changes
bun run typecheck       # Run TypeScript type checking

# Database
bun run db:generate     # Generate Drizzle migrations
bun run db:migrate      # Apply migrations to database
bun run db:studio       # Open Drizzle Studio (DB GUI)

# Testing
bun run test            # Run all tests once
bun run test:watch      # Run tests in watch mode
bun run test:coverage   # Run tests with coverage report
```

---

## 3. Application Configuration

### 3.1 ESLint Configuration (`.eslintrc.cjs`)

```javascript
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "solid"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:solid/recommended",
    "plugin:prettier/recommended",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "solid/no-dom-manipulation": "warn",
    "solid/prefer-show": "warn",
    "solid/self-closing-comp": "warn",
  },
};
```

### 3.2 Prettier Configuration (`.prettierrc`)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 3.3 Vitest Configuration (`vitest.config.ts`)

```typescript
/// <reference types="vitest" />
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", ".github"],
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "~": "/src",
    },
  },
});
```

### 3.4 GitHub Actions CI/CD (`.github/workflows/ci.yml`)

The CI pipeline runs on every push and PR:

1. **Lint & Typecheck Job**: ESLint → Prettier → TypeScript
2. **Test Job**: Runs after lint passes
3. **Build Job**: Production build verification
4. **Deploy Job**: Only on main branch push (requires manual setup)

---

## 4. API Endpoints

### 4.1 Authentication Endpoints

#### POST `/api/auth/login`
**Purpose:** Authenticate staff member

```typescript
// Request
{
  "email": "staff@example.com",
  "password": "securepassword"
}

// Response (Success)
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Staff Name",
    "email": "staff@example.com",
    "role": "kasir"
  },
  "token": "jwt-token-here"
}

// Response (Error)
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### POST `/api/auth/forgot-password`
**Purpose:** Request password reset email

```typescript
// Request
{
  "email": "staff@example.com"
}

// Response
{
  "success": true,
  "message": "If that email exists, a reset link was sent"
}

// Rate Limit: 5 requests per 15 minutes per IP
```

#### POST `/api/auth/reset-password`
**Purpose:** Reset password with token

```typescript
// Request
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123"
}

// Response (Success)
{
  "success": true,
  "message": "Password reset successfully"
}

// Response (Invalid Token)
{
  "success": false,
  "error": "Invalid or expired token"
}

// Token Expiry: 1 hour
```

#### POST `/api/auth/register`
**Purpose:** Register new staff member

```typescript
// Request
{
  "name": "New Staff",
  "email": "newstaff@example.com",
  "password": "SecurePassword123",
  "role": "kasir"
}

// Response
{
  "success": true,
  "user": { ... }
}
```

### 4.2 Sync Endpoints

#### POST `/api/sync`
**Purpose:** Synchronize local data with server

```typescript
// Request
{
  "deviceId": "device-uuid",
  "lastSyncTimestamp": 1713465600000,
  "pendingTransactions": [...],
  "pendingExpenses": [...],
  "versionVectors": {
    "tx_123": { "device_A": 3, "server": 5 }
  }
}

// Response
{
  "success": true,
  "serverTimestamp": 1713465700000,
  "syncedTransactions": [...],
  "conflicts": [
    {
      "entityId": "tx_456",
      "type": "transaction",
      "resolution": "server-wins",
      "data": { ... }
    }
  ],
  "changedEntities": {
    "products": [...],
    "customers": [...],
    "settings": [...]
  }
}
```

### 4.3 Other API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/verify` | POST | Verify OTP code |
| `/api/auth/resend-otp` | POST | Resend verification OTP |
| `/api/auth/me` | GET | Get current user info |
| `/api/auth/update-profile` | PATCH | Update user profile |
| `/api/auth/change-password` | POST | Change password |

---

## 5. Database Schema

### 5.1 Core Tables

#### `staff` - Staff/Employee Management
```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_id TEXT REFERENCES roles(id),
  email TEXT NOT NULL UNIQUE,
  password TEXT,                    -- Hashed with bcrypt
  is_email_verified BOOLEAN DEFAULT false,
  otp_code TEXT,                    -- Temporary OTP
  otp_expires_at TIMESTAMP,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `transactions` - Sales Transactions
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,              -- Client-generated ID
  receipt_number TEXT NOT NULL,
  total_amount DECIMAL(20,2) NOT NULL,
  original_amount DECIMAL(20,2) NOT NULL,
  cogs_total DECIMAL(20,2) NOT NULL,
  payment_method TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'SYNCED',     -- PENDING or SYNCED
  is_backdated BOOLEAN DEFAULT false,
  backdated_note TEXT,
  discount_total DECIMAL(20,2) DEFAULT 0,
  customer_id TEXT,
  cashier_name TEXT,                -- NEW: Track cashier
  is_adjustment BOOLEAN DEFAULT false,  -- NEW: Adjustment flag
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `transaction_items` - Transaction Line Items
```sql
CREATE TABLE transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  price_at_time DECIMAL(20,2) NOT NULL,
  cogs_at_time DECIMAL(20,2) NOT NULL,
  selected_variants JSONB
);
```

#### `password_reset_tokens` - Password Reset Tokens
```sql
CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,       -- Hashed token
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
```

### 5.2 Supporting Tables

| Table | Purpose |
|-------|---------|
| `roles` | Role definitions with permissions |
| `settings` | Key-value application settings |
| `products` | Product catalog |
| `raw_materials` | Inventory raw materials |
| `modifier_groups` | Product variation/modifier groups |
| `modifier_options` | Individual modifier options |
| `product_ingredients` | Recipe/bill of materials |
| `inventory_logs` | Inventory change audit trail |
| `expenses` | Business expenses |

### 5.3 Drizzle ORM Usage

```typescript
// Query example
import { db } from "~/server/db";
import { staff, transactions } from "~/server/db/schema";

const staffMembers = await db.select().from(staff).where(eq(staff.isActive, true));

// Insert example
await db.insert(transactions).values({
  id: "tx_" + Date.now(),
  receiptNumber: "RCP-001",
  totalAmount: "150000",
  // ...
});
```

---

## 6. Security Architecture

### 6.1 Encryption Module (`src/lib/encryption.ts`)

**Algorithm:** AES-256-GCM with PBKDF2 key derivation

```typescript
import { encrypt, decrypt, encryptObject, decryptObject } from "~/lib/encryption";

// Basic encryption
const encrypted = encrypt("sensitive data");
const decrypted = decrypt(encrypted);

// Object encryption
const encryptedStaff = encryptObject(staffRecord, ["password", "otpCode"]);
const decryptedStaff = decryptObject(encryptedStaff, ["password", "otpCode"]);
```

### 6.2 Sensitive Fields Classification

| Category | Fields | Priority |
|----------|--------|----------|
| **TRANSACTION** | `receiptNumber`, `paymentMethod`, `cashierName` | High |
| **STAFF** | `password`, `pin`, `otpCode` | Critical |
| **CUSTOMER** | `phone`, `email` | High |

### 6.3 Conflict Resolution (`src/lib/conflictResolution.ts`)

**Version Vector System:** Tracks changes across devices

```typescript
import {
  compareVersionVectors,
  mergeVersionVectors,
  mergeEntity,
  ConflictDetector
} from "~/lib/conflictResolution";

// Resolution strategies
type ConflictStrategy = "local-wins" | "server-wins" | "manual" | "last-write-wins";

// Usage
const detector = new ConflictDetector("device-123", "last-write-wins");
const conflict = detector.detectConflict("tx_123", "transaction", local, server);
```

---

## 7. Testing Guide

### 7.1 Test Setup (`tests/setup.ts`)

```typescript
import { beforeAll, afterAll } from "vitest";
import { cleanup } from "@testing-library/preact";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, "localStorage", { value: localStorageMock });

beforeAll(() => {
  cleanup();
});

afterAll(() => {
  cleanup();
});
```

### 7.2 Running Tests

```bash
# Run all tests once
bun run test

# Run tests in watch mode
bun run test:watch

# Run with coverage
bun run test:coverage

# Expected output:
#  PASS  tests/cart.test.ts
#  PASS  tests/loyalty.test.ts
#  Tests: 28 passed, 28 total
```

### 7.3 Writing Tests

```typescript
import { describe, it, expect } from "vitest";
import { createCartStore } from "~/stores/cart";

describe("Cart Store", () => {
  it("should add item to cart", () => {
    const cart = createCartStore();
    cart.addToCart({ id: "prod_1", name: "Coffee", price: 15000 });

    expect(cart.getCartCount()).toBe(1);
  });

  it("should increment quantity for existing item", () => {
    const cart = createCartStore();
    cart.addToCart({ id: "prod_1", name: "Coffee", price: 15000 });
    cart.addToCart({ id: "prod_1", name: "Coffee", price: 15000 });

    expect(cart.getCartCount()).toBe(2);
  });
});
```

### 7.4 Test Coverage Targets

| Metric | Target | Current |
|--------|--------|---------|
| Lines | 60% | ~65% |
| Functions | 60% | ~62% |
| Branches | 50% | ~55% |
| Statements | 60% | ~64% |

---

## 8. Deployment Guide

### 8.1 Pre-Deployment Checklist

```bash
# 1. Run all quality checks
bun run lint
bun run typecheck
bun run test
bun run build

# 2. Verify environment variables
cat .env  # Ensure production values

# 3. Run database migrations
bun run db:migrate

# 4. Check for any console errors
git log --oneline -5
```

### 8.2 Database Migration

```bash
# Generate migration (during development)
bun run db:generate

# Apply migrations (production)
bun run db:migrate

# Open Drizzle Studio (local only)
bun run db:studio
```

### 8.3 Build for Production

```bash
# Clean build
bun run build

# Preview production build locally
bun run preview
```

### 8.4 GitHub Actions Deployment

The CI/CD pipeline automatically:
1. Runs lint, typecheck, and tests
2. Builds the application
3. Deploys to production (on main branch push)

**Required Secrets:**
- `DATABASE_URL` - Production database connection string

### 8.5 Manual Deployment (Alternative)

```bash
# Build the application
bun run build

# Upload dist/ folder to server via rsync
rsync -avz --delete dist/ user@server:/var/www/ngepos/

# Or deploy to Vercel
vercel --prod
```

### 8.6 Post-Deployment Verification

1. **Health Check**
   ```bash
   curl https://ngepos.id/api/health
   ```

2. **Verify Version**
   - Check package.json version matches
   - Confirm new features work

3. **Monitor for Errors**
   - Check GitHub Actions logs
   - Monitor server logs

---

## Appendix A: Quick Reference

### Common Commands
```bash
bun install           # Install dependencies
bun run dev          # Start dev server
bun run build        # Build production
bun run test         # Run tests
bun run lint         # Lint code
bun run db:generate  # Generate migrations
```

### Environment Variables
```bash
DATABASE_URL         # PostgreSQL connection
AUTH_SECRET          # JWT secret key
SMTP_*               # Mail configuration
APP_URL              # Application URL
```

### Key Files
```bash
src/lib/encryption.ts        # AES-256-GCM encryption
src/lib/conflictResolution.ts  # Version vector sync
src/lib/syncService.ts      # Offline sync service
src/server/db/schema.ts     # Database schema
tests/*.test.ts             # Unit tests
```

---

## Appendix B: Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| `Module not found` | Run `bun install` |
| TypeScript errors | Run `bun run typecheck` |
| ESLint errors | Run `bun run lint:fix` |
| Database connection | Check `DATABASE_URL` env var |
| Port already in use | Change port or kill process |

### Getting Help

1. Check the wiki: `.qoder/repowiki/`
2. Check implementation docs: `plans/`
3. Run diagnostics: `bun run typecheck && bun run lint`

---

*Document Version: 1.0.0*
*Last Updated: 2026-04-18*
*Maintained by: Development Team*
