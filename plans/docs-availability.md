# Availability Service Documentation

**File:** `src/lib/availability.ts`
**Status:** ✅ Implemented
**Last Updated:** 2026-04-18

---

## 1. Overview

The `availability.ts` module provides product availability checking functionality for the Ngepos POS system. It determines whether a product can be sold based on multiple factors including product status and raw material inventory.

---

## 2. Function Signature

```typescript
function getProductAvailability(
  product: Product,
  materials: RawMaterialLibrary[]
): { available: boolean; reason?: string }
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `product` | `Product` | The product to check availability for |
| `materials` | `RawMaterialLibrary[]` | All raw materials from the library for cross-reference |

### Return Value

| Field | Type | Description |
|-------|------|-------------|
| `available` | `boolean` | `true` if product can be sold, `false` otherwise |
| `reason` | `string` (optional) | Human-readable reason why product is unavailable |

---

## 3. Availability Rules

The availability check follows a cascading logic with TWO main checks:

### 3.1 Rule #1: Product Active Status

```typescript
const baseIsActive = product.isActive ?? true;
if (!baseIsActive) {
  return { available: false, reason: "Nonaktif" };
}
```

**Logic:**
- Default to `true` if `isActive` is undefined (backward compatible)
- If `isActive === false`, product is unavailable
- Reason: "Nonaktif" (Inactive)

### 3.2 Rule #2: Raw Materials Check (Cascade)

```typescript
if (product.rawMaterials && product.rawMaterials.length > 0) {
  for (const ingredient of product.rawMaterials) {
    const material = materials.find(m => m.id === ingredient.id);

    if (!material) {
      return { available: false, reason: `Bahan "${ingredient.name}" Tidak Ditemukan` };
    }

    if (!material.isActive) {
      return { available: false, reason: `Bahan "${ingredient.name}" Off` };
    }
  }
}
```

**Logic:**
- Only checks if product has `rawMaterials` defined and non-empty
- For each ingredient in the recipe:
  - Material must exist in the library
  - Material must have `isActive === true`

**Note:** Current implementation does NOT check `stock` levels. This is a known limitation (see Section 7).

---

## 4. Usage Examples

### 4.1 Basic Usage in Product List

```typescript
import { getProductAvailability } from "~/lib/availability";

function ProductCard(props: { product: Product }) {
  const availability = () => getProductAvailability(props.product, materials);

  return (
    <div class={availability().available ? "product-available" : "product-unavailable"}>
      <h3>{props.product.name}</h3>
      <Show when={!availability().available}>
        <span class="text-red-500">{availability().reason}</span>
      </Show>
    </div>
  );
}
```

### 4.2 Filtering Available Products

```typescript
import { getProductAvailability } from "~/lib/availability";

function MenuPage() {
  const materials = useRawMaterials();

  const availableProducts = createMemo(() => {
    return products.filter(p => {
      const { available } = getProductAvailability(p, materials());
      return available;
    });
  });

  const unavailableProducts = createMemo(() => {
    return products.filter(p => {
      const { available } = getProductAvailability(p, materials());
      return !available;
    });
  });

  return (
    <>
      <h2>Menu Tersedia ({availableProducts().length})</h2>
      <ProductList products={availableProducts()} />

      <Show when={unavailableProducts().length > 0}>
        <h2>Menu Tidak Tersedia ({unavailableProducts().length})</h2>
        <ProductList products={unavailableProducts()} dimmed />
      </Show>
    </>
  );
}
```

### 4.3 Disabling Add-to-Cart Button

```typescript
function AddToCartButton(props: { product: Product }) {
  const materials = useRawMaterials();
  const { available, reason } = () => getProductAvailability(props.product, materials());

  return (
    <button
      disabled={!available()}
      onClick={() => addToCart(props.product)}
      title={available() ? "Tambah ke keranjang" : reason()}
    >
      {available() ? "Tambah" : reason()}
    </button>
  );
}
```

---

## 5. Data Structures

### 5.1 Product Type (Simplified)

```typescript
interface Product {
  id: string;
  name: string;
  price: number;
  isActive?: boolean;  // Optional, defaults to true
  rawMaterials?: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}
