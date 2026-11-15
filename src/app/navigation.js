export const navigation = [
  { key: "dashboard", label: "대시보드", icon: "grid" },
  { key: "subscriptions", label: "구독 · 고정비", icon: "wallet" },
  { key: "savings", label: "맞춤 절감 솔루션", icon: "spark" },
  { key: "payments", label: "지출 리포트", icon: "chart" },
  { key: "calendar", label: "캘린더", icon: "calendar" },
  { key: "community", label: "커뮤니티", icon: "message" },
  { key: "receipt-scan", label: "영수증 OCR", icon: "wallet" },
  { key: "insights", label: "지출 차트", icon: "bars" },
  { key: "budget", label: "월 예산", icon: "coins" },
  { key: "reminder-settings", label: "결제 알림 설정", icon: "bell" },
  { key: "profile", label: "마이페이지", icon: "user" },
  { key: "trials", label: "무료체험 관리", icon: "clock" },
  { key: "monthly", label: "월간 결산", icon: "chart" },
  { key: "comparison", label: "구독 비교", icon: "compare" },
  { key: "goals", label: "절약 목표 · 챌린지", icon: "target" },
  { key: "activity", label: "내 활동", icon: "message" },
  { key: "notifications", label: "알림센터", icon: "bell" },
  { key: "support", label: "고객센터", icon: "help" },
  { key: "about", label: "서비스 소개", icon: "info" },
  { key: "admin", label: "관리자 대시보드", icon: "shield" },
];

export const routeKeys = new Set([
  ...navigation.map((item) => item.key),
  "subscription-detail",
  "login",
]);

export function currentRoute() {
  try {
    const [key, id] = window.location.hash.replace(/^#/, "").split("/");
    return { key: routeKeys.has(key) ? key : "dashboard", id: id ? decodeURIComponent(id) : null };
  } catch {
    return { key: "dashboard", id: null };
  }
}
