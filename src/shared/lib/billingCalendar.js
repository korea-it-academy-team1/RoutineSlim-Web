function monthParts(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || ""))
    throw new Error("조회 월을 YYYY-MM 형식으로 선택해주세요.");
  return month.split("-").map(Number);
}
function iso(date) {
  return date.toISOString().slice(0, 10);
}
export function shiftMonth(month, offset) {
  const [year, m] = monthParts(month);
  return iso(new Date(Date.UTC(year, m - 1 + offset, 1))).slice(0, 7);
}
export function projectedEvents(subscriptions, month) {
  const [year, m] = monthParts(month);
  const begin = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  const result = [];
  for (const s of subscriptions) {
    if (!["active", "review", "trial"].includes(s.status)) continue;
    const anchor = s.billingAnchorDate || s.startDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor || "")) continue;
    const start = new Date(anchor + "T00:00:00Z");
    const interval = Number(s.cycleInterval ?? 1);
    if (!Number.isSafeInteger(interval) || interval < 1) continue;
    const billingDay = Number(s.billingDay ?? s.day ?? start.getUTCDate());
    let n;
    if (s.cycle === "weekly")
      n = Math.max(0, Math.floor((begin - start) / (7 * 86400000 * interval)));
    else {
      const months = (year - start.getUTCFullYear()) * 12 + m - 1 - start.getUTCMonth();
      n = Math.max(0, Math.floor(months / (interval * (s.cycle === "yearly" ? 12 : 1))));
    }
    if (!["weekly", "monthly", "yearly"].includes(s.cycle)) continue;
    for (let attempts = 0; attempts < 40; attempts++, n++) {
      let date;
      if (s.cycle === "weekly") date = new Date(start.getTime() + n * interval * 7 * 86400000);
      else {
        const offset = n * interval * (s.cycle === "yearly" ? 12 : 1);
        date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
        const last = new Date(
          Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
        ).getUTCDate();
        date.setUTCDate(Math.min(billingDay, last));
      }
      if (date >= end) break;
      if (date >= begin && date >= start)
        result.push({
          subscriptionId: s.id,
          name: s.name,
          amount: s.amount,
          category: s.category,
          date: iso(date),
          projected: true,
        });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}
