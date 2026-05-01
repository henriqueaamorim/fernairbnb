import { describe, expect, it } from "vitest";
import { consolidateReservations } from "./consolidate";

describe("consolidateReservations", () => {
  it("agrupa pagamentos parciais por codigo e unidade", () => {
    const result = consolidateReservations([
      {
        unitRawName: "Studio 1503",
        unitId: "1503",
        platform: "airbnb",
        startDate: "2026-01-01",
        endDate: "2026-01-03",
        confirmationCode: "R1",
        nights: 2,
        bookingValue: 200,
        status: "confirmado"
      },
      {
        unitRawName: "Skyline 1503",
        unitId: "1503",
        platform: "airbnb",
        startDate: "2026-01-01",
        endDate: "2026-01-03",
        confirmationCode: "R1",
        nights: 2,
        bookingValue: 300,
        status: "confirmado"
      }
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].bookingValue).toBe(500);
  });

  it("consolida dados vindos de multiplas planilhas importadas", () => {
    const result = consolidateReservations([
      {
        unitRawName: "Studio 1001",
        unitId: "1001",
        platform: "airbnb",
        startDate: "2026-01-10",
        endDate: "2026-01-12",
        confirmationCode: "AB1",
        nights: 2,
        bookingValue: 400,
        status: "confirmado"
      },
      {
        unitRawName: "Studio 1001",
        unitId: "1001",
        platform: "booking",
        startDate: "2026-01-10",
        endDate: "2026-01-12",
        confirmationCode: "AB1",
        nights: 2,
        bookingValue: 250,
        status: "confirmado"
      },
      {
        unitRawName: "Studio 2002",
        unitId: "2002",
        platform: "vrbo",
        startDate: "2026-01-20",
        endDate: "2026-01-22",
        confirmationCode: "CD2",
        nights: 2,
        bookingValue: 300,
        status: "confirmado"
      }
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((row) => row.unitId === "1001")?.bookingValue).toBe(650);
    expect(result.find((row) => row.unitId === "2002")?.bookingValue).toBe(300);
  });
});
