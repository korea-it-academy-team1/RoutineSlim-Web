import { isLowUsageLevel } from "../../lib/subscriptionRules";
import { categoryName, categoryId as resolveCategoryId } from "./subscriptionCategories";
export function mapSubscriptionResponse(row, usage = null) {
  return {
    ...row,
    category: categoryName(row.categoryId),
    cycle: row.billingCycle?.toLowerCase(),
    day: row.billingDay,
    billingAnchorDate: row.startDate,
    usageLevel: usage?.usageLevel ?? null,
    usageCheckedOn: usage?.checkedOn ?? null,
    status:
      row.status === "ACTIVE" && isLowUsageLevel(usage?.usageLevel)
        ? "review"
        : row.status.toLowerCase(),
  };
}
export function buildSubscriptionRequest(body, existing) {
  const categoryId = Number(
    resolveCategoryId(body.category) ??
      (existing && body.category === existing.category ? existing.categoryId : NaN),
  );
  if (!Number.isSafeInteger(categoryId) || categoryId < 1)
    throw new Error("선택한 카테고리의 실제 서버 ID를 VITE_SERVER_CATEGORY_IDS에 설정해주세요.");
  const billingCycle = { monthly: "MONTHLY", yearly: "YEARLY", weekly: "WEEKLY" }[body.cycle];
  if (!billingCycle) throw new Error("지원하지 않는 결제 주기입니다.");
  let startDate = body.billingAnchorDate;
  if (billingCycle === "MONTHLY" && /^\d{4}-\d{2}-\d{2}$/.test(startDate || "")) {
    const [y, m] = startDate.split("-").map(Number);
    const day = Math.min(Number(body.day), new Date(y, m, 0).getDate());
    startDate = `${startDate.slice(0, 7)}-${String(day).padStart(2, "0")}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate || ""))
    throw new Error("올바른 기준일을 선택해주세요.");
  const name = String(body.name || "").trim();
  if (!name || name.length > 100) throw new Error("서비스 이름은 1~100자로 입력해주세요.");
  if (!Number.isSafeInteger(body.amount) || body.amount < 0 || body.amount > 2147483647)
    throw new Error("결제 금액은 0~2,147,483,647원의 정수로 입력해주세요.");
  return {
    name,
    categoryId,
    amount: body.amount,
    billingCycle,
    startDate,
    presetId: existing?.presetId ?? null,
    cardId: existing?.cardId ?? null,
    currency: existing?.currency ?? "KRW",
    cycleInterval: existing?.cycleInterval ?? 1,
    trialEndDate: existing?.trialEndDate ?? null,
    notifyEnabled: existing?.notifyEnabled ?? true,
    notifyDaysBefore: existing?.notifyDaysBefore ?? null,
    memo: existing?.memo ?? null,
  };
}