```

### 5.2 RawMaterialLibrary Type

```typescript
interface RawMaterialLibrary {
  id: string;
  name: string;
  stock: number;
  isActive: boolean;
  costPerUnit: number;
  unit: string;
}
```

---

## 6. Decision Flowchart

```
┌──────────────────────────────────────────────────────────────┐
│                    getProductAvailability()                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Has rawMaterials │
                    │ && length > 0   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ NO                         │ YES
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────────────┐
    │ return:         │         │ For EACH ingredient:    │
    │ {                │         └───────────┬─────────────┘
    │   available:    │                     │
    │     baseIsActive │         ┌───────────┴───────────┐
    │ }                │         │                       │
    └─────────────────┘         │ Material found?       │
                                 └───────────┬─────────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │ NO                         │ YES
                              ▼                            ▼
                    ┌─────────────────┐          ┌─────────────────┐
                    │ return:         │          │ isActive ===    │
                    │ {                │          │ true?           │
                    │   available:     │          └────────┬────────┘
                    │     false,      │                   │
                    │   reason:       │         ┌────────┴────────┐
                    │     "Tidak     │         │ NO              │ YES
                    │      Ditemukan"│         ▼                 │
                    │ }              │ ┌──────────────┐         │
                    └────────────────┘ │ return:      │         │
                                       │ {            │         │
                                       │   available: │         │
                                       │     false,   │         │
                                       │   reason:    │         │
                                       │     "Off"   │         │
                                       │ }           │         │
                                       └──────────────┘         │
                                                                  │
                                                                  ▼
                                                     ┌─────────────────────┐
                                                     │ return:             │
                                                     │ {                   │
                                                     │   available: true    │
                                                     │ }                   │
                                                     └─────────────────────┘
```

---

## 7. Known Limitations

### 7.1 Stock Level Checking NOT Implemented

**Current Behavior:**
```typescript
// The function does NOT check stock levels
// Even if stock is 0, product may show as "available"
```

**Why:** The function only checks `isActive` status, not actual stock quantities.

**Impact:**
- Products with 0 stock still appear available
- May allow ordering items that cannot be fulfilled

**Recommended Fix:**
```typescript
// Suggested enhancement (NOT currently implemented)
if (material.stock <= 0) {
  return { available: false, reason: `Bahan "${ingredient.name}" Habis` };
}

// Or check if sufficient stock:
const requiredQty = ingredient.quantity * orderQuantity;
if (material.stock < requiredQty) {
  return { available: false, reason: `Stok "${ingredient.name}" tidak cukup` };
}
```

### 7.2 Missing Material Handling

**Current Behavior:** Returns `false` if material ID not found in library.

**Recommendation:** This is correct behavior - prevents orphaned references.

---

## 8. Related Files

| File | Purpose |
|------|---------|
| `src/db/db.ts` | Dexie database with Product and RawMaterialLibrary types |
| `src/stores/cart.ts` | Cart operations |
| `src/hooks/useCheckout.ts` | Checkout process with inventory deduction |
| `src/lib/inventory.ts` | (If exists) Inventory management utilities |

---

## 9. Testing Scenarios

### 9.1 Test Cases

| Scenario | Product.isActive | Material.isActive | Expected Result |
|----------|------------------|-------------------|-----------------|
| Active product, no materials | `true` | N/A | `{ available: true }` |
| Inactive product | `false` | N/A | `{ available: false, reason: "Nonaktif" }` |
| Active product, active material | `true` | `true` | `{ available: true }` |
| Active product, inactive material | `true` | `false` | `{ available: false, reason: "Bahan X Off" }` |
| Material not found | `true` | undefined | `{ available: false, reason: "Bahan X Tidak Ditemukan" }` |
| Product with undefined isActive | undefined | N/A | `{ available: true }` (defaults to true) |

### 9.2 Example Test

```typescript
import { describe, it, expect } from "vitest";
import { getProductAvailability } from "~/lib/availability";

describe("getProductAvailability", () => {
  it("should return available for active product with no materials", () => {
    const product = { id: "p1", name: "Coffee", price: 15000, isActive: true };
    const result = getProductAvailability(product, []);
    expect(result.available).toBe(true);
  });

  it("should return unavailable for inactive product", () => {
    const product = { id: "p1", name: "Coffee", price: 15000, isActive: false };
    const result = getProductAvailability(product, []);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Nonaktif");
  });

  it("should return unavailable when material not found", () => {
    const product = {
      id: "p1",
      name: "Coffee",
      price: 15000,
      isActive: true,
      rawMaterials: [{ id: "m1", name: "Coffee Beans", quantity: 10 }]
    };
    const result = getProductAvailability(product, []);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("Tidak Ditemukan");
  });
});
```

---

## 10. Future Enhancements

### Recommended Improvements

1. **Stock Level Checking**
   ```typescript
   // Check actual stock quantities
   if (material.stock < ingredient.quantity) {
     return { available: false, reason: `Stok "${ingredient.name}" tidak cukup` };
   }
   ```

2. **Low Stock Warning**
   ```typescript
   if (material.stock < ingredient.quantity * 5) {
     // Emit warning event for restock notification
   }
   ```

3. **Real-time Updates**
   ```typescript
   // Subscribe to inventory changes
   onInventoryUpdate((updatedMaterial) => {
     // Re-check availability for affected products
   });
   ```

4. **Alternative Ingredients**
   ```typescript
   // Suggest alternatives when out of stock
   const alternatives = getAlternativeMaterials(materialId);
   ```

---

*Document Version: 1.0*
*Last Updated: 2026-04-18*
