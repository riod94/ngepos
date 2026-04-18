# VariantSelector Component Documentation

**File:** `src/components/VariantSelector.tsx`
**Status:** ✅ Implemented
**Last Updated:** 2026-04-18

---

## 1. Overview

The `VariantSelector` component is a bottom sheet UI component that allows users to select product variants/modifiers before adding items to their cart. It's designed specifically for Indonesian F&B (Food & Beverage) businesses where products often have customizable options like size, sugar level, ice level, and toppings.

---

## 2. Component Props

```typescript
interface VariantSelectorProps {
  product: Product | null;           // Product to select variants for
  open: boolean;                     // Sheet open state
  onOpenChange: (open: boolean) => void;  // Open state setter
  initialVariants?: Array<{          // Pre-selected variants (for editing)
    groupName: string;
    optionName: string;
    priceModifier: number;
  }>;
  onConfirm: (variants: Array<{     // Callback when confirmed
    groupName: string;
    optionName: string;
    priceModifier: number;
  }>) => void;
  confirmLabel?: string;             // Custom confirm button label
}
```

---

## 3. Usage Examples

### 3.1 Basic Usage (Adding New Item)

```tsx
import { VariantSelector } from "~/components/VariantSelector";
import { createSignal } from "solid-js";

function MenuPage() {
  const [variantOpen, setVariantOpen] = createSignal(false);
  const [selectedProduct, setSelectedProduct] = createSignal<Product | null>(null);

  const handleAddToCart = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setSelectedProduct(product);
      setVariantOpen(true);
    } else {
      // No variants - add directly
      addToCart(product);
    }
  };

  const handleVariantConfirm = (variants: Variant[]) => {
    addToCart(selectedProduct(), variants);
    setVariantOpen(false);
  };

  return (
    <VariantSelector
      product={selectedProduct()}
      open={variantOpen()}
      onOpenChange={setVariantOpen}
      onConfirm={handleVariantConfirm}
    />
  );
}
```

### 3.2 With Initial Variants (Editing Cart Item)

```tsx
const handleEditCartItem = (cartItem: CartItem) => {
  setSelectedProduct(cartItem.product);
  setInitialVariants(cartItem.selectedVariants);
  setVariantOpen(true);
};

// When opening sheet with existing selections
<VariantSelector
  product={selectedProduct()}
  open={variantOpen()}
  onOpenChange={setVariantOpen}
  initialVariants={cartItem.selectedVariants}
  onConfirm={handleUpdateCartItem}
  confirmLabel="Update Pesanan"
/>
```

---

## 4. Variant Types

### 4.1 SINGLE Selection Type

Used when user can only select ONE option from a group.

**Example:** Size selection
```
┌─────────────────────────────┐
│ UKURAN           [Wajib]   │
├─────────────────────────────┤
│ ○ Regular      (+ Rp 0)    │
│ ○ Large        (+ Rp 5.000)│
│ ○ Extra Large  (+ Rp 8.000)│
└─────────────────────────────┘
```

**Behavior:**
- Clicking a selected option deselects it (if NOT required)
- Clicking another option switches selection
- Cannot deselect required groups

### 4.2 MULTIPLE Selection Type

Used when user can select MULTIPLE options from a group.

**Example:** Toppings selection
```
┌─────────────────────────────┐
│ TOPPING          [Opsional]│
├─────────────────────────────┤
│ □ Kenari         (+ Rp 3.000)│
│ □ Kacang        (+ Rp 2.000)│
│ □ Coklat        (+ Rp 4.000)│
│ □ Keju          (+ Rp 5.000)│
└─────────────────────────────┘
```

**Behavior:**
- Clicking toggles selection on/off
- Respects `maxSelectable` limit if set
- No limit if `maxSelectable` is 0 or undefined

---

## 5. Required vs Optional Groups

### 5.1 Required Groups (`isRequired: true`)

- Displayed with red "WAJIB" badge
- Visual indicator (red border on group header) when not selected
- Cannot confirm without selecting at least one option
- Error alert shown: "Mohon pilih varian: [group names]"

### 5.2 Optional Groups (`isRequired: false`)

- Displayed with no badge or "Opsional" text
- Can be left empty
- Can deselect all options

---

## 6. Price Calculation Logic

### 6.1 Base Price Calculation

