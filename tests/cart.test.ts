import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStore } from "solid-js/store";

type CartItem = {
  id: string;
  cartItemId: string;
  quantity: number;
  basePrice: number;
  price: number;
  selectedVariants?: { groupName: string; optionName: string; priceModifier: number }[];
};

function createCartStore(initial: CartItem[] = []) {
  const [cart, setCart] = createStore<CartItem[]>(initial);

  function addToCart(product: { id: string; price: number }, selectedVariants?: CartItem['selectedVariants']) {
    setCart(items => {
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
        id: product.id,
        cartItemId,
        quantity: 1,
        basePrice: product.price,
        price: product.price + additionalPrice,
        selectedVariants
      }];
    });
  }

  function updateQuantity(cartItemId: string, delta: number) {
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

  function getCartCount() {
    return cart.reduce((count, item) => count + item.quantity, 0);
  }

  function getCartSubtotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  function clearCart() {
    setCart([]);
  }

  return {
    cart,
    addToCart,
    updateQuantity,
    getCartCount,
    getCartSubtotal,
    clearCart
  };
}

describe("Cart Store", () => {
  describe("addToCart", () => {
    it("should add a new item to empty cart", () => {
      const { cart, addToCart, getCartCount } = createCartStore();

      addToCart({ id: "p1", price: 15000 });

      expect(cart.length).toBe(1);
      expect(getCartCount()).toBe(1);
      expect(cart[0].id).toBe("p1");
      expect(cart[0].quantity).toBe(1);
      expect(cart[0].price).toBe(15000);
    });

    it("should increment quantity when adding existing item", () => {
      const { cart, addToCart, getCartCount } = createCartStore();

      addToCart({ id: "p1", price: 15000 });
      addToCart({ id: "p1", price: 15000 });

      expect(cart.length).toBe(1);
      expect(getCartCount()).toBe(2);
      expect(cart[0].quantity).toBe(2);
    });

    it("should create separate cart items for different variants", () => {
      const { cart, addToCart } = createCartStore();

      const variants1 = [{ groupName: "Size", optionName: "Regular", priceModifier: 0 }];
      const variants2 = [{ groupName: "Size", optionName: "Large", priceModifier: 5000 }];

      addToCart({ id: "p1", price: 15000 }, variants1);
      addToCart({ id: "p1", price: 15000 }, variants2);

      expect(cart.length).toBe(2);
      expect(cart[0].cartItemId).not.toBe(cart[1].cartItemId);
    });

    it("should apply price modifier for variants", () => {
      const { cart, addToCart } = createCartStore();

      const variants = [{ groupName: "Size", optionName: "Large", priceModifier: 5000 }];
      addToCart({ id: "p1", price: 15000 }, variants);

      expect(cart[0].price).toBe(20000);
    });

    it("should sort variants alphabetically for consistent hash", () => {
      const { cart, addToCart } = createCartStore();

      const variants1 = [{ groupName: "Size", optionName: "Large", priceModifier: 5000 }];
      const variants2 = [{ groupName: "Size", optionName: "Regular", priceModifier: 0 }];

      addToCart({ id: "p1", price: 15000 }, variants1);
      addToCart({ id: "p1", price: 15000 }, variants2);

      expect(cart.length).toBe(2);
    });
  });

  describe("updateQuantity", () => {
    it("should increment quantity with positive delta", () => {
      const { cart, updateQuantity } = createCartStore([{
        id: "p1",
        cartItemId: "p1-",
        quantity: 1,
        basePrice: 15000,
        price: 15000
      }]);

      updateQuantity("p1-", 2);

      expect(cart[0].quantity).toBe(3);
    });

    it("should decrement quantity with negative delta", () => {
      const { cart, updateQuantity } = createCartStore([{
        id: "p1",
        cartItemId: "p1-",
        quantity: 5,
        basePrice: 15000,
        price: 15000
      }]);

      updateQuantity("p1-", -2);

      expect(cart[0].quantity).toBe(3);
    });

    it("should remove item when quantity reaches zero", () => {
      const { cart, updateQuantity } = createCartStore([{
        id: "p1",
        cartItemId: "p1-",
        quantity: 1,
        basePrice: 15000,
        price: 15000
      }]);

      updateQuantity("p1-", -1);

      expect(cart.length).toBe(0);
    });

    it("should not go below zero", () => {
      const { cart, updateQuantity } = createCartStore([{
        id: "p1",
        cartItemId: "p1-",
        quantity: 2,
        basePrice: 15000,
        price: 15000
      }]);

      updateQuantity("p1-", -10);

      expect(cart.length).toBe(0);
    });
  });

  describe("getCartCount", () => {
    it("should return total quantity of all items", () => {
      const { getCartCount, addToCart } = createCartStore();

      addToCart({ id: "p1", price: 15000 });
      addToCart({ id: "p2", price: 20000 });
      addToCart({ id: "p1", price: 15000 });

      expect(getCartCount()).toBe(3);
    });

    it("should return 0 for empty cart", () => {
      const { getCartCount } = createCartStore();

      expect(getCartCount()).toBe(0);
    });
  });

  describe("getCartSubtotal", () => {
    it("should calculate correct subtotal", () => {
      const { getCartSubtotal, addToCart } = createCartStore();

      addToCart({ id: "p1", price: 15000 });
      addToCart({ id: "p2", price: 20000 });
      addToCart({ id: "p1", price: 15000 });

      expect(getCartSubtotal()).toBe(50000);
    });

    it("should return 0 for empty cart", () => {
      const { getCartSubtotal } = createCartStore();

      expect(getCartSubtotal()).toBe(0);
    });

    it("should multiply price by quantity", () => {
      const { getCartSubtotal, addToCart } = createCartStore();

      addToCart({ id: "p1", price: 15000 });
      addToCart({ id: "p1", price: 15000 });

      expect(getCartSubtotal()).toBe(30000);
    });
  });

  describe("clearCart", () => {
    it("should remove all items", () => {
      const { cart, clearCart, addToCart, getCartCount } = createCartStore();

      addToCart({ id: "p1", price: 15000 });
      addToCart({ id: "p2", price: 20000 });

      clearCart();

      expect(cart.length).toBe(0);
      expect(getCartCount()).toBe(0);
    });
  });
});
