import { apiRequest, getTodayDate } from "../../global/api/apiClient";

export function getCalendarEvents(year, m) {
  return apiRequest(`/api/v1/calendar/events?year=${year}&month=${Number(m)}`);
}

export function getPayments(month) {
  return apiRequest("/api/v1/payments?month=" + encodeURIComponent(month));
}

export function savePayment(editing, subscriptionId, description, amount, paidOn) {
  return apiRequest("/api/v1/payments" + (editing ? "/" + editing : ""), {
    method: editing ? "PUT" : "POST",
    body: { subscriptionId, description, amount: Number(amount), paidOn },
  });
}

export function deletePayment(id) {
  return apiRequest("/api/v1/payments/" + id, { method: "DELETE" });
}

export function getCurrentPaymentSummary() {
  return apiRequest("/api/v1/payments/summary?month=" + getTodayDate().slice(0, 7));
}
