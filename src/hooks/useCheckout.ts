import { createSignal } from "solid-js";
import { unwrap } from "solid-js/store";
import { toast } from "solid-toast";
import { db } from "~/db/db";
import {
  cart,
  getCartSubtotal,
  calculateDiscounts,
  linkedCustomerId,
  appliedRewardId,
} from "~/stores/cart";
import { 
  isStampEligible, 
  getActiveProgram, 
  addStamp, 
  getCustomerProgress, 
  checkAndCreateReward,
  claimReward
} from "~/stores/loyalty";

interface CheckoutOptions {
  method: string;
  finalAmount: number;
  transactionTimestamp: number;
  isBackdated: boolean;
  rewardProduct?: any;
  finalTotalAmountFunc: () => number;
}

export function useCheckout() {
  const [processing, setProcessing] = createSignal(false);

  const getLoyaltyRewardAmount = (rwProd: any) => {
    if (!appliedRewardId() || !rwProd) return 0;
    return rwProd.price;
  };

  async function submitTransaction(opts: CheckoutOptions): Promise<string | null> {
    if (processing()) return null;
    
    const { method, finalAmount, transactionTimestamp: ts, isBackdated, rewardProduct: rwProd, finalTotalAmountFunc } = opts;

    const rawCart = unwrap(cart);
    const cartSnapshot = structuredClone(rawCart);
    const originalTotal = getCartSubtotal();
    const discountInfo = calculateDiscounts();

    if (!cartSnapshot || cartSnapshot.length === 0) {
      toast.error("Gagal: Keranjang belanja kosong.");
      return null;
    }
    
    setProcessing(true);
    let resultTransactionId: string | null = null;

    try {
      resultTransactionId = await db.transaction(
        "rw",
        ["transactions", "transactionItems", "products"],
        async () => {
          let cogsTotal = 0;
          const transactionId = `txn_${Date.now()}`;

          const itemsToSave = [];
          for (const [idx, item] of cartSnapshot.entries()) {
            const product = await db.products.get(item.id);
            let unitCogs = product?.cogs ?? item.price * 0.45;

            if (item.selectedVariants) {
              for (const sv of item.selectedVariants) {
                const group = product?.variants?.find((g: any) => g.name === sv.groupName);
                const option = group?.options.find((o: any) => o.name === sv.optionName);
                unitCogs += option?.cogsModifier ?? 0;
              }
            }

            cogsTotal += unitCogs * item.quantity;

            itemsToSave.push({
              id: `ti_${transactionId}_${idx}`,
              transactionId,
              productId: item.id,
              productName: item.name,
              quantity: item.quantity,
              priceAtTime: item.price,
              cogsAtTime: unitCogs,
              selectedVariants: item.selectedVariants,
            });

            if (product) {
              await db.products.update(item.id, {
                stock: Math.max(0, product.stock - item.quantity),
              });
            }
          }

          const rid = appliedRewardId();
          if (rid && rwProd) {
            itemsToSave.push({
              id: `ti_reward_${Date.now()}`,
              transactionId,
              productId: rwProd.id,
              productName: `[GIFT] ${rwProd.name}`,
              quantity: 1,
              priceAtTime: 0,
              cogsAtTime: rwProd.cogs || rwProd.price * 0.45,
              selectedVariants: []
            });
            cogsTotal += (rwProd.cogs || rwProd.price * 0.45);
          }

          if (itemsToSave.length === 0) throw new Error("Item tidak terdeteksi");

          const isAdjustment = finalAmount !== finalTotalAmountFunc();
          const discountTotalVal = discountInfo.total + getLoyaltyRewardAmount(rwProd);
          const discountNoteVal = discountInfo.note + (rid ? ", Loyalty Reward" : "");

          await db.transactions.add({
            id: transactionId,
            receiptNumber: `INV-${Date.now()}`,
            totalAmount: finalAmount,
            originalAmount: originalTotal,
            totalDiscount: originalTotal - finalAmount,
            cogsTotal,
            paymentMethod: method,
            timestamp: ts,
            status: "PENDING",
            isBackdated,
            isAdjustment,
            discountTotal: discountTotalVal,
            discountNote: discountNoteVal,
            customerId: linkedCustomerId() || undefined,
          } as any);

          await db.transactionItems.bulkAdd(itemsToSave);
          
          return transactionId;
        }
      );

      // Post-checkout: Update Loyalty (outside transaction for side effects)
      if (resultTransactionId && linkedCustomerId()) {
        const cid = linkedCustomerId()!;
        const lp = await getActiveProgram();
        if (lp) {
          const cartProductIds = cartSnapshot.map((it: any) => String(it.id));
          const eligible = isStampEligible(originalTotal, discountInfo.total > 0, cartProductIds, lp);
          
          if (eligible) {
            await addStamp(cid, lp.id, resultTransactionId);
            const progress = await getCustomerProgress(cid, lp.id);
            
            if (progress.isEligibleForReward) {
              await checkAndCreateReward(cid, lp.id);
              toast.success("🎉 Target Stamp Tercapai! Reward baru tersedia.");
            } else {
              toast.success(`Stamp +1 (${progress.currentStamps}/${progress.targetStamps}) ✓`);
            }
          }
        }

        const rid = appliedRewardId();
        if (rid) {
          await claimReward(rid, resultTransactionId);
        }
      }

      // Trigger Background Sync
      const { syncService } = await import("~/lib/syncService");
      syncService.triggerSync();

      return resultTransactionId;
    } catch (err: any) {
      console.error("CRITICAL CHECKOUT ERROR:", err);
      toast.error(`Kegagalan Checkout: ${err?.message || "Kesalahan Database"}`);
      return null;
    } finally {
      setProcessing(false);
    }
  }

  return { submitTransaction, processing, setProcessing };
}
