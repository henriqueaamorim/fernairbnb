import { toMoney } from "../../shared/utils/money.js";
import type { ConsolidatedReservation, ReviewPatch } from "../../shared/types/domain.js";

export class ReviewService {
  applyPatches(reservations: ConsolidatedReservation[], patches: ReviewPatch[]): ConsolidatedReservation[] {
    const byCode = new Map(reservations.map((reservation) => [reservation.codigoConfirmacao, { ...reservation }]));

    for (const patch of patches) {
      const target = byCode.get(patch.codigoConfirmacao);
      if (!target) {
        continue;
      }

      if (patch.field === "valorBruto" || patch.field === "valorLiquido") {
        const numericValue = typeof patch.value === "number" ? patch.value : Number(patch.value);
        (target as unknown as Record<string, unknown>)[patch.field] = toMoney(Number.isFinite(numericValue) ? numericValue : 0);
      } else {
        (target as unknown as Record<string, unknown>)[patch.field] = String(patch.value);
      }
    }

    return Array.from(byCode.values()).map((reservation) => {
      const repasseNewHabitat = toMoney(reservation.valorLiquido * 0.2);
      const valorProprietario = toMoney(reservation.valorLiquido - repasseNewHabitat);
      return {
        ...reservation,
        repasseNewHabitat,
        valorProprietario
      };
    });
  }
}
