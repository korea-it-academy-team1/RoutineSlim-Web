import { downloadFile } from "../../../shared/lib/downloadFile";

function calendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) throw new Error("일정 날짜가 올바르지 않습니다.");
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error("일정 날짜가 올바르지 않습니다.");
  return date;
}
const compact = (date) => date.toISOString().slice(0, 10).replaceAll("-", "");
const escapeText = (value) =>
  String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");

// RFC 5545: fold at 75 UTF-8 octets, without splitting a Korean character.
function fold(line) {
  const encoder = new TextEncoder();
  let current = "",
    length = 0;
  const lines = [];
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (length + bytes > 75) {
      lines.push(current);
      current = " ";
      length = 1;
    }
    current += character;
    length += bytes;
  }
  lines.push(current);
  return lines.join("\r\n");
}

export function buildCalendar(events, now = new Date()) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RoutineSlim//Payment Calendar//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:RoutineSlim 결제 일정",
  ];
  const occurrences = new Map();
  events.forEach((event) => {
    const key = `${String(event.subscriptionId ?? event.name)}-${event.date}`;
    const occurrence = occurrences.get(key) || 0;
    occurrences.set(key, occurrence + 1);
    const start = calendarDate(event.date),
      end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const amount = Number(event.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error("일정 금액이 올바르지 않습니다.");
    lines.push(
      "BEGIN:VEVENT",
      `UID:routineslim-${encodeURIComponent(String(event.subscriptionId ?? event.name))}-${compact(start)}-${occurrence}@routineslim.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(start)}`,
      `DTEND;VALUE=DATE:${compact(end)}`,
      `SUMMARY:${escapeText(event.name)} 결제 예정`,
      `DESCRIPTION:${escapeText(`${event.category || "기타"} · ${amount.toLocaleString("ko-KR")}원\nRoutineSlim에서 내보낸 예상 결제 일정입니다.`)}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  });
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function exportCalendar(events, month) {
  downloadFile(`RoutineSlim-${month}.ics`, buildCalendar(events), "text/calendar;charset=utf-8");
}
