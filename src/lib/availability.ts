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
  if (!product.isActive) {
    return { available: false, reason: "Nonaktif" };
  }

  // 2. Ingredient check (Cascade)
  if (product.rawMaterials && product.rawMaterials.length > 0) {
    for (const ingredient of product.rawMaterials) {
      const material = materials.find(m => m.id === ingredient.id);
      
      if (!material) {
        return { available: false, reason: `Bahan ${ingredient.name} tidak ditemukan` };
      }

      // Check if material is active
      if (!material.isActive) {
        return { available: false, reason: `${ingredient.name} Nonaktif` };
      }

      // Check if stock is sufficient (simple check for now)
      if (material.stock <= 0) {
        return { available: false, reason: `${ingredient.name} Habis` };
      }
      
      // Note: We could do a more precise check (stock < ingredient.quantity),
      // but for a quick POS summary, stock > 0 is the primary indicator.
    }
  }

  // 3. Retail stock check (if no ingredients)
  if ((!product.rawMaterials || product.rawMaterials.length === 0) && product.stock <= 0) {
    // Some retail products might allow negative stock or ignore it, 
    // but typically stock 0 means empty.
    // However, if the business doesn't track retail stock strictly, they might just 
    // rely on the isActive toggle.
    // Let's assume if they don't have ingredients, we check the product.stock 
    // ONLY if it's meant to be tracked. 
    // For now, let's keep it simple: manual isActive is king for retail.
  }

  return { available: true };
}
