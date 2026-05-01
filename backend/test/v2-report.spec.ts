import { describe, expect, it } from "vitest";
import { ReconciliationService } from "../src/modules/v2/reconciliation.service.js";
import { BundleExportService } from "../src/modules/v2/reporting/bundle-export.service.js";
import type { ConsolidatedReservation } from "../src/modules/v2/types.js";

describe("v2 pdf payload", () => {
  it("monta payload com studio, nomeRelatorio e totais corretos", () => {
    const service = new ReconciliationService();
    const reservations: ConsolidatedReservation[] = [
      {
        consolidationKey: "ABC",
        reservationCode: "ABC",
        startDate: "2026-01-05",
        endDate: "2026-01-08",
        platform: "Booking",
        nights: 3,
        bookingValue: 503.6,
        status: "ok",
        unit: "Alameda 413",
        guestName: "H1",
        conflictFlags: [],
        mergedFrom: []
      },
      {
        consolidationKey: "ABD",
        reservationCode: "ABD",
        startDate: "2026-01-09",
        endDate: "2026-01-12",
        platform: "Booking",
        nights: 3,
        bookingValue: 100,
        status: "cancelado",
        unit: "Alameda 413",
        guestName: "H2",
        conflictFlags: [],
        mergedFrom: []
      }
    ];

    const payload = service.toPdfReportPayload({
      studio: "Alameda 413",
      nomeRelatorio: "01_2026",
      ownerName: "Suely",
      ownerDocument: "274.233.398-30",
      taxaPercentual: 20,
      reservations
    });

    expect(payload.studio).toBe("Alameda 413");
    expect(payload.nomeRelatorio).toBe("01_2026");
    expect(payload.totalNoites).toBe(6);
    expect(payload.subtotal).toBe(603.6);
    expect(payload.taxaValor).toBe(120.72);
    expect(payload.valorLiquido).toBe(482.88);
    expect(payload.reservas[1].plataforma).toContain("Cancelado");
  });
});

describe("bundle export naming", () => {
  it("gera nome de arquivo usando studio e periodo", () => {
    const bundle = new BundleExportService();
    const filename = bundle.createPdfFilename({
      studio: "Alameda 413",
      nomeRelatorio: "01_2026",
      proprietario: { nome: "A", cpf: "B" },
      taxaPercentual: 20,
      reservas: [],
      subtotal: 0,
      totalNoites: 0,
      taxaValor: 0,
      valorLiquido: 0
    });

    expect(filename).toBe("Alameda_413_01_2026.pdf");
  });
});
