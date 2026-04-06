import { createStore } from "solid-js/store";
import type { Product } from "~/db/db";

export type CartItem = Product & { 
  cartItemId: string; 
  quantity: number;
  basePrice: number;
  selectedVariants?: { groupName: string; optionName: string; priceModifier: number }[];
};

const [cart, setCart] = createStore<CartItem[]>([]);

export function addToCart(product: Product, selectedVariants?: CartItem['selectedVariants']) {
  setCart(items => {
    // Generate unique ID based on product and variants to separate variants in cart
    let variantHash = '';
    let additionalPrice = 0;
    
    if (selectedVariants && selectedVariants.length > 0) {
      const sorted = [...selectedVariants].sort((a, b) => a.optionName.localeCompare(b.optionName));
      variantHash = sorted.map(v => v.optionName).join('-');
      additionalPrice = sorted.reduce((sum, v) => sum + v.priceModifier, 0);
    }
    
    const cartItemId = `${product.id}-${variantHash}`;
    const existing = items.find(item => item.cartItemId === cartItemId);
    
    if (existing) {
      return items.map(item => 
        item.cartItemId === cartItemId 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      );
    }
    
    return [...items, { 
      ...product, 
      cartItemId, 
      quantity: 1,
      basePrice: product.price,
      price: product.price + additionalPrice,
      selectedVariants
    }];
  });
}

export function updateCartItemVariants(cartItemId: string, newVariants: CartItem['selectedVariants']) {
  setCart(items => {
    const existing = items.find(item => item.cartItemId === cartItemId);
    if (!existing) return items;

    // Calculate new ID and additional price
    let variantHash = '';
    let additionalPrice = 0;
    if (newVariants && newVariants.length > 0) {
      const sorted = [...newVariants].sort((a, b) => a.optionName.localeCompare(b.optionName));
      variantHash = sorted.map(v => v.optionName).join('-');
      additionalPrice = sorted.reduce((sum, v) => sum + v.priceModifier, 0);
    }
    const newCartItemId = `${existing.id}-${variantHash}`;

    // If the new variant set matches another item already in cart, merge them
    const otherItem = items.find(item => item.cartItemId === newCartItemId && item.cartItemId !== cartItemId);
    
    if (otherItem) {
      // Remove current, add quantity to other
      return items.filter(item => item.cartItemId !== cartItemId).map(item => 
        item.cartItemId === newCartItemId 
          ? { ...item, quantity: item.quantity + existing.quantity } 
          : item
      );
    }

    // Otherwise just update current item
    return items.map(item => {
      if (item.cartItemId === cartItemId) {
        // Fallback for items that don't have basePrice yet (from previous session)
        const currentBase = item.basePrice ?? (item.price - (item.selectedVariants?.reduce((s, v) => s + v.priceModifier, 0) || 0));
        
        return {
          ...item,
          cartItemId: newCartItemId,
          selectedVariants: newVariants,
          basePrice: currentBase,
          price: currentBase + additionalPrice
        };
      }
      return item;
    });
  });
}

export function updateQuantity(cartItemId: string, delta: number) {
  setCart(items => {
    return items.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQuantity = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0);
  });
}

export function getCartTotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function getCartCount() {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

export function clearCart() {
  setCart([]);
}

export { cart, setCart };
