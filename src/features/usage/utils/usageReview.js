import { isBillableStatus, isLowUsageLevel } from "../../../shared/lib/subscriptionRules";
export function isRecentUsageCheck(item, today) {
  const days = (Date.parse(today) - Date.parse(item.usageCheckedOn)) / 86400000;
  return Boolean(item.usageLevel) && Number.isFinite(days) && days >= 0 && days < 30;
}
export function isUsageReviewCandidate(item, today) {
  return (
    isLowUsageLevel(item.usageLevel) &&
    isBillableStatus(item.status) &&
    isRecentUsageCheck(item, today)
  );
}
