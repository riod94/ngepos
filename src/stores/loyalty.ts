import { db, type Customer, type LoyaltyProgram, type CustomerReward } from "~/db/db";

/**
 * Generate a random customer ID
 */
export function generateCustomerId(): string {
  return `cust_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Format customer ID to QR Code string
 */
export function formatQrCode(customerId: string): string {
  return `NGEPOS-MBR-${customerId}`;
}

/**
 * Extract customer ID from QR Code string
 */
export function parseQrCode(qrString: string): string | null {
  if (!qrString.startsWith("NGEPOS-MBR-")) return null;
  return qrString.replace("NGEPOS-MBR-", "");
}

/**
 * Get the currently active loyalty program
 */
export async function getActiveProgram(): Promise<LoyaltyProgram | null> {
  const programs = await db.loyaltyPrograms.where("isActive").equals(1).toArray();
  return programs[0] || null;
}

/**
 * Check if a transaction qualifies for a stamp
 */
export function isStampEligible(
  transactionTotal: number,
  discountApplied: boolean,
  cartProductIds: string[],
  program: LoyaltyProgram
): boolean {
  // 1. Minimum transaction check
  if (transactionTotal < program.minTransaction) return false;

  // 2. Promo allowance check
  if (discountApplied && !program.allowWithPromo) return false;

  // 3. Excluded products check
  const hasValidProduct = cartProductIds.some(id => !program.excludedProductIds.includes(id));
  if (!hasValidProduct) return false;

  return true;
}

export interface CustomerProgress {
  currentStamps: number;
  targetStamps: number;
  isEligibleForReward: boolean;
  oldestStampDate: number | null;
  expiresAt: number | null;
}

/**
 * Get customer's progress for the active program
 */
export async function getCustomerProgress(
  customerId: string,
  programId: string
): Promise<CustomerProgress> {
  const program = await db.loyaltyPrograms.get(programId);
  if (!program) throw new Error("Program not found");

  const now = Date.now();
  const expiryThreshold = now - (program.expiryMonths * 30 * 24 * 60 * 60 * 1000);

  // Get valid (unexpired) stamps
  const validStamps = await db.customerStamps
    .where("customerId").equals(customerId)
    .filter(s => s.programId === programId && s.stampedAt > expiryThreshold)
    .toArray();

  const currentStamps = validStamps.length;
  const sortedStamps = validStamps.sort((a, b) => a.stampedAt - b.stampedAt);
  const oldestStamp = sortedStamps[0];

  return {
    currentStamps,
    targetStamps: program.targetStamps,
    isEligibleForReward: currentStamps >= program.targetStamps,
    oldestStampDate: oldestStamp?.stampedAt ?? null,
    expiresAt: oldestStamp
      ? oldestStamp.stampedAt + (program.expiryMonths * 30 * 24 * 60 * 60 * 1000)
      : null,
  };
}

/**
 * Record a new stamp for a customer
 */
export async function addStamp(
  customerId: string,
  programId: string,
  transactionId: string
): Promise<void> {
  await db.customerStamps.add({
    id: `stamp_${Math.random().toString(36).substring(2, 11)}`,
    customerId,
    programId,
    transactionId,
    stampedAt: Date.now(),
  });
}

/**
 * Check if customer should get a reward and create it if yes
 */
export async function checkAndCreateReward(
  customerId: string,
  programId: string
): Promise<CustomerReward | null> {
  const program = await db.loyaltyPrograms.get(programId);
  if (!program) return null;

  const progress = await getCustomerProgress(customerId, programId);
  if (progress.isEligibleForReward) {
    const reward: CustomerReward = {
      id: `reward_${Math.random().toString(36).substring(2, 11)}`,
      customerId,
      programId,
      status: 'AVAILABLE',
      availableAt: Date.now(),
      expiresAt: Date.now() + (program.rewardClaimDays * 24 * 60 * 60 * 1000),
    };
    await db.customerRewards.add(reward);
    return reward;
  }
  return null;
}

/**
 * Mark a reward as claimed
 */
export async function claimReward(
  rewardId: string, 
  transactionId: string
): Promise<void> {
  const reward = await db.customerRewards.get(rewardId);
  if (!reward) return;

  await db.customerRewards.update(rewardId, {
    status: 'CLAIMED',
    claimedAt: Date.now(),
    claimedTransactionId: transactionId
  });

  const program = await db.loyaltyPrograms.get(reward.programId);
  if (program?.afterClaim === 'RESET') {
    await resetStamps(reward.customerId, reward.programId);
  }
}

/**
 * Reset all unexpired stamps for a customer/program (after claim)
 */
export async function resetStamps(customerId: string, programId: string): Promise<void> {
  const stamps = await db.customerStamps
    .where("customerId").equals(customerId)
    .filter(s => s.programId === programId)
    .toArray();
  
  const ids = stamps.map(s => s.id);
  await db.customerStamps.bulkDelete(ids);
}
