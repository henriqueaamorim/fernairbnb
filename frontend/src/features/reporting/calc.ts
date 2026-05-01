import type { ConsolidatedReservation, UnitReport } from "../../types/reporting";

export const DEFAULT_HABITAT_FEE_PERCENT = 20;

export function calculateUnitReport(
  unitId: string,
  unitName: string,
  reservations: ConsolidatedReservation[],
  habitatFeePercent: number
): UnitReport {
  const subtotal = reservations.reduce((acc, row) => acc + row.bookingValue, 0);
  const habitatFeeValue = subtotal * (habitatFeePercent / 100);
  const netValue = subtotal - habitatFeeValue;

  return {
    unitId,
    unitName,
    reservations,
    subtotal,
    habitatFeePercent,
    habitatFeeValue,
    netValue
  };
}
