import { isBillableStatus } from "../../lib/subscriptionRules";
import { request } from "./serverConnection";
import { getSubscriptionsWithUsage } from "./subscriptionQueries";
import { getTodayDate } from "../../lib/format";
import { monthlyAmount } from "../../lib/monthlyAmount";
import { projectedEvents, shiftMonth } from "../../lib/billingCalendar";
export async function getDueNotifications() {
  const [rows, profile] = await Promise.all([
    getSubscriptionsWithUsage(),
    request("/users/getMyInfo"),
  ]);
  const today = getTodayDate(),
    month = today.slice(0, 7);
  const events = [month, shiftMonth(month, 1)].flatMap((m) => projectedEvents(rows, m));
  const result = [];
  const daysUntil = (date) => Math.round((Date.parse(date) - Date.parse(today)) / 86400000);
  for (const event of events) {
    const row = rows.find((s) => s.id === event.subscriptionId),
      days = daysUntil(event.date);
    if (
      row.notifyEnabled === false ||
      days < 0 ||
      days > (row.notifyDaysBefore ?? profile.defaultNotificationDays ?? 3)
    )
      continue;
    result.push({
      id: `bill:${row.id}:${event.date}`,
      title: `${row.name} 결제 예정`,
      content: `${event.date} · ${Number(row.amount).toLocaleString("ko-KR")}원 결제 예상`,
      createdAt: today,
      page: "subscription-detail",
      reference: row.id,
    });
  }
  for (const row of rows) {
    if (!row.trialEndDate) continue;
    const days = daysUntil(row.trialEndDate);
    if (
      row.status !== "trial" ||
      row.notifyEnabled === false ||
      days < 0 ||
      days > (row.notifyDaysBefore ?? profile.defaultNotificationDays ?? 3)
    )
      continue;
    result.push({
      id: `trial:${row.id}:${row.trialEndDate}`,
      title: `${row.name} 무료체험 종료 예정`,
      content: `${row.trialEndDate} 종료 예정입니다. 유료 전환 여부를 확인하세요.`,
      createdAt: today,
      page: "trials",
    });
  }
  const total = rows
    .filter((s) => isBillableStatus(s.status))
    .reduce((n, s) => n + monthlyAmount(s), 0);
  if (profile.monthlyBudget != null && total > profile.monthlyBudget)
    result.push({
      id: `budget:${month}:${profile.monthlyBudget}:${total}`,
      title: "월 예상 구독료가 예산을 초과했습니다",
      content: `월 예상 ${total.toLocaleString("ko-KR")}원 / 예산 ${Number(profile.monthlyBudget).toLocaleString("ko-KR")}원`,
      createdAt: today,
      page: "budget",
    });
  return result;
}