```typescript
const getEffectiveBasePrice = () => {
  // Use stored basePrice if available (from recent cart update)
  if (prod.basePrice !== undefined) return prod.basePrice;

  // If not, calculate by subtracting initial variant prices
  // This handles old session items or first-time additions
  const initialModifiers = initialVariants.reduce((s, v) => s + v.priceModifier, 0);
  return prod.price - initialModifiers;
};
```

### 6.2 Total Price Formula

```
Total = Base Price + Σ(Selected Option Price Modifiers)
```

**Example:**
- Product base price: Rp 15.000
- Selected variants:
  - Size: Large (+Rp 5.000)
  - Sugar: Less Sugar (+Rp 0)
  - Topping: Cheese (+Rp 5.000)
- **Total: Rp 25.000**

---

## 7. State Management

### 7.1 Local State

```typescript
const [selectedVariants, setSelectedVariants] = createSignal<{
  groupName: string;
  option: VariantOption;
}[]>([]);
```

### 7.2 State Sync on Open

When `props.open` changes to `true`, the component:

1. **With `initialVariants`:** Restores previous selections
2. **Without `initialVariants`:** Auto-selects first option for REQUIRED SINGLE groups

```typescript
createMemo(() => {
  if (props.open && props.product) {
    if (props.initialVariants?.length > 0) {
      // Restore from cart item
      setSelectedVariants(mappedInitial);
    } else {
      // Auto-select defaults for required groups
      setSelectedVariants(defaults);
    }
  }
});
```

---

## 8. Validation Rules

| Rule | Behavior |
|------|----------|
| Required group empty | Alert with missing group names |
| Single select in MULTI group | Toggle on/off |
| Exceeds maxSelectable | Selection blocked |
| Deselect required group | Blocked, stays selected |

---

## 9. UI/UX Design

### 9.1 Visual States

| State | Visual Treatment |
|-------|-----------------|
| Unselected | Gray border, normal text |
| Selected | Primary border, primary tint background |
| Required + Unselected | Red border, red tint header |
| Required + Selected | Primary border, "WAJIB" badge turns active |

### 9.2 Animation

- Sheet slides up from bottom
- 300ms ease-out transition
- Rounded top corners (32px radius)
- Shadow for elevation effect

### 9.3 Layout

- Full width on mobile (max-width 448px on tablet/desktop)
- 90vh height maximum
- Scrollable variant list
- Fixed bottom confirm button

---

## 10. Integration with Cart Store

### 10.1 Adding to Cart

```typescript
const handleVariantConfirm = (variants: Variant[]) => {
  const variantData = variants.map(v => ({
    groupName: v.groupName,
    optionName: v.optionName,
    priceModifier: v.priceModifier
  }));

  addToCart(product, variantData);
  setVariantOpen(false);
};
```

### 10.2 Editing Cart Item

```typescript
// Cart item stores variants as:
interface CartItem {
  id: string;
  name: string;
  price: number;
  selectedVariants: {
    groupName: string;
    optionName: string;
    priceModifier: number;
  }[];
}

// To edit:
const openEditSheet = (cartItem: CartItem) => {
  setEditingCartItem(cartItem);
  setVariantOpen(true);
};
```

---

## 11. Accessibility

- All buttons have `type="button"` to prevent form submission
- Check icons use `aria-hidden` with semantic meaning
- Group labels are uppercase for visual hierarchy
- Touch targets are minimum 44x44px

---

## 12. Error Handling

### 12.1 Required Group Validation

```typescript
const missing = activeGroups().filter(g =>
  g.isRequired && !selectedVariants().some(sv => sv.groupName === g.name)
);

if (missing.length > 0) {
  alert(`Mohon pilih varian: ${missing.map(m => m.name).join(', ')}`);
  return;
}
```

### 12.2 Null Product Guard

```typescript
const handleConfirm = () => {
  const prod = props.product;
  if (!prod) return; // Early return if no product
  // ... validation and confirm logic
};
```

---

## 13. Related Files

| File | Purpose |
|------|---------|
| `src/db/db.ts` | Product and Variant types |
| `src/stores/cart.ts` | Cart state management |
| `src/components/ui/sheet.ts` | Bottom sheet primitive |
| `src/components/ui/button.ts` | Button component |

---

## 14. Future Enhancements

- [ ] Support for variant images
- [ ] Variant combination validation (e.g., can't have Hot + Less Ice)
- [ ] Variant popularity analytics
- [ ] Quick-add favorites
- [ ] Recent variant combinations

---

*Document Version: 1.0*
*Last Updated: 2026-04-18*
