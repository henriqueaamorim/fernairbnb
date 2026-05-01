import type { ConsolidatedReservation, NormalizedReservation } from "../../types/reporting";

function keyForGrouping(row: NormalizedReservation): string {
  const dateKey = row.startDate || "no-date";
  return `${row.unitId}::${row.confirmationCode || "no-code"}::${dateKey}`;
}

export function consolidateReservations(rows: NormalizedReservation[]): ConsolidatedReservation[] {
  const grouped = new Map<string, ConsolidatedReservation>();

  for (const row of rows) {
    if (row.status.toLowerCase().includes("cancel")) continue;
    const key = keyForGrouping(row);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, {
        key,
        unitId: row.unitId,
        unitName: row.unitRawName,
        platform: row.platform,
        startDate: row.startDate,
        endDate: row.endDate,
        confirmationCode: row.confirmationCode,
        nights: row.nights,
        bookingValue: row.bookingValue,
        status: row.status
      });
      continue;
    }

    existing.bookingValue += row.bookingValue;
    existing.nights += row.nights;
    if (!existing.endDate && row.endDate) {
      existing.endDate = row.endDate;
    }
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.unitName === b.unitName) return a.startDate.localeCompare(b.startDate);
    return a.unitName.localeCompare(b.unitName);
  });
}
