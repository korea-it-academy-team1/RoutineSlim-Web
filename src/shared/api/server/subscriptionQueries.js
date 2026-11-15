import { client, request } from "./serverConnection";
import { mapSubscriptionResponse } from "./subscriptionMapping";
export async function getSubscriptionsWithUsage() {
  // Usage is supplementary: a failed usage request must not hide valid subscriptions.
  const [subscriptions, usage] = await Promise.allSettled([
    client.listSubscriptions(),
    request("/usage"),
  ]);
  if (subscriptions.status === "rejected") throw subscriptions.reason;
  const checks = usage.status === "fulfilled" ? usage.value : [];
  return subscriptions.value.map((row) => ({
    ...mapSubscriptionResponse(
      row,
      checks.find((x) => x.subscriptionId === row.id),
    ),
    usageAvailable: usage.status === "fulfilled",
  }));
}
