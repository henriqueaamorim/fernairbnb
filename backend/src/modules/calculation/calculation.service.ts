import { toMoney } from "../../shared/utils/money.js";
import type { ConsolidatedReservation } from "../../shared/types/domain.js";

export class CalculationService {
  applyRepasse(reservations: ConsolidatedReservation[]): ConsolidatedReservation[] {
    return reservations.map((reservation) => {
      const repasse = toMoney(reservation.valorLiquido * 0.2);
      const valorProprietario = toMoney(reservation.valorLiquido - repasse);
      return {
        ...reservation,
        repasseNewHabitat: repasse,
        valorProprietario
      };
    });
  }
}
