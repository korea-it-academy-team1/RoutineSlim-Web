import { request } from "./serverConnection";
import { categoryName } from "./subscriptionCategories";
import { shiftMonth } from "../../lib/billingCalendar";
export function mapPaymentResponse(row) {
  return {
    ...row,
    id: `${row.subscriptionId}:${row.billedOn}`,
    description: row.subscriptionName,
    paidOn: row.billedOn,
    category: categoryName(row.categoryId),
  };
}
export async function getMonthlyPayments(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ""))
    throw new Error("조회 월을 YYYY-MM 형식으로 선택해주세요.");
  return request(`/payment/monthly?yearMonth=${encodeURIComponent(month)}`);
}
export async function getMonthlyReport(month) {
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const values = await Promise.all(months.map(getMonthlyPayments));
  const current = values[5],
    previous = values[4];
  const categories = new Map();
  for (const row of current.payments) {
    const name = categoryName(row.categoryId);
    categories.set(name, (categories.get(name) || 0) + row.amount);
  }
  return {
    total: current.totalAmount,
    paymentCount: current.count,
    previousTotal: previous.totalAmount,
    hasPrevious: previous.count > 0,
    difference: current.totalAmount - previous.totalAmount,
    history: values.map((x, i) => ({ month: months[i], amount: x.totalAmount })),
    categories: [...categories].map(([category, amount]) => ({ category, amount })),
  };
}
