# Project Overview

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [package.json](file://package.json)
- [src/app.tsx](file://src/app.tsx)
- [src/routes/app/index.tsx](file://src/routes/app/index.tsx)
- [src/stores/cart.ts](file://src/stores/cart.ts)
- [src/hooks/useCheckout.ts](file://src/hooks/useCheckout.ts)
- [src/db/db.ts](file://src/db/db.ts)
- [src/lib/syncService.ts](file://src/lib/syncService.ts)
- [src/routes/api/sync/index.ts](file://src/routes/api/sync/index.ts)
- [src/routes/app/reports/index.tsx](file://src/routes/app/reports/index.tsx)
- [src/routes/app/inventory/products.tsx](file://src/routes/app/inventory/products.tsx)
- [src/routes/app/settings/staff.tsx](file://src/routes/app/settings/staff.tsx)
- [src/routes/app/marketing/members.tsx](file://src/routes/app/marketing/members.tsx)
- [src/lib/availability.ts](file://src/lib/availability.ts)
- [src/stores/loyalty.ts](file://src/stores/loyalty.ts)
- [src/components/BottomNav.tsx](file://src/components/BottomNav.tsx)
- [src/components/TopNav.tsx](file://src/components/TopNav.tsx)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
NgePos is an Indonesian F&B Point-of-Sale system designed with an offline-first architecture for reliability in diverse environments. It targets small to medium-sized coffee shops, restaurants, and food-and-beverage outlets that need a modern, mobile-optimized POS with robust inventory tracking, financial reporting, and staff management. The system blends a responsive Solid.js frontend with a local IndexedDB-backed store and a PostgreSQL backend for synchronization, enabling seamless operation whether online or offline.

Key value propositions:
- Reliable offline operation with automatic synchronization when connectivity resumes
- Real-time POS checkout with variant support, promotions, and loyalty stamps
- Comprehensive inventory management with recipe-based costing (HPP)
- Financial reporting with profit analysis and export capabilities
- Staff and role-based access control with integrated QR-based member management

## Project Structure
The project follows a modular, feature-based structure under src/, with clear separation between client-side UI, stores, database, and server-side APIs.

```mermaid
graph TB
subgraph "Client (Solid.js)"
UI["UI Routes<br/>src/routes/app/*"]
Stores["State Stores<br/>src/stores/*"]
DBLocal["Local DB (Dexie)<br/>src/db/db.ts"]
Libs["Utilities<br/>src/lib/*"]
Components["Shared Components<br/>src/components/*"]
end
subgraph "Server (API)"
API["API Routes<br/>src/routes/api/*"]
Postgres["PostgreSQL (Drizzle ORM)"]
end
UI --> Stores
UI --> DBLocal
Stores --> DBLocal
Libs --> DBLocal
Components --> UI
UI --> API
API --> Postgres
```

**Diagram sources**
- [src/app.tsx:24-41](file://src/app.tsx#L24-L41)
- [src/db/db.ts:270-498](file://src/db/db.ts#L270-L498)
- [src/lib/syncService.ts:4-58](file://src/lib/syncService.ts#L4-L58)
- [src/routes/api/sync/index.ts:10-97](file://src/routes/api/sync/index.ts#L10-L97)

**Section sources**
- [src/app.tsx:1-42](file://src/app.tsx#L1-L42)
- [src/db/db.ts:270-498](file://src/db/db.ts#L270-L498)
- [src/lib/syncService.ts:4-58](file://src/lib/syncService.ts#L4-L58)
- [src/routes/api/sync/index.ts:10-97](file://src/routes/api/sync/index.ts#L10-L97)

## Core Components
- POS Checkout Pipeline: Handles cart assembly, variant modifiers, pricing, discounts, and inventory updates with atomic transactions.
- Local Database (Dexie): Provides offline-first persistence for products, transactions, inventory logs, staff, and marketing data.
- Sync Engine: Pushes pending transactions and expenses to the backend and marks them synced upon successful confirmation.
- Reporting Dashboard: Computes financial metrics, trends, and payment distributions with export to Excel/PDF.
- Inventory Manager: Manages recipes, HPP calculation, stock visibility, and variant templates.
- Staff Management: CRUD for staff, role assignment, and permission enforcement.
- Loyalty & Members: QR-based member cards, stamp accumulation, and reward automation.

**Section sources**
- [src/stores/cart.ts:16-257](file://src/stores/cart.ts#L16-L257)
- [src/hooks/useCheckout.ts:30-216](file://src/hooks/useCheckout.ts#L30-L216)
- [src/db/db.ts:270-498](file://src/db/db.ts#L270-L498)
- [src/lib/syncService.ts:4-58](file://src/lib/syncService.ts#L4-L58)
- [src/routes/app/reports/index.tsx:49-715](file://src/routes/app/reports/index.tsx#L49-L715)
- [src/routes/app/inventory/products.tsx:92-800](file://src/routes/app/inventory/products.tsx#L92-L800)
- [src/routes/app/settings/staff.tsx:22-462](file://src/routes/app/settings/staff.tsx#L22-L462)
- [src/stores/loyalty.ts:1-174](file://src/stores/loyalty.ts#L1-L174)

## Architecture Overview
NgePos employs an offline-first architecture:
- Client runs locally with Solid.js and Dexie for immediate responsiveness.
- Backend is a PostgreSQL database accessed via Drizzle ORM and secured with JWT.
- A lightweight sync endpoint accepts batches of transactions and expenses, upserting records transactionally.

```mermaid
sequenceDiagram
participant Cashier as "Cashier App"
participant Cart as "Cart Store"
participant Checkout as "useCheckout Hook"
participant LocalDB as "Dexie (Local)"
participant Sync as "syncService"
participant API as "API Sync Endpoint"
participant ServerDB as "PostgreSQL"
Cashier->>Cart : Add items, apply variants/discounts
Cashier->>Checkout : Submit transaction
Checkout->>LocalDB : Begin transaction (rw)
Checkout->>LocalDB : Update inventory/logs/products
Checkout-->>Cashier : Commit result (transactionId)
Checkout->>Sync : triggerSync()
Sync->>LocalDB : Load PENDING transactions/expenses
Sync->>API : POST /api/sync (with auth)
API->>ServerDB : Upsert transactions/items/expenses
API-->>Sync : Success
Sync->>LocalDB : Mark status=SYNCED
```

**Diagram sources**
- [src/stores/cart.ts:16-257](file://src/stores/cart.ts#L16-L257)
- [src/hooks/useCheckout.ts:30-216](file://src/hooks/useCheckout.ts#L30-L216)
- [src/lib/syncService.ts:4-58](file://src/lib/syncService.ts#L4-L58)
- [src/routes/api/sync/index.ts:10-97](file://src/routes/api/sync/index.ts#L10-L97)

## Detailed Component Analysis

### POS Checkout and Cart Management
The checkout pipeline integrates cart state, discounts, and inventory updates atomically. It computes dynamic HPP from recipes and variant modifiers, persists transaction items, and triggers background sync.

```mermaid
flowchart TD
Start(["Checkout Initiated"]) --> Snapshot["Snapshot Cart State"]
Snapshot --> Compute["Compute Discounts & Totals"]
Compute --> Validate{"Cart Empty?"}
Validate --> |Yes| Abort["Abort with Error"]
Validate --> |No| TxnBegin["Begin Dexie RW Transaction"]
TxnBegin --> LoopItems["For Each Cart Item"]
LoopItems --> LoadProduct["Load Product & Variants"]
LoadProduct --> CalcRecipe["Calculate Recipe HPP"]
CalcRecipe --> UpdateStock["Update Product Stock"]
UpdateStock --> LogInv["Write Inventory Logs"]
LogInv --> Accumulate["Accumulate cogsTotal"]
Accumulate --> NextItem{"More Items?"}
NextItem --> |Yes| LoopItems
NextItem --> |No| PersistTxn["Persist Transaction & Items"]
PersistTxn --> PostEffects["Update Loyalty & Rewards"]
PostEffects --> TriggerSync["Trigger Background Sync"]
TriggerSync --> Done(["Success"])
Abort --> Done
```

**Diagram sources**
- [src/hooks/useCheckout.ts:38-213](file://src/hooks/useCheckout.ts#L38-L213)
- [src/stores/cart.ts:132-246](file://src/stores/cart.ts#L132-L246)

**Section sources**
- [src/stores/cart.ts:16-257](file://src/stores/cart.ts#L16-L257)
- [src/hooks/useCheckout.ts:30-216](file://src/hooks/useCheckout.ts#L30-L216)

### Local Database Schema and Offline Persistence
NgePos uses Dexie to define a versioned schema covering products, categories, transactions, inventory logs, staff, roles, discounts, campaigns, memberships, and loyalty data. The schema evolves with migrations to add new capabilities while preserving backward compatibility.

```mermaid
erDiagram
PRODUCTS {
string id PK
string name
number price
number cogs
string category
number stock
string image
boolean isActive
}
CATEGORIES {
string id PK
string name
number orderIndex
string icon
}
TRANSACTIONS {
string id PK
string receiptNumber
number totalAmount
number originalAmount
number cogsTotal
string paymentMethod
number timestamp
string status
boolean isBackdated
string discountNote
string customerId
string cashierName
}
TRANSACTION_ITEMS {
string id PK
string transactionId FK
string productId
string productName
number quantity
number priceAtTime
number cogsAtTime
}
RAW_MATERIAL_LIBRARY {
string id PK
string name
string unit
number stock
number costPerUnit
boolean isActive
}
INVENTORY_LOGS {
string id PK
string materialId FK
string type
number quantity
number unitCost
number timestamp
}
STAFF {
string id PK
string name
string roleId FK
string pin
string email
string phone
boolean isActive
number createdAt
}
ROLES {
string id PK
string name
string[] permissions
}
CUSTOMERS {
string id PK
string qrCode
string status
string name
string phone
string email
number createdAt
number assignedAt
}
LOYALTY_PROGRAMS {
string id PK
string name
number targetStamps
number minTransaction
string rewardType
number rewardValue
string rewardProductId
number expiryMonths
number rewardClaimDays
string afterClaim
string[] excludedProductIds
boolean allowWithPromo
boolean isActive
}
CUSTOMER_STAMPS {
string id PK
string customerId FK
string programId FK
string transactionId FK
number stampedAt
}
CUSTOMER_REWARDS {
string id PK
string customerId FK
string programId FK
string status
number availableAt
number claimedAt
string claimedTransactionId
number expiresAt
}
PRODUCTS ||--o{ TRANSACTION_ITEMS : "sold in"
RAW_MATERIAL_LIBRARY ||--o{ INVENTORY_LOGS : "logs"
STAFF ||--o{ TRANSACTIONS : "cashiers"
CUSTOMERS ||--o{ CUSTOMER_STAMPS : "stamps"
LOYALTY_PROGRAMS ||--o{ CUSTOMER_STAMPS : "tracks"
CUSTOMERS ||--o{ CUSTOMER_REWARDS : "rewards"
```

**Diagram sources**
- [src/db/db.ts:62-289](file://src/db/db.ts#L62-L289)

**Section sources**
- [src/db/db.ts:270-498](file://src/db/db.ts#L270-L498)

### Financial Reporting and Export
The reporting dashboard aggregates sales, expenses, and payment methods, computes profit metrics, and exports summaries to Excel or PDF. It supports filtering by predefined periods and custom date ranges.

```mermaid
flowchart TD
SelectPeriod["Select Period / Custom Range"] --> FetchData["Fetch Transactions & Expenses"]
FetchData --> Aggregate["Aggregate Metrics<br/>Omset, HPP, Expenses, Payments"]
Aggregate --> Compute["Compute Profit & Trends"]
Compute --> Render["Render Charts & Summary Cards"]
Render --> Export{"Export?"}
Export --> |Excel| XLSX["Export to Excel"]
Export --> |PDF| PDF["Export to PDF"]
Export --> |None| End(["Done"])
XLSX --> End
PDF --> End
```

**Diagram sources**
- [src/routes/app/reports/index.tsx:211-370](file://src/routes/app/reports/index.tsx#L211-L370)

**Section sources**
- [src/routes/app/reports/index.tsx:49-715](file://src/routes/app/reports/index.tsx#L49-L715)

### Inventory Management and HPP Calculation
The inventory module manages products with optional recipes and variants. It calculates HPP from raw materials and variant modifiers, enforces availability checks, and maintains inventory logs for traceability.

```mermaid
flowchart TD
OpenProduct["Open Product Editor"] --> LoadData["Load Categories, Templates, Materials"]
LoadData --> EditFields["Edit Name/Price/Category/Image"]
EditFields --> ManageRecipe["Manage Raw Materials & Quantities"]
ManageRecipe --> SyncLibrary["Sync with Raw Material Library"]
SyncLibrary --> CalcHPP["Auto-Calculate HPP & Margin"]
CalcHPP --> ManageVariants["Define Variant Groups & Options"]
ManageVariants --> Preview["Preview Availability & Pricing"]
Preview --> Save["Save Product & Discounts"]
```

**Diagram sources**
- [src/routes/app/inventory/products.tsx:92-800](file://src/routes/app/inventory/products.tsx#L92-L800)
- [src/lib/availability.ts:12-39](file://src/lib/availability.ts#L12-L39)

**Section sources**
- [src/routes/app/inventory/products.tsx:92-800](file://src/routes/app/inventory/products.tsx#L92-L800)
- [src/lib/availability.ts:1-40](file://src/lib/availability.ts#L1-L40)

### Staff Management and Permissions
Staff management supports adding, editing, activating/deactivating employees, assigning roles, and enforcing permission-based navigation tabs.

```mermaid
sequenceDiagram
participant Admin as "Admin"
participant StaffUI as "Staff Management Page"
participant Store as "Dexie Store"
Admin->>StaffUI : Open Staff List
StaffUI->>Store : Load Staff & Roles
Admin->>StaffUI : Add/Edit Staff
StaffUI->>Store : Put/Update Staff
Store-->>StaffUI : Success
StaffUI-->>Admin : Toast Success
Admin->>StaffUI : Toggle Active Status
StaffUI->>Store : Update isActive
```

**Diagram sources**
- [src/routes/app/settings/staff.tsx:35-138](file://src/routes/app/settings/staff.tsx#L35-L138)

**Section sources**
- [src/routes/app/settings/staff.tsx:22-462](file://src/routes/app/settings/staff.tsx#L22-L462)
- [src/components/BottomNav.tsx:14-64](file://src/components/BottomNav.tsx#L14-L64)

### Loyalty Program and Member Management
Members are managed with QR codes, stamp accumulation, and reward automation. The system tracks eligibility, expiry, and claim status.

```mermaid
sequenceDiagram
participant Cashier as "Cashier"
participant Loyalty as "Loyalty Store"
participant DB as "Dexie Store"
participant Printer as "Member Print Overlay"
Cashier->>Loyalty : Scan Member QR
Loyalty->>DB : Lookup Customer & Active Program
DB-->>Loyalty : Customer & Program
Loyalty-->>Cashier : Eligibility & Progress
Cashier->>Loyalty : Process Stamp on Purchase
Loyalty->>DB : Add Stamp & Check Reward
DB-->>Loyalty : Updated Progress
Cashier->>Printer : Bulk Print Member Cards
Printer-->>Cashier : Print Preview
```

**Diagram sources**
- [src/stores/loyalty.ts:28-174](file://src/stores/loyalty.ts#L28-L174)
- [src/routes/app/marketing/members.tsx:56-236](file://src/routes/app/marketing/members.tsx#L56-L236)

**Section sources**
- [src/stores/loyalty.ts:1-174](file://src/stores/loyalty.ts#L1-L174)
- [src/routes/app/marketing/members.tsx:34-791](file://src/routes/app/marketing/members.tsx#L34-L791)

### Mobile-Optimized UI and Offline Awareness
The UI adapts to mobile screens with a bottom navigation bar and top header that displays offline status. The app seeds initial data on mount and provides loading states for smooth UX.

```mermaid
graph TB
App["App Root<br/>src/app.tsx"] --> TopNav["TopNav<br/>Offline Indicator"]
App --> BottomNav["BottomNav<br/>Tab Navigation"]
App --> Routes["Feature Routes<br/>POS / Reports / Inventory / Staff / Marketing"]
Routes --> OfflineBadge["Offline Badge<br/>TopNav"]
Routes --> MobileTabs["Mobile Tabs<br/>BottomNav"]
```

**Diagram sources**
- [src/app.tsx:24-41](file://src/app.tsx#L24-L41)
- [src/components/TopNav.tsx:4-42](file://src/components/TopNav.tsx#L4-L42)
- [src/components/BottomNav.tsx:22-64](file://src/components/BottomNav.tsx#L22-L64)

**Section sources**
- [src/app.tsx:1-42](file://src/app.tsx#L1-L42)
- [src/components/TopNav.tsx:1-43](file://src/components/TopNav.tsx#L1-L43)
- [src/components/BottomNav.tsx:1-65](file://src/components/BottomNav.tsx#L1-L65)

## Dependency Analysis
Technology stack highlights:
- Frontend: Solid.js with router and start framework
- Styling: TailwindCSS with custom utilities
- State: Solid stores and resources
- Database (client): Dexie for IndexedDB
- Database (server): PostgreSQL with Drizzle ORM
- Authentication: JWT-based API protection
- Utilities: Chart.js for charts, xlsx/pdf generation, QR code generation/printing

```mermaid
graph LR
Solid["Solid.js"] --> Router["@solidjs/router"]
Solid --> Start["@solidjs/start"]
Solid --> UI["UI Components"]
UI --> Stores["Solid Stores"]
Stores --> Dexie["Dexie (IndexedDB)"]
Solid --> Utils["Utilities"]
Utils --> ChartJS["Chart.js"]
Utils --> XLSX["xlsx"]
Utils --> PDF["jspdf + autotable"]
Utils --> QR["qrcode + html5-qrcode"]
Solid --> API["API Routes"]
API --> Drizzle["Drizzle ORM"]
Drizzle --> Postgres["PostgreSQL"]
API --> JWT["jose (JWT)"]
```

**Diagram sources**
- [package.json:11-39](file://package.json#L11-L39)
- [src/routes/api/sync/index.ts:3-8](file://src/routes/api/sync/index.ts#L3-L8)

**Section sources**
- [package.json:1-56](file://package.json#L1-L56)
- [src/routes/api/sync/index.ts:10-97](file://src/routes/api/sync/index.ts#L10-L97)

## Performance Considerations
- Offline-first design ensures responsive UI even without network connectivity.
- Debounced sync service prevents excessive server calls and reduces bandwidth usage.
- Resource-based rendering minimizes DOM updates and improves perceived performance.
- IndexedDB-backed local queries enable fast filtering and sorting of products, categories, and reports.
- Recommendation: Use createResource for heavy computations and memoized selectors for derived data to further optimize rendering.

## Troubleshooting Guide
Common issues and resolutions:
- Offline mode detected: The top header displays an offline indicator. Transactions are saved locally and synced when connectivity returns.
- Sync failures: Verify JWT token presence and validity. Check server logs for sync endpoint errors.
- Empty cart on checkout: Ensure items are added to the cart and variants are confirmed before submitting.
- Inventory discrepancies: Review inventory logs and raw material library entries for accurate HPP calculations.
- Reporting delays: Allow sync to complete; reports reflect synced data.

**Section sources**
- [src/components/TopNav.tsx:21-27](file://src/components/TopNav.tsx#L21-L27)
- [src/lib/syncService.ts:4-58](file://src/lib/syncService.ts#L4-L58)
- [src/hooks/useCheckout.ts:38-51](file://src/hooks/useCheckout.ts#L38-L51)
- [src/db/db.ts:270-498](file://src/db/db.ts#L270-L498)
- [src/routes/app/reports/index.tsx:211-370](file://src/routes/app/reports/index.tsx#L211-L370)

## Conclusion
NgePos delivers a practical, offline-first POS solution tailored for Indonesian F&B businesses. Its combination of Solid.js, Dexie, and PostgreSQL enables reliable, real-time operations with powerful reporting and inventory controls. The system’s modular design, permission-aware navigation, and mobile-first UI make it suitable for diverse operational needs, from daily cash register tasks to strategic financial oversight.