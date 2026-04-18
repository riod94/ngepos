import { describe, it, expect } from "vitest";
import type { Product, RawMaterialLibrary } from "~/db/db";

function getProductAvailability(
  product: Product,
  materials: RawMaterialLibrary[]
): { available: boolean; reason?: string } {
  const baseIsActive = product.isActive ?? true;
  if (!baseIsActive) {
    return { available: false, reason: "Nonaktif" };
  }

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

  return { available: true };
}

const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: "p1",
  name: "Test Product",
  price: 15000,
  cogs: 5000,
  category: "drinks",
  stock: 100,
  image: "",
  isActive: true,
  ...overrides,
});

const createMockMaterial = (overrides: Partial<RawMaterialLibrary> = {}): RawMaterialLibrary => ({
  id: "m1",
  name: "Test Material",
  stock: 100,
  isActive: true,
  costPerUnit: 1000,
  unit: "gram",
  ...overrides,
});

describe("Availability Service", () => {
  describe("getProductAvailability", () => {
    it("should return available for active product with no materials", () => {
      const product = createMockProduct({ isActive: true, rawMaterials: undefined });
      const result = getProductAvailability(product, []);
      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should return available when isActive is undefined (defaults to true)", () => {
      const product = createMockProduct({ isActive: undefined });
      const result = getProductAvailability(product, []);
      expect(result.available).toBe(true);
    });

    it("should return unavailable for inactive product", () => {
      const product = createMockProduct({ isActive: false });
      const result = getProductAvailability(product, []);
      expect(result.available).toBe(false);
      expect(result.reason).toBe("Nonaktif");
    });

    it("should return unavailable when material not found", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: [{ id: "m1", name: "Coffee Beans", quantity: 10, cost: 10000, unit: "gram" }]
      });
      const result = getProductAvailability(product, []);
      expect(result.available).toBe(false);
      expect(result.reason).toContain("Tidak Ditemukan");
    });

    it("should return unavailable when material is inactive", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: [{ id: "m1", name: "Coffee Beans", quantity: 10, cost: 10000, unit: "gram" }]
      });
      const materials = [createMockMaterial({ id: "m1", isActive: false })];
      const result = getProductAvailability(product, materials);
      expect(result.available).toBe(false);
      expect(result.reason).toContain("Off");
    });

    it("should return available when all materials are active", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: [{ id: "m1", name: "Coffee Beans", quantity: 10, cost: 10000, unit: "gram" }]
      });
      const materials = [createMockMaterial({ id: "m1", isActive: true })];
      const result = getProductAvailability(product, materials);
      expect(result.available).toBe(true);
    });

    it("should return available for product with empty rawMaterials array", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: []
      });
      const result = getProductAvailability(product, []);
      expect(result.available).toBe(true);
    });

    it("should return unavailable when any material is inactive (cascading check)", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: [
          { id: "m1", name: "Coffee Beans", quantity: 10, cost: 10000, unit: "gram" },
          { id: "m2", name: "Milk", quantity: 5, cost: 5000, unit: "ml" }
        ]
      });
      const materials = [
        createMockMaterial({ id: "m1", isActive: true }),
        createMockMaterial({ id: "m2", isActive: false })
      ];
      const result = getProductAvailability(product, materials);
      expect(result.available).toBe(false);
      expect(result.reason).toContain("Milk");
      expect(result.reason).toContain("Off");
    });

    it("should check multiple materials correctly when all active", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: [
          { id: "m1", name: "Coffee Beans", quantity: 10, cost: 10000, unit: "gram" },
          { id: "m2", name: "Milk", quantity: 5, cost: 5000, unit: "ml" }
        ]
      });
      const materials = [
        createMockMaterial({ id: "m1", isActive: true }),
        createMockMaterial({ id: "m2", isActive: true })
      ];
      const result = getProductAvailability(product, materials);
      expect(result.available).toBe(true);
    });

    it("should return unavailable when material id is string match but material not in library", () => {
      const product = createMockProduct({
        isActive: true,
        rawMaterials: [{ id: "m999", name: "Unknown Material", quantity: 1, cost: 0, unit: "pcs" }]
      });
      const result = getProductAvailability(product, []);
      expect(result.available).toBe(false);
      expect(result.reason).toContain("Tidak Ditemukan");
    });
  });
});
