function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateBR(value: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";

  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (ddmmyyyy.test(trimmed)) return trimmed;

  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  const yyyymmddMatch = trimmed.match(yyyymmdd);
  if (yyyymmddMatch) {
    return `${yyyymmddMatch[3]}/${yyyymmddMatch[2]}/${yyyymmddMatch[1]}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}
