# Product Management

<cite>
**Referenced Files in This Document**
- [products.tsx](file://src/routes/app/inventory/products.tsx)
- [categories.tsx](file://src/routes/app/inventory/categories.tsx)
- [materials.tsx](file://src/routes/app/inventory/materials.tsx)
- [variations.tsx](file://src/routes/app/inventory/variations.tsx)
- [ProductImage.tsx](file://src/components/ProductImage.tsx)
- [VariantSelector.tsx](file://src/components/VariantSelector.tsx)
- [product-selector.tsx](file://src/components/ui/product-selector.tsx)
- [db.ts](file://src/db/db.ts)
- [availability.ts](file://src/lib/availability.ts)
- [schema.ts](file://src/server/db/schema.ts)
- [seed.ts](file://src/server/db/seed.ts)
- [index.tsx](file://src/routes/app/inventory/index.tsx)
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
This document describes the product management subsystem within the POS system. It covers the product catalog interface (listing, search, filtering), category management, product images, CRUD operations, variants and recipes, visibility controls, pricing strategies, and integration with inventory tracking. Practical examples and performance guidance are included for managing large product catalogs.

## Project Structure
The product management UI is organized under the inventory hub with dedicated routes for products, categories, materials, and variations. The local database schema defines the data model for products, categories, variants, materials, and related entities. Server-side schema supports backend reporting and inventory logs.

```mermaid
graph TB
subgraph "UI Routes"
INV["Inventory Hub<br/>index.tsx"]
PROD["Products Manager<br/>products.tsx"]
CAT["Categories Manager<br/>categories.tsx"]
MAT["Materials Library<br/>materials.tsx"]
VAR["Variation Templates<br/>variations.tsx"]
end
subgraph "Components"
IMG["ProductImage<br/>ProductImage.tsx"]
VS["VariantSelector<br/>VariantSelector.tsx"]
PS["ProductSelector<br/>product-selector.tsx"]
end
subgraph "Data Layer"
DBTS["Local Schema & Types<br/>db.ts"]
AVAIL["Availability Logic<br/>availability.ts"]
SRV["Server Schema<br/>schema.ts"]
end
INV --> PROD
INV --> CAT
INV --> MAT
INV --> VAR
PROD --> IMG
PROD --> VS
PROD --> PS
PROD --> DBTS
PROD --> AVAIL
CAT --> DBTS
MAT --> DBTS
VAR --> DBTS
DBTS --> SRV
```

**Diagram sources**
- [index.tsx:13-46](file://src/routes/app/inventory/index.tsx#L13-L46)
- [products.tsx:92-111](file://src/routes/app/inventory/products.tsx#L92-L111)
- [categories.tsx:16-20](file://src/routes/app/inventory/categories.tsx#L16-L20)
- [materials.tsx:14-18](file://src/routes/app/inventory/materials.tsx#L14-L18)
- [variations.tsx:9-13](file://src/routes/app/inventory/variations.tsx#L9-L13)
- [ProductImage.tsx:10-19](file://src/components/ProductImage.tsx#L10-L19)
- [VariantSelector.tsx:16-46](file://src/components/VariantSelector.tsx#L16-L46)
- [product-selector.tsx:14-24](file://src/components/ui/product-selector.tsx#L14-L24)
- [db.ts:62-73](file://src/db/db.ts#L62-L73)
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [schema.ts:82-92](file://src/server/db/schema.ts#L82-L92)

**Section sources**
- [index.tsx:13-46](file://src/routes/app/inventory/index.tsx#L13-L46)

## Core Components
- Product Catalog Manager: Lists, filters, and edits products; manages images, visibility, variants, and recipes.
- Category Manager: Adds, edits, and deletes categories with ordering and icons.
- Materials Library: Maintains raw materials with units, costs, and activity status.
- Variations Library: Stores reusable variant templates for consistent product configurations.
- Product Image Component: Renders product images with fallback placeholders and error handling.
- Availability Utility: Computes product availability based on product toggle and ingredient/library status.
- Local Database Schema: Defines product, category, variant, material, discount, bundle, and campaign entities.

**Section sources**
- [products.tsx:92-111](file://src/routes/app/inventory/products.tsx#L92-L111)
- [categories.tsx:16-20](file://src/routes/app/inventory/categories.tsx#L16-L20)
- [materials.tsx:14-18](file://src/routes/app/inventory/materials.tsx#L14-L18)
- [variations.tsx:9-13](file://src/routes/app/inventory/variations.tsx#L9-L13)
- [ProductImage.tsx:10-19](file://src/components/ProductImage.tsx#L10-L19)
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [db.ts:62-73](file://src/db/db.ts#L62-L73)

## Architecture Overview
The product management subsystem combines a local IndexedDB-like store (Dexie) for offline-first UX with server-side relational tables for reporting and audit trails. The UI components coordinate state, persistence, and availability checks.

```mermaid
sequenceDiagram
participant UI as "Products Manager<br/>products.tsx"
participant DB as "Local Store<br/>db.ts"
participant IMG as "ProductImage<br/>ProductImage.tsx"
participant AV as "Availability<br/>availability.ts"
UI->>DB : Load products, categories, materials, templates
UI->>UI : Apply search/filter
UI->>AV : Compute availability per product
AV-->>UI : {available, reason?}
UI->>IMG : Render product image (with fallback)
IMG-->>UI : Image or placeholder
UI->>DB : Save/update/delete product
DB-->>UI : Persisted result
```

**Diagram sources**
- [products.tsx:94-111](file://src/routes/app/inventory/products.tsx#L94-L111)
- [db.ts:498-499](file://src/db/db.ts#L498-L499)
- [ProductImage.tsx:10-19](file://src/components/ProductImage.tsx#L10-L19)
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)

## Detailed Component Analysis

### Product Catalog Interface
- Listing and Views: Supports list and grid views with toggling persisted in localStorage.
- Search and Filtering: Case-insensitive filter on product name and category.
- Visibility Controls: Per-product activation/deactivation; reflected in UI and availability checks.
- CRUD Operations: Add, edit, duplicate, and delete products; saving updates discounts and variants.
- Recipe Management: Tracks raw materials with quantities, units, and computed totals; syncs with materials library.
- Variants: Configurable variant groups (single/multiple selection) with price/cogs modifiers and ingredient adjustments.
- Pricing Strategies: Base price plus variant modifiers; HPP calculation and margin indicators.

```mermaid
flowchart TD
Start(["Open Products Manager"]) --> Load["Load resources:<br/>products, categories,<br/>materials, templates, discounts, bundles"]
Load --> ViewToggle["Toggle view mode (list/grid)"]
ViewToggle --> Search["Enter search term"]
Search --> Filter["Filter by name or category"]
Filter --> Render["Render cards/list rows"]
Render --> Availability["Compute availability per product"]
Availability --> Actions{"Action?"}
Actions --> |Edit| OpenEdit["Open edit sheet"]
Actions --> |Delete| ConfirmDel["Confirm deletion"]
Actions --> |Duplicate| Duplicate["Duplicate product"]
Actions --> |Add| OpenAdd["Open add sheet"]
OpenEdit --> Save["Save product (incl. variants/discounts)"]
OpenAdd --> Save
Save --> Reload["Refetch resources"]
ConfirmDel --> Reload
Duplicate --> Reload
Reload --> End(["Done"])
```

**Diagram sources**
- [products.tsx:94-111](file://src/routes/app/inventory/products.tsx#L94-L111)
- [products.tsx:155-166](file://src/routes/app/inventory/products.tsx#L155-L166)
- [products.tsx:237-279](file://src/routes/app/inventory/products.tsx#L237-L279)
- [products.tsx:437-449](file://src/routes/app/inventory/products.tsx#L437-L449)
- [products.tsx:281-303](file://src/routes/app/inventory/products.tsx#L281-L303)

**Section sources**
- [products.tsx:144-166](file://src/routes/app/inventory/products.tsx#L144-L166)
- [products.tsx:237-279](file://src/routes/app/inventory/products.tsx#L237-L279)
- [products.tsx:338-409](file://src/routes/app/inventory/products.tsx#L338-L409)
- [products.tsx:533-571](file://src/routes/app/inventory/products.tsx#L533-L571)
- [products.tsx:573-609](file://src/routes/app/inventory/products.tsx#L573-L609)
- [products.tsx:1018-1162](file://src/routes/app/inventory/products.tsx#L1018-L1162)
- [products.tsx:1165-1511](file://src/routes/app/inventory/products.tsx#L1165-L1511)
- [products.tsx:1514-1992](file://src/routes/app/inventory/products.tsx#L1514-L1992)

### Category Management
- Hierarchical Organization: Categories are ordered by index; icons are selectable.
- CRUD: Add, edit, and delete categories; prevents deletion if products exist in category.
- Integration: Products reference category names; updates propagate to product listings.

```mermaid
flowchart TD
StartCat(["Open Categories"]) --> List["List categories (ordered)"]
List --> Add["Add category (auto orderIndex)"]
List --> Edit["Edit category (name/icon)"]
List --> Del["Delete category (check usage)"]
Add --> SaveCat["Persist category"]
Edit --> SaveCat
Del --> Guard{"Products in category?"}
Guard --> |Yes| Error["Show error; prevent delete"]
Guard --> |No| Remove["Delete category"]
SaveCat --> Refetch["Refetch categories"]
Remove --> Refetch
Refetch --> EndCat(["Done"])
```

**Diagram sources**
- [categories.tsx:16-20](file://src/routes/app/inventory/categories.tsx#L16-L20)
- [categories.tsx:34-66](file://src/routes/app/inventory/categories.tsx#L34-L66)
- [categories.tsx:68-89](file://src/routes/app/inventory/categories.tsx#L68-L89)

**Section sources**
- [categories.tsx:16-20](file://src/routes/app/inventory/categories.tsx#L16-L20)
- [categories.tsx:34-66](file://src/routes/app/inventory/categories.tsx#L34-L66)
- [categories.tsx:68-89](file://src/routes/app/inventory/categories.tsx#L68-L89)

### Product Image Management
- Rendering: Uses ProductImage component to show uploaded images or fallback placeholders.
- Fallback: Generates initials-based gradient placeholder; decorative icons and lazy loading.
- Error Handling: Swaps to fallback when image fails to load.

```mermaid
flowchart TD
StartImg(["Render ProductImage"]) --> HasSrc{"Has src and valid?"}
HasSrc --> |Yes| Img["Show img (lazy)"]
HasSrc --> |No| Fallback["Show gradient placeholder<br/>with initials and icons"]
Img --> OnError{"onError?"}
OnError --> |Yes| Fallback
OnError --> |No| DoneImg(["Done"])
Fallback --> DoneImg
```

**Diagram sources**
- [ProductImage.tsx:10-19](file://src/components/ProductImage.tsx#L10-L19)
- [ProductImage.tsx:48-56](file://src/components/ProductImage.tsx#L48-L56)

**Section sources**
- [ProductImage.tsx:10-19](file://src/components/ProductImage.tsx#L10-L19)

### Recipe Management (Raw Materials)
- Ingredients Tracking: Each product maintains a list of raw materials with name, unit, quantity, and cost.
- Sync with Library: Smart matching by ID or name; auto-register unknown materials; update linked costs.
- HPP Calculation: Sum of ingredient costs; margin computation and status indicators.
- Material Library: Centralized library with units, costs, and activity status; supports bulk operations.

```mermaid
sequenceDiagram
participant PM as "Products Manager<br/>products.tsx"
participant LIB as "Raw Material Library<br/>db.ts"
PM->>LIB : Fetch materials
PM->>PM : For each ingredient : match by id/name
alt Found
PM->>PM : Update costPerUnit and total
else Not found
PM->>LIB : Auto-register new material
end
PM->>LIB : Persist library updates
PM-->>PM : Recompute HPP and margins
```

**Diagram sources**
- [products.tsx:338-409](file://src/routes/app/inventory/products.tsx#L338-L409)
- [db.ts:16-24](file://src/db/db.ts#L16-L24)

**Section sources**
- [products.tsx:305-409](file://src/routes/app/inventory/products.tsx#L305-L409)
- [materials.tsx:14-18](file://src/routes/app/inventory/materials.tsx#L14-L18)

### Variants and Variant Templates
- Variant Groups: Define required/single-or-multiple selection, optional max selectable, and options with price/cogs modifiers.
- Ingredient Adjustments: Per-option adjustments to ingredients; auto-calculate cogs modifiers.
- Templates: Save reusable variant groups; assign templates to products; manage template library.

```mermaid
classDiagram
class VariantGroup {
+string id
+string name
+boolean isRequired
+string type
+number maxSelectable
+Option[] options
}
class VariantOption {
+string name
+number priceModifier
+number cogsModifier
}
class VariantTemplate {
+string id
+string name
+boolean isRequired
+string type
+number maxSelectable
+Option[] options
+boolean isActive
}
VariantGroup --> VariantOption : "contains"
VariantTemplate --> VariantOption : "contains"
```

**Diagram sources**
- [db.ts:42-60](file://src/db/db.ts#L42-L60)
- [products.tsx:533-571](file://src/routes/app/inventory/products.tsx#L533-L571)
- [products.tsx:1772-1899](file://src/routes/app/inventory/products.tsx#L1772-L1899)
- [variations.tsx:9-13](file://src/routes/app/inventory/variations.tsx#L9-L13)

**Section sources**
- [products.tsx:533-571](file://src/routes/app/inventory/products.tsx#L533-L571)
- [products.tsx:1772-1899](file://src/routes/app/inventory/products.tsx#L1772-L1899)
- [variations.tsx:59-79](file://src/routes/app/inventory/variations.tsx#L59-L79)

### Variant Selection UI
- VariantSelector: Presents active variant groups for a product; enforces required selections; computes effective base price and final price; supports initial selections.

```mermaid
sequenceDiagram
participant VS as "VariantSelector<br/>VariantSelector.tsx"
participant UI as "Cart/Order Flow"
VS->>VS : Load product variants
VS->>VS : Validate required groups
VS->>UI : onConfirm(selectedVariants)
UI-->>VS : Close selector
```

**Diagram sources**
- [VariantSelector.tsx:16-46](file://src/components/VariantSelector.tsx#L16-L46)
- [VariantSelector.tsx:99-118](file://src/components/VariantSelector.tsx#L99-L118)

**Section sources**
- [VariantSelector.tsx:16-46](file://src/components/VariantSelector.tsx#L16-L46)
- [VariantSelector.tsx:99-118](file://src/components/VariantSelector.tsx#L99-L118)

### Product Selector (Bulk Operations)
- ProductSelector: Allows selecting one or multiple products with search, preview, and bulk actions; integrates with product images and pricing.

```mermaid
flowchart TD
StartSel(["Open ProductSelector"]) --> SearchSel["Search by name"]
SearchSel --> Select{"Multiple?"}
Select --> |Yes| ToggleAll["Toggle all items"]
Select --> |No| PickOne["Pick single product"]
PickOne --> Preview["Preview image and price"]
ToggleAll --> Preview
Preview --> DoneSel(["Done"])
```

**Diagram sources**
- [product-selector.tsx:14-24](file://src/components/ui/product-selector.tsx#L14-L24)
- [product-selector.tsx:26-37](file://src/components/ui/product-selector.tsx#L26-L37)
- [product-selector.tsx:162-217](file://src/components/ui/product-selector.tsx#L162-L217)

**Section sources**
- [product-selector.tsx:14-24](file://src/components/ui/product-selector.tsx#L14-L24)
- [product-selector.tsx:26-37](file://src/components/ui/product-selector.tsx#L26-L37)
- [product-selector.tsx:162-217](file://src/components/ui/product-selector.tsx#L162-L217)

### Visibility Controls and Availability
- Product-level isActive flag governs visibility in UI and checkout.
- Availability logic checks product toggle and ingredient/library statuses; returns reasons for unavailability.

```mermaid
flowchart TD
StartAvail(["Check Availability"]) --> IsActive{"Product isActive?"}
IsActive --> |No| NotAvail["Unavailable: Nonaktif"]
IsActive --> |Yes| HasIngredients{"Has raw materials?"}
HasIngredients --> |No| Avail["Available"]
HasIngredients --> |Yes| CheckEach["For each ingredient:<br/>exists in library?<br/>library item isActive?"]
CheckEach --> Found{"Found & Active?"}
Found --> |No| Reason["Unavailable: Missing/Inactive ingredient"]
Found --> |Yes| Avail
```

**Diagram sources**
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [products.tsx:724-728](file://src/routes/app/inventory/products.tsx#L724-L728)

**Section sources**
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [products.tsx:724-728](file://src/routes/app/inventory/products.tsx#L724-L728)

### Pricing Strategies
- Base Price + Modifiers: Variants add/subtract from base price; HPP derived from ingredients or configured COGS.
- Margin Indicators: Real-time margin percent with color-coded status tiers.
- Discounts: Optional per-product discounts (percent/fixed/quantity) managed alongside products.

**Section sources**
- [products.tsx:56-89](file://src/routes/app/inventory/products.tsx#L56-L89)
- [products.tsx:1165-1267](file://src/routes/app/inventory/products.tsx#L1165-L1267)
- [db.ts:162-171](file://src/db/db.ts#L162-L171)

### Integration with Inventory Tracking
- Local Store: Products, categories, variants, materials, discounts, bundles, campaigns, and inventory logs.
- Server Schema: Products, raw materials, modifier groups/options, product ingredients, and inventory logs for reporting.

```mermaid
erDiagram
PRODUCTS {
text id PK
text name
text category
numeric price
numeric cogs
real stock
boolean isActive
}
RAW_MATERIALS {
uuid id PK
text name
text unit
real stock
numeric average_cost
boolean isActive
}
MODIFIER_GROUPS {
text id PK
text name
boolean isRequired
text type
int max_selectable
boolean isActive
}
MODIFIER_OPTIONS {
uuid id PK
text group_id FK
text name
numeric price_modifier
numeric cogs_modifier
}
PRODUCT_INGREDIENTS {
uuid id PK
text product_id
uuid material_id FK
real quantity
}
INVENTORY_LOGS {
uuid id PK
uuid material_id FK
text type
real quantity
numeric unit_cost
text notes
timestamp timestamp
}
PRODUCTS ||--o{ PRODUCT_INGREDIENTS : "has"
RAW_MATERIALS ||--o{ PRODUCT_INGREDIENTS : "used_in"
MODIFIER_GROUPS ||--o{ MODIFIER_OPTIONS : "contains"
```

**Diagram sources**
- [db.ts:62-73](file://src/db/db.ts#L62-L73)
- [db.ts:16-24](file://src/db/db.ts#L16-L24)
- [db.ts:42-60](file://src/db/db.ts#L42-L60)
- [schema.ts:82-92](file://src/server/db/schema.ts#L82-L92)
- [schema.ts:94-104](file://src/server/db/schema.ts#L94-L104)
- [schema.ts:106-123](file://src/server/db/schema.ts#L106-L123)
- [schema.ts:125-131](file://src/server/db/schema.ts#L125-L131)
- [schema.ts:133-141](file://src/server/db/schema.ts#L133-L141)

**Section sources**
- [db.ts:270-495](file://src/db/db.ts#L270-L495)
- [schema.ts:82-141](file://src/server/db/schema.ts#L82-L141)

## Dependency Analysis
- UI depends on local database entities and availability logic.
- Product CRUD operations update multiple stores (products, discounts, variants).
- Materials library is shared across products and variants.
- Server schema complements local store for reporting and audit trails.

```mermaid
graph LR
PROD_UI["products.tsx"] --> DB_LOCAL["db.ts"]
PROD_UI --> AVAIL["availability.ts"]
PROD_UI --> IMG["ProductImage.tsx"]
CAT_UI["categories.tsx"] --> DB_LOCAL
MAT_UI["materials.tsx"] --> DB_LOCAL
VAR_UI["variations.tsx"] --> DB_LOCAL
DB_LOCAL --> SRV_SCHEMA["schema.ts"]
```

**Diagram sources**
- [products.tsx:92-111](file://src/routes/app/inventory/products.tsx#L92-L111)
- [categories.tsx:16-20](file://src/routes/app/inventory/categories.tsx#L16-L20)
- [materials.tsx:14-18](file://src/routes/app/inventory/materials.tsx#L14-L18)
- [variations.tsx:9-13](file://src/routes/app/inventory/variations.tsx#L9-L13)
- [db.ts:498-499](file://src/db/db.ts#L498-L499)
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [schema.ts:82-92](file://src/server/db/schema.ts#L82-L92)

**Section sources**
- [products.tsx:92-111](file://src/routes/app/inventory/products.tsx#L92-L111)
- [categories.tsx:16-20](file://src/routes/app/inventory/categories.tsx#L16-L20)
- [materials.tsx:14-18](file://src/routes/app/inventory/materials.tsx#L14-L18)
- [variations.tsx:9-13](file://src/routes/app/inventory/variations.tsx#L9-L13)
- [db.ts:498-499](file://src/db/db.ts#L498-L499)
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [schema.ts:82-92](file://src/server/db/schema.ts#L82-L92)

## Performance Considerations
- Virtualization and Pagination: For very large catalogs, consider virtualized lists or pagination to reduce DOM nodes.
- Memoization: Use memoized computations for HPP, margins, and availability to avoid recalculating on every render.
- Debounced Search: Debounce search input to limit frequent filtering operations.
- Lazy Loading Images: Already implemented via lazy loading; keep placeholder strategy for perceived performance.
- Batch Updates: Group updates to materials library and products to minimize re-renders and database writes.
- IndexedDB Indexes: Ensure appropriate indexes on frequently queried fields (e.g., category, name) to speed up queries.

## Troubleshooting Guide
- Product appears inactive: Verify product isActive flag and ingredient/library statuses; check availability reasons.
- Missing images: Confirm image URLs are valid; fallback placeholder indicates missing or broken images.
- Sync issues with materials: Use the “Sync Library” action to reconcile ingredient costs and auto-register missing materials.
- Deleting categories/products: Ensure no dependent records exist; the system prevents deletion if items belong to the category.
- Variant validation errors: Required variant groups must be selected; ensure selections meet SINGLE/MULTIPLE constraints.

**Section sources**
- [availability.ts:12-39](file://src/lib/availability.ts#L12-L39)
- [ProductImage.tsx:48-56](file://src/components/ProductImage.tsx#L48-L56)
- [products.tsx:338-409](file://src/routes/app/inventory/products.tsx#L338-L409)
- [categories.tsx:68-89](file://src/routes/app/inventory/categories.tsx#L68-L89)
- [VariantSelector.tsx:103-118](file://src/components/VariantSelector.tsx#L103-L118)

## Conclusion
The product management subsystem provides a robust, offline-capable interface for managing products, categories, materials, and variants. It integrates visibility controls, pricing strategies, and inventory alignment through availability checks and material library synchronization. With structured components and clear data models, it supports efficient operations across small and large catalogs.

## Appendices

### Practical Examples
- Adding a New Product: Use the add sheet to set name, price, category, image, and visibility; configure variants and recipe; save to persist.
- Bulk Operations: Use ProductSelector to select multiple products for batch actions (e.g., applying discounts or visibility toggles).
- Managing Variants: Create reusable templates in the variations library; assign templates to products to maintain consistency.
- Performance Optimization: Enable grid/list view toggling, debounce search, and leverage memoized calculations for HPP and margins.

### Data Model Highlights
- Product: id, name, category, price, cogs, stock, isActive, image, rawMaterials, variants.
- Category: id, name, orderIndex, icon.
- RawMaterialLibrary: id, name, unit, stock, costPerUnit, isActive.
- VariantGroup/Option: id, name, isRequired, type, maxSelectable, options with price/cogs modifiers.
- Discount/Bundles/Campaigns: Support promotional pricing and composite offerings.

**Section sources**
- [db.ts:62-73](file://src/db/db.ts#L62-L73)
- [db.ts:75-80](file://src/db/db.ts#L75-L80)
- [db.ts:16-24](file://src/db/db.ts#L16-L24)
- [db.ts:42-60](file://src/db/db.ts#L42-L60)
- [db.ts:162-171](file://src/db/db.ts#L162-L171)
- [db.ts:179-187](file://src/db/db.ts#L179-L187)