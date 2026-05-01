import * as XLSX from "xlsx";
import type { ConsolidatedReservation, ReservationConflict } from "../types.js";

export class XlsReportService {
  buildWorkbook(reservations: ConsolidatedReservation[], conflicts: ReservationConflict[]): Buffer {
    const wb = XLSX.utils.book_new();

    const consolidado = reservations.map((row) => ({
      codigoReserva: row.reservationCode,
      dataInicio: row.startDate,
      dataFim: row.endDate,
      plataforma: row.platform,
      noites: row.nights,
      valorReserva: row.bookingValue,
      status: row.status,
      unidade: row.unit,
      hospede: row.guestName
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consolidado), "Consolidado");

    const conflitos = conflicts.map((conflict) => ({
      conflictId: conflict.conflictId,
      reservationKey: conflict.reservationKey,
      field: conflict.field,
      severity: conflict.severity,
      reason: conflict.reason,
      suggestedValue: conflict.suggestedValue,
      candidates: conflict.candidates.join(" | ")
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(conflitos), "ConflitosResolvidos");

    const origem = reservations.flatMap((row) =>
      row.mergedFrom.map((source) => ({
        consolidationKey: row.consolidationKey,
        reservationCode: row.reservationCode,
        fileId: source.fileId,
        fileName: source.fileName,
        rowNumber: source.rowNumber,
        sourcePlatform: source.sourcePlatform
      }))
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(origem), "OrigemLinhas");

    const resumo = [
      { metrica: "Total reservas consolidadas", valor: reservations.length },
      { metrica: "Total conflitos", valor: conflicts.length },
      { metrica: "Valor total reservas", valor: reservations.reduce((acc, row) => acc + row.bookingValue, 0) }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
}
