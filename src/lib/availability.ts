import { type Product, type RawMaterialLibrary } from "~/db/db";

/**
 * Checks if a product is available based on:
 * 1. Its own isActive toggle.
 * 2. If it has ingredients: All ingredients must be isActive AND have stock > 0.
 * 
 * @param product The product to check
 * @param materials All raw materials from the library for cross-reference
 * @returns { available: boolean, reason?: string }
 */
export function getProductAvailability(
  product: Product, 
  materials: RawMaterialLibrary[]
): { available: boolean; reason?: string } {
  // 1. Basic product toggle
  const baseIsActive = product.isActive ?? true;
  if (!baseIsActive) {
    return { available: false, reason: "Nonaktif" };
  }

  // 2. Ingredient check (Cascade)
  if (product.rawMaterials && product.rawMaterials.length > 0) {
    for (const ingredient of product.rawMaterials) {
      const material = materials.find(m => m.id === ingredient.id);
      
      if (!material) {
        return { available: false, reason: `Bahan "${ingredient.name}" Tidak Ditemukan` };
      }

      // Check if material is active
      if (!material.isActive) {
        return { available: false, reason: `Bahan "${ingredient.name}" Off` };
      }
    }
  }

  return { available: true };
}
