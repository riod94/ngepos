# Financial Reporting

<cite>
**Referenced Files in This Document**
- [src/routes/app/reports/index.tsx](file://src/routes/app/reports/index.tsx)
- [src/routes/app/reports/history/index.tsx](file://src/routes/app/reports/history/index.tsx)
- [src/routes/app/reports/history/backdate.tsx](file://src/routes/app/reports/history/backdate.tsx)
- [src/routes/app/reports/expenses.tsx](file://src/routes/app/reports/expenses.tsx)
- [src/components/FinancialCharts.tsx](file://src/components/FinancialCharts.tsx)
- [src/components/DateFilter.tsx](file://src/components/DateFilter.tsx)
- [src/lib/exportService.ts](file://src/lib/exportService.ts)
- [src/db/db.ts](file://src/db/db.ts)
- [package.json](file://package.json)
- [PRD.txt](file://PRD.txt)
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
10. [Appendices](#appendices)

## Introduction
This document explains the financial reporting capabilities of the NgePos POS system. It covers sales analytics, revenue tracking, transaction history, profit margin and cost of goods sold (COGS) analysis, the reporting dashboard with interactive charts and date-range filtering, export functionality to Excel and PDF, historical data management including backdated transactions, and operational reconciliation. It also outlines profit and loss calculations, expense-to-revenue ratios, comparative analysis across periods, and practical examples of report generation and insights extraction. Compliance and tax-reporting considerations are addressed alongside customization and visualization features.

## Project Structure
The financial reporting module is organized around four primary pages and supporting components:
- Dashboard and analytics: [Reports](file://src/routes/app/reports/index.tsx)
- Transaction history: [History](file://src/routes/app/reports/history/index.tsx)
- Backdated transactions: [Backdate](file://src/routes/app/reports/history/backdate.tsx)
- Operational expenses: [Expenses](file://src/routes/app/reports/expenses.tsx)
- Interactive charts: [FinancialCharts](file://src/components/FinancialCharts.tsx)
- Date range filtering: [DateFilter](file://src/components/DateFilter.tsx)
- Export engine: [exportService](file://src/lib/exportService.ts)
- Data model and storage: [db](file://src/db/db.ts)

```mermaid
graph TB
subgraph "Reporting Views"
R["Reports Page<br/>src/routes/app/reports/index.tsx"]
H["History Page<br/>src/routes/app/reports/history/index.tsx"]
E["Expenses Page<br/>src/routes/app/reports/expenses.tsx"]
B["Backdate Entry<br/>src/routes/app/reports/history/backdate.tsx"]
end
subgraph "UI Components"
FC["FinancialCharts<br/>src/components/FinancialCharts.tsx"]
DF["DateFilter<br/>src/components/DateFilter.tsx"]
end
subgraph "Data & Export"
DB["PosDatabase (Dexie)<br/>src/db/db.ts"]
ES["exportService<br/>src/lib/exportService.ts"]
end
R --> FC
R --> DF
R --> ES
H --> DF
E --> DF
B --> DB
R --> DB
H --> DB
E --> DB
ES --> DB
```

**Diagram sources**
- [src/routes/app/reports/index.tsx:1-715](file://src/routes/app/reports/index.tsx#L1-L715)
- [src/routes/app/reports/history/index.tsx:1-244](file://src/routes/app/reports/history/index.tsx#L1-L244)
- [src/routes/app/reports/history/backdate.tsx:1-218](file://src/routes/app/reports/history/backdate.tsx#L1-L218)
- [src/routes/app/reports/expenses.tsx:1-478](file://src/routes/app/reports/expenses.tsx#L1-L478)
- [src/components/FinancialCharts.tsx:1-333](file://src/components/FinancialCharts.tsx#L1-L333)
- [src/components/DateFilter.tsx:1-237](file://src/components/DateFilter.tsx#L1-L237)
- [src/lib/exportService.ts:1-293](file://src/lib/exportService.ts#L1-L293)
- [src/db/db.ts:1-570](file://src/db/db.ts#L1-L570)

**Section sources**
- [src/routes/app/reports/index.tsx:1-715](file://src/routes/app/reports/index.tsx#L1-L715)
- [src/routes/app/reports/history/index.tsx:1-244](file://src/routes/app/reports/history/index.tsx#L1-L244)
- [src/routes/app/reports/history/backdate.tsx:1-218](file://src/routes/app/reports/history/backdate.tsx#L1-L218)
- [src/routes/app/reports/expenses.tsx:1-478](file://src/routes/app/reports/expenses.tsx#L1-L478)
- [src/components/FinancialCharts.tsx:1-333](file://src/components/FinancialCharts.tsx#L1-L333)
- [src/components/DateFilter.tsx:1-237](file://src/components/DateFilter.tsx#L1-L237)
- [src/lib/exportService.ts:1-293](file://src/lib/exportService.ts#L1-L293)
- [src/db/db.ts:1-570](file://src/db/db.ts#L1-L570)

## Core Components
- Reports dashboard: Computes revenue, platform adjustment, COGS, gross profit, operating expenses, net profit, modal return, and “true profit.” Aggregates hourly/daily trends and payment distribution. Provides export to Excel and PDF.
- Transaction history: Lists transactions with backdated indicators, supports filtering by date range, and allows deletion with confirmation.
- Expenses: Records and categorizes operational expenses, auto-detects backdated entries, and supports editing/deleting.
- Backdate entry: Enables manual creation of past transactions with timestamp, amount, and payment method.
- FinancialCharts: Renders interactive line and doughnut charts for financial trends and payment methods.
- DateFilter: Provides quick filters (today, this month, custom, all) and a calendar-based custom range selector.
- ExportService: Generates Excel (.xlsx) with summary, transactions, detail products, and expenses sheets; generates PDF with styled summary, recent transactions, product detail, and expenses.
- PosDatabase: Dexie-based schema for transactions, transaction items, expenses, settings, and related entities.

**Section sources**
- [src/routes/app/reports/index.tsx:34-47](file://src/routes/app/reports/index.tsx#L34-L47)
- [src/routes/app/reports/history/index.tsx:1-244](file://src/routes/app/reports/history/index.tsx#L1-L244)
- [src/routes/app/reports/expenses.tsx:1-478](file://src/routes/app/reports/expenses.tsx#L1-L478)
- [src/routes/app/reports/history/backdate.tsx:1-218](file://src/routes/app/reports/history/backdate.tsx#L1-L218)
- [src/components/FinancialCharts.tsx:1-333](file://src/components/FinancialCharts.tsx#L1-L333)
- [src/components/DateFilter.tsx:1-237](file://src/components/DateFilter.tsx#L1-L237)
- [src/lib/exportService.ts:1-293](file://src/lib/exportService.ts#L1-L293)
- [src/db/db.ts:82-137](file://src/db/db.ts#L82-L137)

## Architecture Overview
The reporting pipeline integrates UI components, data aggregation, and export services:
- UI signals and resources compute report metrics and drive chart rendering.
- DateFilter controls the active period and custom range.
- ExportService orchestrates data retrieval and formatting for Excel/PDF.
- Dexie-backed PosDatabase persists transactions, items, and expenses.

```mermaid
sequenceDiagram
participant U as "User"
participant R as "Reports Page"
participant DF as "DateFilter"
participant DB as "PosDatabase"
participant ES as "ExportService"
U->>DF : Select period or custom range
DF-->>R : onFilterChange(period, range)
R->>DB : Load transactions, expenses, items
DB-->>R : Arrays filtered by timestamp
R->>R : Aggregate metrics (revenue, COGS, expenses, trends)
R-->>U : Render dashboard + charts
U->>R : Click Export (Excel/PDF)
R->>ES : exportToExcel()/exportToPDF(summary, tx, items, exp, outlet)
ES->>DB : Fetch outlet settings (name/address/phone/logo)
DB-->>ES : Settings values
ES-->>U : Download file
```

**Diagram sources**
- [src/routes/app/reports/index.tsx:56-209](file://src/routes/app/reports/index.tsx#L56-L209)
- [src/components/DateFilter.tsx:40-81](file://src/components/DateFilter.tsx#L40-L81)
- [src/lib/exportService.ts:49-132](file://src/lib/exportService.ts#L49-L132)
- [src/db/db.ts:502-509](file://src/db/db.ts#L502-L509)

## Detailed Component Analysis

### Reports Dashboard
- Metrics computed:
  - Revenue (net received)
  - Platform adjustment (difference between net and pre-adjustment totals)
  - COGS (sum of transaction-level COGS)
  - Gross profit (revenue − COGS)
  - Operating expenses (sum of expenses)
  - Net profit (gross profit − expenses)
  - Modal return (COGS)
  - True profit (net profit; excludes double deduction)
  - Counts: transaction count, expense count
- Aggregations:
  - Trend data: hourly for today, daily otherwise
  - Payment method distribution
- Rendering:
  - Hero card for net profit with color-coded positivity
  - Sectioned metrics cards for sales, expenses, and capital allocation
  - Quick navigation to history and expenses

```mermaid
flowchart TD
Start(["Compute Report"]) --> Filter["Filter Transactions & Expenses by Period"]
Filter --> Revenue["Sum totalAmount (Revenue)"]
Filter --> BaseAmt["Sum originalAmount"]
BaseAmt --> PlatformAdj["Platform Adjustment = Revenue − Base"]
Filter --> COGS["Sum cogsTotal (COGS)"]
Revenue --> Gross["Gross Profit = Revenue − COGS"]
Filter --> Expenses["Sum amount (Expenses)"]
Gross --> Net["Net Profit = Gross − Expenses"]
COGS --> Modal["Modal Return = COGS"]
Net --> TrueP["True Profit = Net Profit"]
Revenue --> Trends["Build Trend Map (hourly/daily)"]
Revenue --> Payments["Aggregate Payment Methods"]
Trends --> Charts["Render Charts"]
Payments --> Charts
Charts --> Done(["Render Dashboard"])
```

**Diagram sources**
- [src/routes/app/reports/index.tsx:211-370](file://src/routes/app/reports/index.tsx#L211-L370)
- [src/components/FinancialCharts.tsx:124-232](file://src/components/FinancialCharts.tsx#L124-L232)

**Section sources**
- [src/routes/app/reports/index.tsx:34-47](file://src/routes/app/reports/index.tsx#L34-L47)
- [src/routes/app/reports/index.tsx:211-370](file://src/routes/app/reports/index.tsx#L211-L370)
- [src/components/FinancialCharts.tsx:1-333](file://src/components/FinancialCharts.tsx#L1-L333)

### Transaction History
- Displays all transactions ordered by timestamp descending.
- Supports filtering by today, this month, custom range, or all.
- Shows total sales and counts.
- Allows deletion of transactions with confirmation.
- Highlights backdated transactions.

```mermaid
sequenceDiagram
participant U as "User"
participant H as "History Page"
participant DF as "DateFilter"
participant DB as "PosDatabase"
U->>DF : Choose filter
DF-->>H : onFilterChange(filter, range?)
H->>DB : transactions.orderBy("timestamp").reverse().filter(...)
DB-->>H : transactions[]
H-->>U : Render list with totals and backdated badges
U->>H : Tap delete
H-->>U : Confirmation dialog
U-->>H : Confirm
H->>DB : transactionItems.where(...).delete() + transactions.delete()
DB-->>H : OK
H-->>U : Toast success + refetch
```

**Diagram sources**
- [src/routes/app/reports/history/index.tsx:25-100](file://src/routes/app/reports/history/index.tsx#L25-L100)
- [src/components/DateFilter.tsx:40-81](file://src/components/DateFilter.tsx#L40-L81)

**Section sources**
- [src/routes/app/reports/history/index.tsx:1-244](file://src/routes/app/reports/history/index.tsx#L1-L244)
- [src/components/DateFilter.tsx:1-237](file://src/components/DateFilter.tsx#L1-L237)

### Backdated Transactions
- Adds manual transactions in the past with:
  - Unique receipt number
  - Timestamp set to chosen date/time
  - Payment method selection
  - Status marked pending
  - Backdated flag enabled
- Integrates with transaction items for product detail.

```mermaid
sequenceDiagram
participant U as "User"
participant B as "Backdate Page"
participant DB as "PosDatabase"
U->>B : Enter amount, pick date/time, choose method
B->>DB : Insert transaction (isBackdated=true)
DB-->>B : OK
B->>DB : Insert transactionItem (productId bd_item)
DB-->>B : OK
B-->>U : Navigate to history
```

**Diagram sources**
- [src/routes/app/reports/history/backdate.tsx:20-68](file://src/routes/app/reports/history/backdate.tsx#L20-L68)
- [src/db/db.ts:82-98](file://src/db/db.ts#L82-L98)

**Section sources**
- [src/routes/app/reports/history/backdate.tsx:1-218](file://src/routes/app/reports/history/backdate.tsx#L1-L218)
- [src/db/db.ts:82-109](file://src/db/db.ts#L82-L109)

### Expenses Management
- Lists expenses with category, amount, date, and backdated indicator.
- Supports adding/editing expenses with category labels and auto-detection of backdated entries.
- Provides total expense computation and per-entry actions (edit/delete).

```mermaid
flowchart TD
Open(["Open Expenses"]) --> Filter["Filter by period"]
Filter --> List["Render list with category badges"]
List --> Add["Add/Edit Sheet"]
Add --> Save["Persist to DB"]
Save --> Refetch["Refetch list"]
List --> Delete["Delete confirmation"]
Delete --> Refetch
```

**Diagram sources**
- [src/routes/app/reports/expenses.tsx:40-160](file://src/routes/app/reports/expenses.tsx#L40-L160)
- [src/db/db.ts:130-137](file://src/db/db.ts#L130-L137)

**Section sources**
- [src/routes/app/reports/expenses.tsx:1-478](file://src/routes/app/reports/expenses.tsx#L1-L478)
- [src/db/db.ts:111-137](file://src/db/db.ts#L111-L137)

### Financial Charts
- Renders:
  - Trend line chart (Omset vs HPP)
  - Payment method doughnut chart
- Dynamically loads Chart.js and updates datasets when expanded.

```mermaid
classDiagram
class FinancialCharts {
+props : FinancialChartsProps
+initCharts()
+initTrendChart()
+initPaymentChart()
}
class Reports {
+report() : ReportData
+render FinancialCharts
}
FinancialCharts <-- Reports : "consumes data"
```

**Diagram sources**
- [src/components/FinancialCharts.tsx:30-33](file://src/components/FinancialCharts.tsx#L30-L33)
- [src/routes/app/reports/index.tsx:465-468](file://src/routes/app/reports/index.tsx#L465-L468)

**Section sources**
- [src/components/FinancialCharts.tsx:1-333](file://src/components/FinancialCharts.tsx#L1-L333)
- [src/routes/app/reports/index.tsx:465-468](file://src/routes/app/reports/index.tsx#L465-L468)

### Date Range Filtering
- Provides quick filters and a bottom sheet with calendar-driven custom range selection.
- Emits events to update active period and range across reporting views.

```mermaid
flowchart TD
Click["User clicks filter"] --> Choice{"Quick or Custom?"}
Choice --> |Quick| Apply["Apply predefined range"]
Choice --> |Custom| Sheet["Open bottom sheet"]
Sheet --> Pick["Pick FROM/TO dates"]
Pick --> Apply
Apply --> Emit["onFilterChange(period, range?)"]
```

**Diagram sources**
- [src/components/DateFilter.tsx:40-81](file://src/components/DateFilter.tsx#L40-L81)
- [src/components/DateFilter.tsx:125-192](file://src/components/DateFilter.tsx#L125-L192)

**Section sources**
- [src/components/DateFilter.tsx:1-237](file://src/components/DateFilter.tsx#L1-L237)

### Export Functionality
- Excel export:
  - Summary sheet with financial metrics and counts
  - Transactions sheet with receipt number, timestamps, amounts, and backdated flags
  - Detail Products sheet linking items to receipts and variants
  - Expenses sheet with categorized entries
- PDF export:
  - Styled header with outlet branding
  - Summary table of financial metrics
  - Recent transactions table (top 100)
  - Product detail table
  - Expenses table (if present)
  - Automatic footer with print timestamp and page count

```mermaid
sequenceDiagram
participant U as "User"
participant R as "Reports Page"
participant ES as "ExportService"
participant DB as "PosDatabase"
U->>R : Click Export (Excel/PDF)
R->>ES : exportToExcel()/exportToPDF(summary, tx, items, exp, outlet)
ES->>DB : getSetting("outlet_*")
DB-->>ES : Values
ES-->>U : Save file
```

**Diagram sources**
- [src/routes/app/reports/index.tsx:56-209](file://src/routes/app/reports/index.tsx#L56-L209)
- [src/lib/exportService.ts:49-132](file://src/lib/exportService.ts#L49-L132)
- [src/lib/exportService.ts:137-291](file://src/lib/exportService.ts#L137-L291)
- [src/db/db.ts:502-509](file://src/db/db.ts#L502-L509)

**Section sources**
- [src/lib/exportService.ts:1-293](file://src/lib/exportService.ts#L1-L293)
- [src/routes/app/reports/index.tsx:56-209](file://src/routes/app/reports/index.tsx#L56-L209)

### Historical Data Management
- Backdated transactions:
  - Manual entry via backdate form with date/time picker and method selection
  - Stored with isBackdated flag and associated transaction item
- Audit and reconciliation:
  - Transaction history lists all entries with backdated badges
  - Expenses list includes backdated indicator
  - Export includes backdated flags for traceability

```mermaid
flowchart TD
Entry["Manual Backdate Entry"] --> Tx["Insert Transaction (isBackdated=true)"]
Entry --> Item["Insert TransactionItem"]
Tx --> History["Visible in History"]
Item --> History
History --> Export["Export includes Backdated flags"]
```

**Diagram sources**
- [src/routes/app/reports/history/backdate.tsx:20-68](file://src/routes/app/reports/history/backdate.tsx#L20-L68)
- [src/routes/app/reports/history/index.tsx:192-196](file://src/routes/app/reports/history/index.tsx#L192-L196)
- [src/routes/app/reports/expenses.tsx:120-132](file://src/routes/app/reports/expenses.tsx#L120-L132)
- [src/lib/exportService.ts:89-92](file://src/lib/exportService.ts#L89-L92)
- [src/lib/exportService.ts:124-125](file://src/lib/exportService.ts#L124-L125)

**Section sources**
- [src/routes/app/reports/history/backdate.tsx:1-218](file://src/routes/app/reports/history/backdate.tsx#L1-L218)
- [src/routes/app/reports/history/index.tsx:1-244](file://src/routes/app/reports/history/index.tsx#L1-L244)
- [src/routes/app/reports/expenses.tsx:1-478](file://src/routes/app/reports/expenses.tsx#L1-L478)
- [src/lib/exportService.ts:1-293](file://src/lib/exportService.ts#L1-L293)

### Profit and Loss Calculations
- Revenue tracking:
  - Net revenue from transactions’ totalAmount
  - Platform adjustment from difference between totalAmount and originalAmount
- Cost of goods sold:
  - COGS computed as sum of cogsTotal per transaction
- Profit metrics:
  - Gross profit = revenue − COGS
  - Net profit = gross profit − operating expenses
  - True profit = net profit (no double COGS deduction)
- Expense-to-revenue ratio:
  - Computed as total expenses / revenue (useful for comparative analysis)

```mermaid
flowchart TD
Rev["Revenue = Σ totalAmount"] --> Plat["Platform Adjustment = Σ totalAmount − Σ originalAmount"]
Rev --> COGS["COGS = Σ cogsTotal"]
COGS --> GP["Gross Profit = Revenue − COGS"]
GP --> NP["Net Profit = Gross − Expenses"]
NP --> TP["True Profit = Net Profit"]
Rev --> Ratio["Expense-to-Revenue Ratio = Σ expenses / Revenue"]
```

**Diagram sources**
- [src/routes/app/reports/index.tsx:285-297](file://src/routes/app/reports/index.tsx#L285-L297)
- [src/routes/app/reports/index.tsx:353-366](file://src/routes/app/reports/index.tsx#L353-L366)

**Section sources**
- [src/routes/app/reports/index.tsx:285-297](file://src/routes/app/reports/index.tsx#L285-L297)
- [src/routes/app/reports/index.tsx:353-366](file://src/routes/app/reports/index.tsx#L353-L366)

### Comparative Analysis and Trending
- Trend visualization:
  - Hourly bins for today, daily bins otherwise
  - Dual-series line chart for revenue and COGS
- Payment distribution:
  - Doughnut chart of payment methods
- Date range filters enable day-over-day and month-over-month comparisons.

**Section sources**
- [src/routes/app/reports/index.tsx:301-335](file://src/routes/app/reports/index.tsx#L301-L335)
- [src/components/FinancialCharts.tsx:124-232](file://src/components/FinancialCharts.tsx#L124-L232)
- [src/components/DateFilter.tsx:73-81](file://src/components/DateFilter.tsx#L73-L81)

### Practical Examples
- Generate a monthly PDF:
  - Select “This Month” filter → click “Export” → choose “PDF”
  - Review outlet branding, summary metrics, recent transactions, product detail, and expenses
- Compare two weeks:
  - Use “Custom” range to select a 7-day window, then compare trend lines and payment distributions
- Reconcile backdated entries:
  - Use “Input Past” to record a missed sale → verify in history and export with backdated flags

**Section sources**
- [src/routes/app/reports/index.tsx:56-209](file://src/routes/app/reports/index.tsx#L56-L209)
- [src/components/DateFilter.tsx:125-192](file://src/components/DateFilter.tsx#L125-L192)
- [src/routes/app/reports/history/backdate.tsx:20-68](file://src/routes/app/reports/history/backdate.tsx#L20-L68)

### Compliance and Tax Reporting
- Export includes:
  - Backdated flags for transactions and expenses
  - Full transaction metadata (timestamps, receipt numbers, amounts)
  - Categorized expenses with labels
- PDF footer records print timestamp and page count for audit trail.

**Section sources**
- [src/lib/exportService.ts:89-92](file://src/lib/exportService.ts#L89-L92)
- [src/lib/exportService.ts:124-125](file://src/lib/exportService.ts#L124-L125)
- [src/lib/exportService.ts:281-291](file://src/lib/exportService.ts#L281-L291)

## Dependency Analysis
- External libraries:
  - Chart.js for interactive charts
  - xlsx for Excel exports
  - jspdf + jspdf-autotable for PDF exports
  - dexie for client-side database
- Internal dependencies:
  - Reports depends on DateFilter, FinancialCharts, exportService, and db
  - History and Expenses depend on DateFilter and db
  - Backdate writes to db

```mermaid
graph LR
Pkg["package.json deps"] --> Chart["chart.js"]
Pkg --> XLSX["xlsx"]
Pkg --> JSPDF["jspdf + autotable"]
Pkg --> Dexie["dexie"]
Rpt["Reports Page"] --> Chart
Rpt --> XLSX
Rpt --> JSPDF
Rpt --> Dexie
Hist["History Page"] --> Dexie
Exp["Expenses Page"] --> Dexie
Back["Backdate Page"] --> Dexie
```

**Diagram sources**
- [package.json:11-39](file://package.json#L11-L39)
- [src/routes/app/reports/index.tsx:1-31](file://src/routes/app/reports/index.tsx#L1-L31)
- [src/lib/exportService.ts:1-11](file://src/lib/exportService.ts#L1-L11)
- [src/db/db.ts:1-4](file://src/db/db.ts#L1-L4)

**Section sources**
- [package.json:11-39](file://package.json#L11-L39)
- [src/routes/app/reports/index.tsx:1-31](file://src/routes/app/reports/index.tsx#L1-L31)
- [src/lib/exportService.ts:1-11](file://src/lib/exportService.ts#L1-L11)
- [src/db/db.ts:1-4](file://src/db/db.ts#L1-L4)

## Performance Considerations
- Data retrieval:
  - Reports fetch all transactions and expenses then filter by timestamp; consider pagination or indexed queries for very large datasets.
- Chart rendering:
  - Charts initialize lazily when expanded; defer heavy computations until needed.
- Export:
  - Excel export builds multiple sheets; large datasets may increase memory usage. Consider chunking or server-side export for massive volumes.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Export fails:
  - Verify network connectivity and that export dependencies are loaded.
  - Check toast notifications for error messages.
- Missing outlet branding in PDF:
  - Ensure outlet settings are configured; exportService falls back gracefully if values are missing.
- Deleting a transaction:
  - Confirm deletion; both transaction and items are removed; verify history refreshes.

**Section sources**
- [src/routes/app/reports/index.tsx:203-208](file://src/routes/app/reports/index.tsx#L203-L208)
- [src/routes/app/reports/history/index.tsx:83-100](file://src/routes/app/reports/history/index.tsx#L83-L100)
- [src/lib/exportService.ts:155-161](file://src/lib/exportService.ts#L155-L161)

## Conclusion
NgePos provides a comprehensive financial reporting suite with real-time analytics, interactive visualizations, robust export capabilities, and strong historical data handling. The modular design enables flexible date-range analysis, backdated entries, and compliance-ready exports suitable for internal review and basic tax reporting workflows.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Data Model Overview
```mermaid
erDiagram
TRANSACTIONS {
string id PK
string receiptNumber
numeric totalAmount
numeric originalAmount
numeric cogsTotal
string paymentMethod
timestamp timestamp
enum status
boolean isBackdated
string backdatedNote
boolean isAdjustment
numeric discountTotal
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
numeric priceAtTime
numeric cogsAtTime
}
EXPENSES {
string id PK
numeric amount
enum category
string description
timestamp timestamp
boolean isBackdated
}
SETTINGS {
string key PK
string value
}
TRANSACTIONS ||--o{ TRANSACTION_ITEMS : "has"
```

**Diagram sources**
- [src/db/db.ts:82-137](file://src/db/db.ts#L82-L137)

### Planned Enhancements (from PRD)
- Tax reporting and calculation
- Comparative reports (day-over-day, month-over-month)
- Automated report scheduling
- Accounting software integration

**Section sources**
- [PRD.txt:165-190](file://PRD.txt#L165-L190)