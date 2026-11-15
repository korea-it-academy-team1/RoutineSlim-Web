import { downloadFile } from "./downloadFile";
export function exportCsv(filename, headers, rows) {
  const escape = (value) => {
    let text = String(value ?? "");
    if (typeof value === "string" && /^[\s]*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const content =
    "\uFEFF" + [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  downloadFile(filename, content, "text/csv;charset=utf-8");
}
