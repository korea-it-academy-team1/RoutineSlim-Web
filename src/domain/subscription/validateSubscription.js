export function validateSubscription(form) {
  const name = String(form.name || "").trim();
  if (!name || name.length > 100) return "항목 이름은 공백을 제외한 1~100자로 입력해주세요.";
  const amount = Number(form.amount);
  if (
    String(form.amount).trim() === "" ||
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > 2147483647
  )
    return "결제 금액은 0~2,147,483,647원의 정수로 입력해주세요.";
  const day = Number(form.day);
  if (!Number.isInteger(day) || day < 1 || day > 31)
    return "결제일은 1~31 사이의 정수로 입력해주세요.";
  const date = String(form.billingAnchorDate || "");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return "올바른 기준일을 입력해주세요.";
  if (!["monthly", "yearly", "weekly"].includes(form.cycle)) return "결제 주기를 선택해주세요.";
  return null;
}
