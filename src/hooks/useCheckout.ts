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
import { useAuth } from "~/stores/auth";

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

  /**
   * Calculate the discount amount for a loyalty reward based on the program's reward type.
   * - FREE_PRODUCT: discount equals the reward product's full price
   * - PERCENT_DISCOUNT: discount equals rewardValue% of the cart subtotal
   * - FIXED_DISCOUNT: discount equals the fixed rewardValue amount
   */
  const getLoyaltyRewardAmount = (rwProd: any, subtotal: number, program: any) => {
    if (!appliedRewardId() || !program) return 0;

    switch (program.rewardType) {
      case 'FREE_PRODUCT':
        return rwProd?.price ?? 0;
      case 'PERCENT_DISCOUNT':
        return Math.round((subtotal * (program.rewardValue || 0) / 100) * 100) / 100;
      case 'FIXED_DISCOUNT':
        return program.rewardValue || 0;
      default:
        return rwProd?.price ?? 0;
    }
  };

  async function submitTransaction(opts: CheckoutOptions): Promise<string | null> {
    if (processing()) return null;
    
    const { method, finalAmount, transactionTimestamp: ts, isBackdated, rewardProduct: rwProd, finalTotalAmountFunc } = opts;

    const rawCart = unwrap(cart);
    const cartSnapshot = structuredClone(rawCart);
    const originalTotal = getCartSubtotal();
    const discountInfo = calculateDiscounts();
    const activeLoyaltyProgram = await getActiveProgram();

    if (!cartSnapshot || cartSnapshot.length === 0) {
      toast.error("Gagal: Keranjang belanja kosong.");
      return null;
    }
    
    setProcessing(true);
    let resultTransactionId: string | null = null;

    try {
      resultTransactionId = await db.transaction(
        "rw",
        ["transactions", "transactionItems", "products", "rawMaterialLibrary", "inventoryLogs"],
        async () => {
          let cogsTotal = 0;
          const transactionId = crypto.randomUUID();

          const itemsToSave = [];
          for (const [idx, item] of cartSnapshot.entries()) {
            const product = await db.products.get(item.id);
            let unitCogs = product?.cogs ?? item.price * 0.45;

            // 1. Process Recipe (Raw Materials) & Calculate dynamic unitCogs
            if (product?.rawMaterials && product.rawMaterials.length > 0) {
              let recipeCogs = 0;
              for (const recipeItem of product.rawMaterials) {
                const libraryMaterial = await db.rawMaterialLibrary.get(recipeItem.id);
                if (libraryMaterial) {
                  // Reduce stock
                  const consumedQty = recipeItem.quantity * item.quantity;
                  const newStock = Math.max(0, libraryMaterial.stock - consumedQty);
                  await db.rawMaterialLibrary.update(libraryMaterial.id, { stock: newStock });
                  
                  // Log Inventory
                  await db.inventoryLogs.add({
                    id: crypto.randomUUID(),
                    materialId: libraryMaterial.id,
                    type: "OUT",
                    quantity: consumedQty,
                    unitCost: libraryMaterial.costPerUnit,
                    notes: `Used for ${item.name} (${transactionId})`,
                    timestamp: ts,
                  });

                  recipeCogs += libraryMaterial.costPerUnit * recipeItem.quantity;
                } else {
                  recipeCogs += recipeItem.cost; // Fallback
                }
              }
              unitCogs = recipeCogs;
              // Sync the product's base HPP to the new calculated one
              await db.products.update(item.id, { cogs: unitCogs });
            }

            // 2. Add Variant Modifiers
            if (item.selectedVariants) {
              for (const sv of item.selectedVariants) {
                const group = product?.variants?.find((g: any) => g.name === sv.groupName);
                const option = group?.options.find((o: any) => o.name === sv.optionName);
                unitCogs += option?.cogsModifier ?? 0;
              }
            }

            cogsTotal += unitCogs * item.quantity;

            itemsToSave.push({
              id: crypto.randomUUID(),
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
              id: crypto.randomUUID(),
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
          const discountTotalVal = discountInfo.total + getLoyaltyRewardAmount(rwProd, originalTotal, activeLoyaltyProgram);
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
            discountNote: discountNoteVal,
            customerId: linkedCustomerId() || undefined,
            cashierName: useAuth().currentUser()?.name ?? "Admin",
          } as any);

          await db.transactionItems.bulkAdd(itemsToSave);
          
          return transactionId;
        }
      );

      // Post-checkout: Update Loyalty (outside transaction for side effects)
      // Wrapped separately so loyalty errors don't fail the entire checkout
      if (resultTransactionId && linkedCustomerId()) {
        try {
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
        } catch (loyaltyErr: any) {
          // Loyalty errors are non-critical — log but don't fail checkout
          console.warn("[Checkout] Loyalty post-processing error (non-critical):", loyaltyErr);
          toast.error("Stamp/Reward gagal diproses, tapi transaksi tersimpan.");
        }
      }

      // Trigger Background Sync
      try {
        const { syncService } = await import("~/lib/syncService");
        syncService.triggerSync();
      } catch (syncErr: any) {
        console.warn("[Checkout] Sync trigger error (non-critical):", syncErr);
        // Sync will be retried automatically — no user-facing error needed
      }

      return resultTransactionId;
    } catch (err: any) {
      // Categorize errors for better user feedback
      const errMsg = err?.message || "";
      
      if (errMsg.includes("Item tidak terdeteksi")) {
        console.error("[Checkout] No items detected after processing");
        toast.error("Tidak ada item yang terdeteksi. Coba lagi.");
      } else if (err?.name === "ConstraintError" || errMsg.includes("constraint")) {
        console.error("[Checkout] Database constraint error:", err);
        toast.error("Konflik data. Transaksi mungkin sudah ada.");
      } else if (err?.name === "QuotaExceededError" || errMsg.includes("quota")) {
        console.error("[Checkout] Storage quota exceeded:", err);
        toast.error("Penyimpanan penuh. Hapus data lama atau hubungi admin.");
      } else if (err?.name === "TransactionInactiveError" || errMsg.includes("transaction")) {
        console.error("[Checkout] Database transaction error:", err);
        toast.error("Kesalahan transaksi database. Coba lagi.");
      } else if (!navigator.onLine) {
        console.error("[Checkout] Offline during checkout");
        toast.error("Koneksi terputus. Transaksi disimpan lokal.");
      } else {
        console.error("CRITICAL CHECKOUT ERROR:", err);
        toast.error(`Kegagalan Checkout: ${errMsg || "Kesalahan Database"}`);
      }
      return null;
    } finally {
      setProcessing(false);
    }
  }

  return { submitTransaction, processing, setProcessing };
}
