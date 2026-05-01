import { describe, expect, it } from "vitest";
import { calculateUnitReport } from "./calc";

describe("calculateUnitReport", () => {
  it("calcula subtotal, taxa e liquido", () => {
    const report = calculateUnitReport(
      "1503",
      "Studio 1503",
      [
        {
          key: "a",
          unitId: "1503",
          unitName: "Studio 1503",
          platform: "airbnb",
          startDate: "2026-01-01",
          endDate: "2026-01-03",
          confirmationCode: "abc",
          nights: 2,
          bookingValue: 1000,
          status: "confirmado"
        }
      ],
      20
    );

    expect(report.subtotal).toBe(1000);
    expect(report.habitatFeeValue).toBe(200);
    expect(report.netValue).toBe(800);
  });
});
