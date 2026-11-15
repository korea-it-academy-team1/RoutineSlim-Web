import { monthlyAmount } from "../../subscriptions/utils/subscriptionCalculations";

export function calculateScenario(subscriptions, selectedIds, months) {
  if (![3, 6, 12].includes(months)) throw new Error("기간은 3·6·12개월 중 선택해주세요.");
  const active = subscriptions.filter((s) => ["active", "review"].includes(s.status));
  const selected = new Set(selectedIds);
  const chosen = active.filter((s) => selected.has(s.id));
  const current = active.reduce((sum, s) => sum + monthlyAmount(s), 0);
  const monthlySavings = chosen.reduce((sum, s) => sum + monthlyAmount(s), 0);
  return {
    chosen,
    current,
    monthlySavings,
    remaining: Math.max(0, current - monthlySavings),
    cumulativeSavings: monthlySavings * months,
    percent: current > 0 ? Math.round((monthlySavings / current) * 100) : 0,
    timeline: Array.from({ length: months }, (_, index) => ({
      month: index + 1,
      saved: monthlySavings * (index + 1),
    })),
  };
}
