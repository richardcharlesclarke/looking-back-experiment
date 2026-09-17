export function csv(rows: Record<string, unknown>[]) {
  const columns = Object.keys(rows[0] ?? { responseId: "" });
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [columns, ...rows.map((r) => columns.map((k) => r[k]))]
    .map((r) => r.map(cell).join(","))
    .join("\r\n");
}
