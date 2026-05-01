export function toMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseNumberLike(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const raw = value.trim();
  const commaCount = (raw.match(/,/g) ?? []).length;
  const dotCount = (raw.match(/\./g) ?? []).length;

  let normalized = raw;
  if (commaCount > 0 && dotCount > 0) {
    normalized = raw.replace(/\./g, "").replace(",", ".");
  } else if (commaCount > 0) {
    normalized = raw.replace(",", ".");
  }

  normalized = normalized.replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
