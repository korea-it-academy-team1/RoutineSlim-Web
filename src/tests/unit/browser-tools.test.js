import { describe, expect, it } from "vitest";
import { buildCalendar } from "../../features/payments/utils/calendarExport";
import { calculateScenario } from "../../features/savings/utils/savingsScenario";
import {
  planPrice,
  filterPlans,
  safeSourceUrl,
} from "../../features/subscriptions/utils/planComparison";

const now = new Date("2026-11-15T03:00:00Z");
const event = {
  subscriptionId: "sub-1",
  name: "영상 구독",
  category: "영상",
  amount: 12000,
  date: "2026-12-31",
};
const unfold = (text) => text.replace(/\r\n /g, "");
describe("calendar files", () => {
  it("uses all-day dates with exclusive end dates across year and leap-day boundaries", () => {
    const file = unfold(buildCalendar([event, { ...event, date: "2028-02-29" }], now));
    expect(file).toContain("DTSTAMP:20261115T030000Z\r\n");
    expect(file).toContain("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101");
    expect(file).toContain("DTEND;VALUE=DATE:20280301");
    expect(file).not.toContain("TZID");
    expect(file).toMatch(/END:VCALENDAR\r\n$/);
  });
  it("escapes newlines and delimiters so a service name cannot inject another event", () => {
    const file = buildCalendar([{ ...event, name: "이름,세미;\\\r\nBEGIN:VEVENT" }], now);
    expect(file.match(/\r\nBEGIN:VEVENT\r\n/g)).toHaveLength(1);
    expect(unfold(file)).toContain("SUMMARY:이름\\,세미\\;\\\\\\nBEGIN:VEVENT 결제 예정");
  });
  it("folds Korean UTF-8 lines without corrupting text", () => {
    const name = "긴 한국어 구독 이름 ".repeat(30);
    const file = buildCalendar([{ ...event, name }], now);
    for (const line of file.split("\r\n"))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(unfold(file)).toContain(`SUMMARY:${name} 결제 예정`);
  });
  it("keeps event UIDs stable when the source list changes order", () => {
    const events = [event, { ...event, subscriptionId: "sub-2" }];
    const ids = (rows) =>
      unfold(buildCalendar(rows, now))
        .split("\r\n")
        .filter((s) => s.startsWith("UID:"))
        .sort();
    expect(ids(events)).toEqual(ids([...events].reverse()));
  });
  it("rejects impossible dates and invalid amounts before downloading", () => {
    expect(() => buildCalendar([{ ...event, date: "2026-02-30" }], now)).toThrow("날짜");
    expect(() => buildCalendar([{ ...event, amount: -1 }], now)).toThrow("금액");
  });
});
describe("local savings scenarios", () => {
  it("deduplicates selection and ignores canceled or stale subscriptions", () => {
    const rows = [
      { id: "a", amount: 12000, cycle: "yearly", status: "active" },
      { id: "b", monthlyAmount: 2600, amount: 1200, cycle: "weekly", status: "review" },
      { id: "c", amount: 9999, cycle: "monthly", status: "canceled" },
    ];
    const before = JSON.stringify(rows);
    const result = calculateScenario(rows, ["a", "a", "b", "c", "missing"], 6);
    expect(result.monthlySavings).toBe(3600);
    expect(result.cumulativeSavings).toBe(21600);
    expect(result.remaining).toBe(0);
    expect(result.chosen).toHaveLength(2);
    expect(result.timeline.at(-1)).toEqual({ month: 6, saved: 21600 });
    expect(JSON.stringify(rows)).toBe(before);
  });
  it("handles empty selections and empty accounts without dividing by zero", () => {
    expect(calculateScenario([], [], 12)).toMatchObject({
      current: 0,
      percent: 0,
      remaining: 0,
      cumulativeSavings: 0,
    });
    expect(() => calculateScenario([], [], 0)).toThrow("기간");
  });
});
describe("plan comparison", () => {
  it("compares weekly, yearly and multi-interval prices on the same basis", () => {
    expect(planPrice({ amount: 1200, cycle: "weekly" })).toEqual({ monthly: 5200, annual: 62400 });
    expect(planPrice({ amount: 12000, cycle: "yearly" })).toEqual({ monthly: 1000, annual: 12000 });
    expect(planPrice({ amount: 10000, cycle: "monthly", cycleInterval: 2 })).toEqual({
      monthly: 5000,
      annual: 60000,
    });
    expect(planPrice({ amount: 0, cycle: "monthly" })).toEqual({ monthly: 0, annual: 0 });
    expect(planPrice({ amount: null, cycle: "monthly" })).toBeNull();
    expect(planPrice({ amount: 1, cycle: "unknown" })).toBeNull();
  });
  it("searches conditions and sorts by normalized price without mutating server rows", () => {
    const rows = [
      {
        id: 1,
        service: "A",
        plan: "기본",
        category: "영상",
        amount: 24000,
        cycle: "yearly",
        features: ["HD"],
      },
      {
        id: 2,
        service: "B",
        plan: "기본",
        category: "영상",
        amount: 1000,
        cycle: "weekly",
        features: ["HD"],
      },
    ];
    expect(filterPlans(rows, "영상", "hd", "price-desc").map((x) => x.id)).toEqual([2, 1]);
    expect(rows.map((x) => x.id)).toEqual([1, 2]);
    expect(filterPlans(rows, "음악", "", "default")).toEqual([]);
    expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeSourceUrl("https://example.com/")).toBe("https://example.com/");
  });
});
