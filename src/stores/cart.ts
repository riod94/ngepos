import { createStore } from "solid-js/store";
import type { Product } from "~/db/db";

export type CartItem = Product & { 
  cartItemId: string; 
  quantity: number;
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
      price: product.price + additionalPrice, // Override base price safely in CartItem copy
      selectedVariants
    }];
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
