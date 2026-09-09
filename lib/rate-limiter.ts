interface RateLimitData {
  count: number;
  lastReset: string; // YYYY-MM-DD
}

const limits = new Map<string, RateLimitData>();

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function checkLimit(userId: string, isPremium: boolean = false): { allowed: boolean; remaining: number } {
  const maxLimit = isPremium ? 200 : 200; // 200 in dev as requested (50 standard / 200 premium)
  const today = getTodayString();

  let userLimit = limits.get(userId);

  if (!userLimit || userLimit.lastReset !== today) {
    userLimit = { count: 0, lastReset: today };
    limits.set(userId, userLimit);
  }

  if (userLimit.count >= maxLimit) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  userLimit.count += 1;
  limits.set(userId, userLimit);

  return {
    allowed: true,
    remaining: Math.max(0, maxLimit - userLimit.count),
  };
}

export function getRemainingLimit(userId: string, isPremium: boolean = false): number {
  const maxLimit = isPremium ? 200 : 200;
  const today = getTodayString();
  const userLimit = limits.get(userId);

  if (!userLimit || userLimit.lastReset !== today) {
    return maxLimit;
  }

  return Math.max(0, maxLimit - userLimit.count);
}
