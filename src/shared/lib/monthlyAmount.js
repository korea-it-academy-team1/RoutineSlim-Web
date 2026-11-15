export function monthlyAmount(subscription) {
  if (Number.isFinite(subscription.monthlyAmount)) return subscription.monthlyAmount;
  const amount = Number(subscription.amount) || 0;
  const interval = Number(subscription.cycleInterval ?? 1);
  if (!Number.isSafeInteger(interval) || interval < 1) return 0;
  return Math.round(
    (subscription.cycle === "yearly"
      ? amount / 12
      : subscription.cycle === "weekly"
        ? (amount * 52) / 12
        : amount) / interval,
  );
}
