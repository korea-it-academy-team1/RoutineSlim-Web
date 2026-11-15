import { isLowUsageLevel } from "../../../lib/subscriptionRules";
import { unsupported } from "../unsupportedFeature";
import { client, request } from "../serverConnection";
import { isUuid } from "../../../lib/identifiers";
import { getTodayDate } from "../../../lib/format";
import { SERVER_SUBSCRIPTION_STATUSES } from "../../serverContracts";
import { mapSubscriptionResponse, buildSubscriptionRequest } from "../subscriptionMapping";
import { getSubscriptionsWithUsage } from "../subscriptionQueries";
import { mapPaymentResponse } from "../paymentQueries";
export async function subscriptionRoutes({ path, options, method, body, route }) {
  const usageCheck = route.match(/^\/api\/v1\/usage\/([^/]+)$/);
  if (usageCheck && method === "PUT") {
    if (!isUuid(usageCheck[1])) throw new Error("올바른 구독 UUID가 아닙니다.");
    if (!["OFTEN", "SOMETIMES", "RARELY", "NEVER"].includes(body?.usageLevel))
      throw new Error("사용 정도를 선택해주세요.");
    return request(`/usage/${usageCheck[1]}`, {
      method: "PUT",
      body: { usageLevel: body.usageLevel },
    });
  }
  const trialMatch = route.match(/^\/api\/v1\/trials(?:\/([^/]+))?$/);
  if (trialMatch) {
    const id = trialMatch[1];
    if (method === "GET" && !id)
      return (await getSubscriptionsWithUsage())
        .filter((s) => s.trialEndDate && ["trial", "canceled"].includes(s.status))
        .map((s) => ({
          ...s,
          endDate: s.trialEndDate,
          notifyDays: s.notifyDaysBefore ?? 3,
          status: s.status === "trial" ? "ACTIVE" : "CANCELLED",
        }));
    if (method === "DELETE" && id) return client.deleteSubscription(id);
    if (["POST", "PUT"].includes(method)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.endDate || ""))
        throw new Error("체험 종료일을 확인해주세요.");
      const existing = id ? await client.getSubscription(id) : null;
      const payload = {
        ...buildSubscriptionRequest(
          {
            name: body.name,
            category: body.category,
            amount: Number(body.amount),
            cycle: existing?.billingCycle?.toLowerCase() || "monthly",
            day: existing?.billingDay || Number(getTodayDate().slice(8)),
            billingAnchorDate: existing?.startDate || getTodayDate(),
          },
          existing,
        ),
        trialEndDate: body.endDate,
        notifyDaysBefore: Number(body.notifyDays),
      };
      if (
        !Number.isInteger(payload.notifyDaysBefore) ||
        payload.notifyDaysBefore < 0 ||
        payload.notifyDaysBefore > 30
      )
        throw new Error("알림 일수는 0~30일로 입력해주세요.");
      let saved;
      if (!id) {
        if (body.status !== "ACTIVE") throw new Error("새 무료체험은 진행 중 상태로 등록해주세요.");
        saved = await client.createSubscription({ ...payload, status: "TRIAL" });
      } else {
        // Update the trial details before changing its status.
        saved = await client.updateSubscription(id, payload);
        const target = body.status === "CANCELLED" ? "CANCELED" : "TRIAL";
        if (existing.status !== target)
          saved = await client.changeSubscriptionStatus(id, {
            status: target,
            trialEndDate: body.endDate,
          });
      }
      window.dispatchEvent(new Event("routineslim:subscriptions"));
      return {
        ...mapSubscriptionResponse(saved),
        endDate: saved.trialEndDate,
        notifyDays: saved.notifyDaysBefore ?? 3,
        status: saved.status === "TRIAL" ? "ACTIVE" : "CANCELLED",
      };
    }
    return unsupported(path);
  }
  const detail = path.match(/^\/api\/v1\/subscriptions\/([^/]+)\/(detail|note)$/);
  if (detail) {
    const id = detail[1];
    if (detail[2] === "note" && method === "PUT") {
      const raw = await client.getSubscription(id);
      const mapped = mapSubscriptionResponse(raw);
      return client.updateSubscription(id, {
        ...buildSubscriptionRequest(mapped, raw),
        startDate: raw.startDate,
        memo: body.note,
      });
    }
    if (detail[2] !== "detail" || method !== "GET") return unsupported(path);
    const [rows, payments] = await Promise.all([
      getSubscriptionsWithUsage(),
      request(`/payment/subscription/${id}?limit=24`),
    ]);
    const subscription = rows.find((s) => s.id === id);
    if (!subscription) throw new Error("구독을 찾을 수 없습니다.");
    const mapped = payments.map(mapPaymentResponse);
    return {
      subscription,
      note: subscription.memo || "",
      payments: mapped,
      totalPaid: mapped.reduce((n, row) => n + row.amount, 0),
      paymentLimit: 24,
      changes: [],
      changesSupported: false,
    };
  }
  if (path === "/api/v1/subscriptions/scan" && method === "POST") return client.scanReceipt(body);
  if (path === "/api/v1/subscriptions" && method === "POST" && options.receiptDraft)
    return client.createSubscription(body);
  const status = path.match(/^\/api\/v1\/subscriptions\/([^/]+)\/status$/);
  if (status && method === "PATCH") {
    if (!SERVER_SUBSCRIPTION_STATUSES.includes(body.status))
      throw new Error("올바른 구독 상태를 선택해주세요.");
    if (body.status === "TRIAL" && !/^\d{4}-\d{2}-\d{2}$/.test(body.trialEndDate || ""))
      throw new Error("체험 종료일을 입력해주세요.");
    return mapSubscriptionResponse(await client.changeSubscriptionStatus(status[1], body));
  }
  const match = path.match(/^\/api\/v1\/subscriptions(?:\/([^/]+))?$/);
  if (match) {
    const id = match[1];
    if (id && !isUuid(id)) throw new Error("올바른 구독 UUID가 아닙니다.");
    if (method === "GET") {
      const rows = await getSubscriptionsWithUsage();
      if (!id) return rows;
      const found = rows.find((s) => s.id === id);
      if (!found) throw new Error("구독을 찾을 수 없습니다.");
      return found;
    }
    if (method === "POST" && !id) {
      const created = await client.createSubscription({
        ...buildSubscriptionRequest(body),
        status: "ACTIVE",
      });
      if (body.status === "review") {
        try {
          const usage = await request(`/usage/${created.id}`, {
            method: "PUT",
            body: { usageLevel: "RARELY" },
          });
          return mapSubscriptionResponse(created, usage);
        } catch {
          throw new Error(
            "구독은 저장됐지만 사용량 표시를 저장하지 못했습니다. 목록을 새로고침한 뒤 다시 표시해주세요.",
          );
        }
      }
      return mapSubscriptionResponse(created);
    }
    if (method === "PUT" && id) {
      const existing = await client.getSubscription(id);
      // A review toggle changes usage only; it must not resubmit stale amounts or dates.
      if (options.reviewOnly) {
        const usage = await request(`/usage/${id}`, {
          method: "PUT",
          body: { usageLevel: body.status === "review" ? "RARELY" : "OFTEN" },
        });
        return mapSubscriptionResponse(existing, usage);
      }
      const updated = await client.updateSubscription(id, buildSubscriptionRequest(body, existing));
      const checks = await request("/usage");
      const previous = checks.find((x) => x.subscriptionId === id);
      const wasReview = isLowUsageLevel(previous?.usageLevel);
      let usage = previous;
      if ((body.status === "review") !== wasReview) {
        try {
          usage = await request(`/usage/${id}`, {
            method: "PUT",
            body: { usageLevel: body.status === "review" ? "RARELY" : "OFTEN" },
          });
        } catch {
          throw new Error(
            "구독 정보는 저장됐지만 사용량 표시를 저장하지 못했습니다. 목록을 새로고침해주세요.",
          );
        }
      }
      return mapSubscriptionResponse(updated, usage);
    }
    if (method === "DELETE" && id) return client.deleteSubscription(id);
  }
}
