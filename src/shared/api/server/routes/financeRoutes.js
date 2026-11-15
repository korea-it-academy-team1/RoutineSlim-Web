import { getExpenseSummary } from "../spendingSummary";
import { getSubscriptionsWithUsage } from "../subscriptionQueries";
import { monthlyAmount } from "../../../lib/monthlyAmount";
import { getMonthlyReport, getMonthlyPayments, mapPaymentResponse } from "../paymentQueries";
import { projectedEvents, shiftMonth } from "../../../lib/billingCalendar";
import { getTodayDate } from "../../../lib/format";
export async function financeRoutes({ method, url, route }) {
  if (route === "/api/v1/expenses/summary" && method === "GET") return getExpenseSummary();
  if (route === "/api/v1/savings/summary" && method === "GET") {
    const rows = await getSubscriptionsWithUsage();
    if (rows.some((s) => !s.usageAvailable))
      throw new Error("사용량 정보를 불러오지 못해 절약 검토 금액을 계산할 수 없습니다.");
    const monthlyReviewSavings = rows
      .filter((s) => s.status === "review")
      .reduce((n, s) => n + monthlyAmount(s), 0);
    return { monthlyReviewSavings, annualPotentialSavings: monthlyReviewSavings * 12 };
  }
  if (route === "/api/v1/reports/monthly" && method === "GET")
    return getMonthlyReport(url.searchParams.get("month"));
  if (route === "/api/v1/payments" && method === "GET")
    return (await getMonthlyPayments(url.searchParams.get("month"))).payments.map(
      mapPaymentResponse,
    );
  if (route === "/api/v1/payments/summary" && method === "GET") {
    const result = await getMonthlyPayments(url.searchParams.get("month"));
    return { actualPaid: result.totalAmount, total: result.totalAmount, count: result.count };
  }
  if (route === "/api/v1/calendar/events" && method === "GET") {
    const year = Number(url.searchParams.get("year")),
      month = Number(url.searchParams.get("month"));
    if (
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2200 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    )
      throw new Error("조회 연월을 확인해주세요.");
    return projectedEvents(
      await getSubscriptionsWithUsage(),
      `${year}-${String(month).padStart(2, "0")}`,
    );
  }
  if (route === "/api/v1/reminders" && method === "GET") {
    const rows = await getSubscriptionsWithUsage(),
      today = getTodayDate(),
      month = today.slice(0, 7);
    return [month, shiftMonth(month, 1)]
      .flatMap((m) => projectedEvents(rows, m))
      .map((event) => ({
        ...event,
        daysUntil: Math.round((Date.parse(event.date) - Date.parse(today)) / 86400000),
      }))
      .filter((event) => event.daysUntil >= 0 && event.daysUntil <= 31);
  }
}
