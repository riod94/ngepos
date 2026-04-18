import { describe, it, expect } from "vitest";

interface LoyaltyProgram {
  id: string;
  name: string;
  minTransaction: number;
  allowWithPromo: boolean;
  excludedProductIds: string[];
  targetStamps: number;
  expiryMonths: number;
  rewardClaimDays: number;
  afterClaim: "RESET" | "KEEP";
}

interface CustomerStamp {
  id: string;
  customerId: string;
  programId: string;
  stampedAt: number;
}

function isStampEligible(
  transactionTotal: number,
  discountApplied: boolean,
  cartProductIds: string[],
  program: LoyaltyProgram
): boolean {
  if (transactionTotal < program.minTransaction) return false;

  if (discountApplied && !program.allowWithPromo) return false;

  const hasValidProduct = cartProductIds.some(id => !program.excludedProductIds.includes(id));
  if (!hasValidProduct) return false;

  return true;
}

function getCustomerProgress(
  customerId: string,
  programId: string,
  stamps: CustomerStamp[],
  program: LoyaltyProgram
) {
  const now = Date.now();
  const expiryThreshold = now - (program.expiryMonths * 30 * 24 * 60 * 60 * 1000);

  const validStamps = stamps.filter(
    s => s.programId === programId && s.stampedAt > expiryThreshold
  );

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

describe("Loyalty Store - isStampEligible", () => {
  const defaultProgram: LoyaltyProgram = {
    id: "prog_1",
    name: "Coffee Loyalty",
    minTransaction: 15000,
    allowWithPromo: false,
    excludedProductIds: [],
    targetStamps: 10,
    expiryMonths: 3,
    rewardClaimDays: 30,
    afterClaim: "RESET"
  };

  it("should return true when transaction meets minimum", () => {
    const result = isStampEligible(
      20000,
      false,
      ["p1"],
      defaultProgram
    );
    expect(result).toBe(true);
  });

  it("should return false when transaction below minimum", () => {
    const result = isStampEligible(
      10000,
      false,
      ["p1"],
      defaultProgram
    );
    expect(result).toBe(false);
  });

  it("should return false when discount applied and promo not allowed", () => {
    const result = isStampEligible(
      20000,
      true,
      ["p1"],
      { ...defaultProgram, allowWithPromo: false }
    );
    expect(result).toBe(false);
  });

  it("should return true when discount applied and promo allowed", () => {
    const result = isStampEligible(
      20000,
      true,
      ["p1"],
      { ...defaultProgram, allowWithPromo: true }
    );
    expect(result).toBe(true);
  });

  it("should return false when all products are excluded", () => {
    const result = isStampEligible(
      20000,
      false,
      ["p1"],
      { ...defaultProgram, excludedProductIds: ["p1"] }
    );
    expect(result).toBe(false);
  });

  it("should return true when at least one product is not excluded", () => {
    const result = isStampEligible(
      20000,
      false,
      ["p1", "p2"],
      { ...defaultProgram, excludedProductIds: ["p1"] }
    );
    expect(result).toBe(true);
  });
});

describe("Loyalty Store - getCustomerProgress", () => {
  const defaultProgram: LoyaltyProgram = {
    id: "prog_1",
    name: "Coffee Loyalty",
    minTransaction: 15000,
    allowWithPromo: false,
    excludedProductIds: [],
    targetStamps: 5,
    expiryMonths: 3,
    rewardClaimDays: 30,
    afterClaim: "RESET"
  };

  it("should count valid stamps within expiry window", () => {
    const now = Date.now();
    const stamps: CustomerStamp[] = [
      { id: "s1", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 },
      { id: "s2", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 2 },
      { id: "s3", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 3 },
    ];

    const progress = getCustomerProgress("c1", "prog_1", stamps, defaultProgram);

    expect(progress.currentStamps).toBe(3);
    expect(progress.targetStamps).toBe(5);
    expect(progress.isEligibleForReward).toBe(false);
  });

  it("should not count expired stamps", () => {
    const now = Date.now();
    const fourMonthsAgo = now - (120 * 24 * 60 * 60 * 1000);
    const stamps: CustomerStamp[] = [
      { id: "s1", customerId: "c1", programId: "prog_1", stampedAt: fourMonthsAgo },
    ];

    const progress = getCustomerProgress("c1", "prog_1", stamps, defaultProgram);

    expect(progress.currentStamps).toBe(0);
    expect(progress.isEligibleForReward).toBe(false);
  });

  it("should mark eligible when stamps reach target", () => {
    const now = Date.now();
    const stamps: CustomerStamp[] = [
      { id: "s1", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 },
      { id: "s2", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 2 },
      { id: "s3", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 3 },
      { id: "s4", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 4 },
      { id: "s5", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 5 },
    ];

    const progress = getCustomerProgress("c1", "prog_1", stamps, defaultProgram);

    expect(progress.currentStamps).toBe(5);
    expect(progress.isEligibleForReward).toBe(true);
  });

  it("should return oldest stamp date", () => {
    const now = Date.now();
    const stamps: CustomerStamp[] = [
      { id: "s1", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 * 5 },
      { id: "s2", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 },
    ];

    const progress = getCustomerProgress("c1", "prog_1", stamps, defaultProgram);

    expect(progress.oldestStampDate).toBe(now - 86400000 * 5);
  });

  it("should return null oldestStampDate when no valid stamps", () => {
    const now = Date.now();
    const fourMonthsAgo = now - (120 * 24 * 60 * 60 * 1000);
    const stamps: CustomerStamp[] = [
      { id: "s1", customerId: "c1", programId: "prog_1", stampedAt: fourMonthsAgo },
    ];

    const progress = getCustomerProgress("c1", "prog_1", stamps, defaultProgram);

    expect(progress.oldestStampDate).toBeNull();
    expect(progress.expiresAt).toBeNull();
  });

  it("should calculate expiry date from oldest stamp", () => {
    const now = Date.now();
    const stamps: CustomerStamp[] = [
      { id: "s1", customerId: "c1", programId: "prog_1", stampedAt: now - 86400000 },
    ];

    const progress = getCustomerProgress("c1", "prog_1", stamps, defaultProgram);

    const expectedExpiry = now - 86400000 + (3 * 30 * 24 * 60 * 60 * 1000);
    expect(progress.expiresAt).toBe(expectedExpiry);
  });
});
