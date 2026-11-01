import { apiRequest } from "../../global/api/apiClient";

export function getSubscriptions() {
  return apiRequest("/api/v1/subscriptions");
}

export function toggleSubscriptionReview(s) {
  return apiRequest("/api/v1/subscriptions/" + s.id, {
    method: "PUT",
    body: { ...s, status: s.status === "review" ? "active" : "review" },
  });
}

export function saveTrial(form) {
  return apiRequest("/api/v1/trials" + (form.id ? "/" + form.id : ""), {
    method: form.id ? "PUT" : "POST",
    body: {
      name: form.name,
      category: form.category,
      endDate: form.endDate,
      amount: Number(form.amount),
      notifyDays: Number(form.notifyDays),
      status: form.status,
    },
  });
}

export function updateTrial(item) {
  return apiRequest("/api/v1/trials/" + item.id, {
    method: "PUT",
    body: {
      ...item,
      status: item.status === "ACTIVE" ? "CANCELLED" : "ACTIVE",
    },
  });
}

export function deleteTrial(item) {
  return apiRequest("/api/v1/trials/" + item.id, { method: "DELETE" });
}

export function getTrialsPath() {
  return "/api/v1/trials";
}

export function getComparisonSelection() {
  return apiRequest("/api/v1/comparison/selection");
}

export function saveComparisonSelection(selected, plans) {
  return apiRequest("/api/v1/comparison/selection", {
    method: "PUT",
    body: { ids: selected.filter((id) => plans.some((x) => x.id === id)) },
  });
}

export function getComparisonPlansPath() {
  return "/api/v1/comparison/plans";
}

export function saveSubscriptionNote(id, note) {
  return apiRequest(`/api/v1/subscriptions/${id}/note`, {
    method: "PUT",
    body: { note },
  });
}

export function getDetailPath(id) {
  return id ? `/api/v1/subscriptions/${id}/detail` : null;
}

export function deleteSubscription(id) {
  return apiRequest("/api/v1/subscriptions/" + id, { method: "DELETE" });
}

export function getServiceCatalog() {
  return apiRequest("/api/v1/catalog");
}

export function saveSubscription(subscription, form) {
  return apiRequest("/api/v1/subscriptions" + (subscription ? "/" + subscription.id : ""), {
    method: subscription ? "PUT" : "POST",
    body: {
      name: form.name.trim(),
      category: form.category,
      amount: Number(form.amount),
      cycle: form.cycle,
      day: Number(form.day),
      status: form.status,
      billingAnchorDate: form.billingAnchorDate,
    },
  });
}
