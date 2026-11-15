import { unsupported } from "../unsupportedFeature";
import { requireMemberId } from "../memberSession";
import {
  browserRoute,
  requestBrowserData,
  applyNotificationState,
} from "../../../storage/browserDataStore";
import { getSubscriptionsWithUsage } from "../subscriptionQueries";
import { getDueNotifications } from "../notificationQueries";
export async function browserRoutes({ path, method, body, url, route }) {
  if (route === "/api/v1/browser-data/identity" && method === "GET")
    return { memberId: requireMemberId() };
  if (browserRoute(route))
    return requestBrowserData(requireMemberId(), route, method, body, url.searchParams);
  if (route === "/api/v1/comparison/plans" && method === "GET")
    return (await getSubscriptionsWithUsage()).map((s) => ({
      id: s.id,
      service: s.name,
      plan: "내 등록 구독",
      category: s.category,
      amount: s.amount,
      cycle: s.cycle,
      cycleInterval: s.cycleInterval,
      updatedAt: s.updatedAt,
      features: [`다음 결제일 ${s.nextBillingDate}`, `상태 ${s.status}`],
    }));
  const notification = route.match(/^\/api\/v1\/notifications(?:\/([^/]+))?(?:\/(read))?$/);
  if (notification) {
    const items = await getDueNotifications(),
      member = requireMemberId();
    if (!notification[1] && method === "GET") return applyNotificationState(member, items);
    if (notification[1] === "read-all" && method === "POST")
      return applyNotificationState(member, items, "read-all");
    if (notification[2] === "read" && method === "POST")
      return applyNotificationState(member, items, "read", decodeURIComponent(notification[1]));
    if (!notification[2] && method === "DELETE")
      return applyNotificationState(member, items, "delete", decodeURIComponent(notification[1]));
    return unsupported(path);
  }
}
