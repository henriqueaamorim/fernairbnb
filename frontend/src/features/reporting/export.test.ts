import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { exportAllReportsZip } from "./export";
import type { UnitReport } from "../../types/reporting";

describe("export helpers", () => {
  it("gera ZIP com nome de arquivo baseado em studio e nomeRelatorio", async () => {
    const reports: UnitReport[] = [
      {
        unitId: "413",
        unitName: "Alameda 413",
        reservations: [
          {
            key: "r1",
            unitId: "413",
            unitName: "Alameda 413",
            platform: "booking",
            startDate: "2026-01-05",
            endDate: "2026-01-08",
            confirmationCode: "ABC",
            nights: 3,
            bookingValue: 503.6,
            status: "ok"
          }
        ],
        subtotal: 503.6,
        habitatFeePercent: 20,
        habitatFeeValue: 100.72,
        netValue: 402.88
      }
    ];

    const zipBlob = await exportAllReportsZip(reports, {
      nomeRelatorio: "01_2026",
      ownerName: "Suely",
      ownerCpf: "000.000.000-00"
    });

    const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names).toContain("Alameda_413_01_2026.pdf");
  });
});
