export function planPrice(plan) {
  const amount = Number(plan.amount);
  const interval = Number(plan.cycleInterval ?? 1);
  const cycle = String(plan.cycle || "").toLowerCase();
  if (
    plan.amount == null ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(interval) ||
    interval < 1 ||
    !["weekly", "monthly", "yearly"].includes(cycle)
  )
    return null;
  const monthly = (amount * { weekly: 52 / 12, monthly: 1, yearly: 1 / 12 }[cycle]) / interval;
  return { monthly: Math.round(monthly), annual: Math.round(monthly * 12) };
}

export function filterPlans(plans, category, query, sort) {
  const term = query.trim().toLocaleLowerCase();
  const result = plans.filter(
    (plan) =>
      (category === "전체" || plan.category === category) &&
      [plan.service, plan.plan, ...(plan.features || [])]
        .join(" ")
        .toLocaleLowerCase()
        .includes(term),
  );
  if (sort === "price-asc" || sort === "price-desc") {
    result.sort((a, b) => {
      const left = planPrice(a)?.monthly,
        right = planPrice(b)?.monthly;
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return sort === "price-asc" ? left - right : right - left;
    });
  } else if (sort === "name")
    result.sort((a, b) => `${a.service} ${a.plan}`.localeCompare(`${b.service} ${b.plan}`, "ko"));
  return result;
}

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
