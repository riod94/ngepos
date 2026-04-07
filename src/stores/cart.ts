import { createStore } from "solid-js/store";
import { createResource } from "solid-js";
import { db, type Product } from "~/db/db";

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

export function getCartCount() {
  return cart.reduce((count, item) => count + item.quantity, 0);
}

// ── Campaign / Promo V2 Logic ────────────────────────────────────────────────
// Refetched when campaigns change

const [activeCampaigns, { refetch: refetchCampaigns }] = createResource(async () => {
  const camps = await db.campaigns.where('isActive').equals(1).toArray();
  // Sort manually if sortBy has issues with boolean conversion in some Dexie versions
  camps.sort((a, b) => b.priority - a.priority);
  
  // Eager load items and rewards for performance
  const allItems = await db.campaignItems.toArray();
  const allRewards = await db.campaignRewards.toArray();
  
  return camps.map(c => ({
    ...c,
    requirements: allItems.filter(i => i.campaignId === c.id && i.type === 'REQUIREMENT'),
    targetProducts: allItems.filter(i => i.campaignId === c.id && i.type === 'TARGET_DISCOUNT').map(i => i.productId),
    reward: allRewards.find(r => r.campaignId === c.id)
  }));
});

export function calculateDiscounts() {
  const campaigns = activeCampaigns() || [];
  let totalDiscount = 0;
  const appliedDetails: { name: string; amount: number }[] = [];

  if (campaigns.length === 0) return { total: 0, details: [], note: "" };

  // Track quantities used by previous campaigns to avoid double-dipping in bundles
  // Map of cartItemId -> usedQuantity
  const usedQty: Record<string, number> = {};
  
  // Sort campaigns by priority (descending, higher number = higher priority)
  const sortedCampaigns = [...campaigns].sort((a, b) => b.priority - a.priority);

  sortedCampaigns.forEach(camp => {
    if (!camp.reward) return;

    if (camp.type === 'BULK_DISCOUNT') {
      // Apply discount to each target product in cart
      cart.forEach(item => {
        // Use loose equality check if IDs are string vs number in DB
        if (camp.targetProducts.some(id => String(id) === String(item.id))) {
          let amount = 0;
          if (camp.reward!.rewardType === 'PERCENT_DISCOUNT') {
            amount = Math.round((item.price * (camp.reward!.value || 0) / 100) * item.quantity);
          } else if (camp.reward!.rewardType === 'FIXED_DISCOUNT') {
            amount = (camp.reward!.value || 0) * item.quantity;
          }
          
          if (amount > 0) {
            totalDiscount += amount;
            appliedDetails.push({ name: `${camp.name} (${item.name})`, amount });
          }
        }
      });
    } 
    else if (camp.type === 'BUNDLE' || camp.type === 'BUY_X_GET_Y') {
      // Logic for Multi-product Requirements
      // 1. Check if all requirements are met
      let maxSets = Infinity;
      
      const metRequirements = camp.requirements.every(req => {
        // Find total available quantity for this product across different variant sets in cart
        const availableItems = cart.filter(it => String(it.id) === String(req.productId));
        const totalAvailable = availableItems.reduce((sum, it) => sum + (it.quantity - (usedQty[it.cartItemId] || 0)), 0);
        
        if (totalAvailable < req.quantity) return false;
        
        const setsForThisReq = Math.floor(totalAvailable / req.quantity);
        maxSets = Math.min(maxSets, setsForThisReq);
        return true;
      });

      if (metRequirements && maxSets > 0) {
        // 2. Calculate Reward
        let rewardAmount = 0;
        
        if (camp.reward.rewardType === 'FREE_PRODUCT' && camp.reward.productId) {
          // Find the reward product price (from current cart or lookup)
          // For now, assume it's one of the products in requirements or defined in DB
          const rewardItem = cart.find(it => it.id === camp.reward!.productId);
          if (rewardItem) {
            rewardAmount = rewardItem.price * camp.reward.value * maxSets;
          } else {
            // If reward product is NOT in cart, we might need to "add" it automatically or ignore
            // For logic simplicity, we'll only calculate discount if user has added it
          }
        } else if (camp.reward.rewardType === 'PERCENT_DISCOUNT') {
           // Bundle total price discount? Usually BUNDLE is fixed price.
           // For complexity, let's say it applies to the total of the required items
           const reqTotal = camp.requirements.reduce((sum, req) => {
             const it = cart.find(c => c.id === req.productId);
             return sum + (it ? it.price * req.quantity : 0);
           }, 0);
           rewardAmount = Math.round((reqTotal * (camp.reward.value / 100)) * maxSets);
        } else if (camp.reward.rewardType === 'FIXED_DISCOUNT') {
           rewardAmount = camp.reward.value * maxSets;
        }

        if (rewardAmount > 0) {
          totalDiscount += rewardAmount;
          appliedDetails.push({ name: camp.name, amount: rewardAmount });
          
          // 3. Consume Quantities (to prevent reuse in other high-priority campaigns)
          camp.requirements.forEach(req => {
            let needed = req.quantity * maxSets;
            cart.filter(it => String(it.id) === String(req.productId)).forEach(it => {
              if (needed <= 0) return;
              const available = it.quantity - (usedQty[it.cartItemId] || 0);
              const consume = Math.min(available, needed);
              usedQty[it.cartItemId] = (usedQty[it.cartItemId] || 0) + consume;
              needed -= consume;
            });
          });
        }
      }
    }
  });

  return { 
    total: totalDiscount, 
    details: appliedDetails,
    note: appliedDetails.map(d => d.name).join(', ')
  };
}

export function getCartSubtotal() {
  return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function getCartTotal() {
  const subtotal = getCartSubtotal();
  const disc = calculateDiscounts();
  return Math.max(0, subtotal - disc.total);
}

export { refetchCampaigns };

export function clearCart() {
  setCart([]);
}

export { cart, setCart };
