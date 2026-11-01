import { apiRequest, getTodayDate } from "../../global/api/apiClient";

export function getExpenseSummary() {
  return apiRequest("/api/v1/expenses/summary");
}

export function getCurrentMonthlyReport() {
  return apiRequest("/api/v1/reports/monthly?month=" + getTodayDate().slice(0, 7));
}

export function getMonthlyReport(month) {
  return apiRequest("/api/v1/reports/monthly?month=" + month);
}

export function getMonthlyReportPath(month) {
  return "/api/v1/reports/monthly?month=" + month;
}
