import { toMoney } from "../../shared/utils/money.js";
import type { ConsolidatedReservation, MappedRow } from "../../shared/types/domain.js";

const CANCELLED_MARKERS = ["cancel", "cancelada", "cancelled", "canceled"];

export class ConsolidationService {
  filterCancelled(rows: MappedRow[]): MappedRow[] {
    return rows.filter((row) => {
      const status = row.status.toLowerCase();
      return !CANCELLED_MARKERS.some((marker) => status.includes(marker));
    });
  }

  consolidate(rows: MappedRow[]): ConsolidatedReservation[] {
    const grouped = new Map<string, ConsolidatedReservation>();

    for (const row of rows) {
      const key = `${row.sourcePlatform}:${row.codigoConfirmacao}`;
      const current = grouped.get(key);
      if (!current) {
        grouped.set(key, {
          sourcePlatform: row.sourcePlatform,
          codigoConfirmacao: row.codigoConfirmacao,
          unidade: row.unidade,
          data: row.data,
          hospede: row.hospede,
          status: row.status,
          valorBruto: toMoney(row.valorBruto),
          valorLiquido: toMoney(row.valorLiquido),
          repasseNewHabitat: 0,
          valorProprietario: 0,
          sourceRows: [row.rowNumber]
        });
        continue;
      }

      current.valorBruto = toMoney(current.valorBruto + row.valorBruto);
      current.valorLiquido = toMoney(current.valorLiquido + row.valorLiquido);
      current.sourceRows.push(row.rowNumber);
    }

    return Array.from(grouped.values());
  }
}
