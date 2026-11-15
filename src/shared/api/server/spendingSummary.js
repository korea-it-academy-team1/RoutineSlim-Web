import { isBillableStatus } from "../../lib/subscriptionRules";
import { getSubscriptionsWithUsage } from "./subscriptionQueries";
import { monthlyAmount } from "../../lib/monthlyAmount";
export async function getExpenseSummary() {
  const rows = (await getSubscriptionsWithUsage()).filter((s) => isBillableStatus(s.status));
  const byCategory = {};
  for (const row of rows)
    byCategory[row.category] = (byCategory[row.category] || 0) + monthlyAmount(row);
  const monthlyTotal = rows.reduce((sum, row) => sum + monthlyAmount(row), 0);
  return {
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
    subscriptionCount: rows.length,
    byCategory,
  };
}
