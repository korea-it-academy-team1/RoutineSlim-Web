import { monthlyAmount } from "../../../shared/lib/monthlyAmount";
export { monthlyAmount };
export function savingsAnalysis(subscriptions) {
  subscriptions = subscriptions.filter((s) => ["active", "review"].includes(s.status));
  const key = (s) => (s.category === "영상" ? "OTT/영상" : s.category);
  const categories = new Map();
  for (const s of subscriptions) categories.set(key(s), (categories.get(key(s)) || 0) + 1);
  const total = subscriptions.reduce((sum, s) => sum + monthlyAmount(s), 0),
    review = subscriptions.filter((s) => s.status === "review"),
    saved = review.reduce((sum, s) => sum + monthlyAmount(s), 0);
  return {
    total,
    saved,
    remaining: Math.max(0, total - saved),
    reviewCount: review.length,
    duplicateIds: new Set(
      subscriptions.filter((s) => (categories.get(key(s)) || 0) > 1).map((s) => s.id),
    ),
    categories: [...categories.keys()].map((category) => ({
      category,
      amount: subscriptions
        .filter((s) => key(s) === category)
        .reduce((sum, s) => sum + monthlyAmount(s), 0),
    })),
  };
}
