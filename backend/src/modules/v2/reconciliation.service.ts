import type { RawRow } from "../../shared/types/domain.js";
import { parseNumberLike, toMoney } from "../../shared/utils/money.js";
import type {
  CanonicalReservation,
  ConsolidatedReservation,
  MappingV2,
  ReservationConflict,
  SourcePlatform
} from "./types.js";

function normalizeDate(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return text;
  }
  return date.toISOString().slice(0, 10);
}

function statusWeight(status: string): number {
  const lowered = status.toLowerCase();
  if (lowered.includes("cancel")) return 0;
  if (lowered.includes("confirm")) return 3;
  if (lowered.includes("paid")) return 4;
  return 2;
}

export class ReconciliationService {
  mapRows(rows: RawRow[], mapping: MappingV2, fileId: string, fileName: string): CanonicalReservation[] {
    const map = mapping.mapping;
    return rows.map((row) => {
      const startDate = normalizeDate(row.values[map.startDate ?? ""]);
      const endDate = normalizeDate(row.values[map.endDate ?? ""]);
      const bookingValue = toMoney(parseNumberLike(row.values[map.bookingValue ?? ""]));
      const nightsRaw = parseNumberLike(row.values[map.nights ?? ""]);
      const nights = nightsRaw > 0 ? nightsRaw : this.calculateNights(startDate, endDate);
      return {
        reservationCode: String(row.values[map.reservationCode ?? ""] ?? "").trim(),
        startDate,
        endDate,
        platform: String(row.values[map.platform ?? ""] ?? mapping.source).trim(),
        nights,
        bookingValue,
        status: String(row.values[map.status ?? ""] ?? "").trim(),
        unit: String(row.values[map.unit ?? ""] ?? "").trim(),
        guestName: String(row.values[map.guestName ?? ""] ?? "").trim(),
        sourceRefs: [
          {
            fileId,
            fileName,
            rowNumber: row.rowNumber,
            sourcePlatform: mapping.source
          }
        ]
      };
    });
  }

  reconcile(mapped: CanonicalReservation[]): { reservations: ConsolidatedReservation[]; conflicts: ReservationConflict[] } {
    const groups = new Map<string, CanonicalReservation[]>();
    for (const row of mapped) {
      const month = row.startDate ? row.startDate.slice(0, 7) : "unknown-month";
      const key = row.reservationCode ? `${row.reservationCode}` : `fallback:${row.unit}:${month}`;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    const conflicts: ReservationConflict[] = [];
    const reservations: ConsolidatedReservation[] = [];

    for (const [groupKey, rows] of groups.entries()) {
      const first = rows[0];
      const startDates = [...new Set(rows.map((item) => item.startDate).filter(Boolean))];
      const endDates = [...new Set(rows.map((item) => item.endDate).filter(Boolean))];
      const bookingValues = [...new Set(rows.map((item) => item.bookingValue))];
      const nightsValues = [...new Set(rows.map((item) => item.nights))];
      const statuses = [...new Set(rows.map((item) => item.status).filter(Boolean))];
      const platforms = [...new Set(rows.map((item) => item.platform).filter(Boolean))];

      const conflictFlags: string[] = [];
      let startDate = startDates.sort()[0] ?? "";
      let endDate = endDates.sort()[endDates.length - 1] ?? "";
      let nights = this.calculateNights(startDate, endDate);
      if (!nights) {
        nights = nightsValues.sort((a, b) => b - a)[0] ?? 0;
      }

      const isSplitPayment = bookingValues.length > 1 && rows.length > 1;
      const bookingValue = toMoney(isSplitPayment ? rows.reduce((acc, item) => acc + item.bookingValue, 0) : bookingValues[0] ?? 0);

      if (startDates.length > 1) {
        const conflictId = `${groupKey}::startDate`;
        conflictFlags.push(conflictId);
        conflicts.push({
          conflictId,
          reservationKey: groupKey,
          field: "startDate",
          candidates: startDates,
          suggestedValue: startDate,
          reason: "Datas de início divergentes entre arquivos.",
          severity: "warning"
        });
      }
      if (endDates.length > 1) {
        const conflictId = `${groupKey}::endDate`;
        conflictFlags.push(conflictId);
        conflicts.push({
          conflictId,
          reservationKey: groupKey,
          field: "endDate",
          candidates: endDates,
          suggestedValue: endDate,
          reason: "Datas de fim divergentes entre arquivos.",
          severity: "warning"
        });
      }
      if (bookingValues.length > 1 && !isSplitPayment) {
        const conflictId = `${groupKey}::bookingValue`;
        conflictFlags.push(conflictId);
        conflicts.push({
          conflictId,
          reservationKey: groupKey,
          field: "bookingValue",
          candidates: bookingValues,
          suggestedValue: bookingValues.sort((a, b) => b - a)[0] ?? 0,
          reason: "Valores de reserva divergentes sem padrão de split detectado.",
          severity: "critical"
        });
      }
      if (nightsValues.length > 1) {
        const conflictId = `${groupKey}::nights`;
        conflictFlags.push(conflictId);
        conflicts.push({
          conflictId,
          reservationKey: groupKey,
          field: "nights",
          candidates: nightsValues,
          suggestedValue: nights,
          reason: "Número de noites divergente entre fontes.",
          severity: "warning"
        });
      }
      if (statuses.length > 1) {
        const conflictId = `${groupKey}::status`;
        conflictFlags.push(conflictId);
        const suggested = statuses.sort((a, b) => statusWeight(b) - statusWeight(a))[0] ?? "";
        conflicts.push({
          conflictId,
          reservationKey: groupKey,
          field: "status",
          candidates: statuses,
          suggestedValue: suggested,
          reason: "Status divergente entre plataformas.",
          severity: "warning"
        });
      }

      reservations.push({
        consolidationKey: groupKey,
        reservationCode: first.reservationCode,
        startDate,
        endDate,
        platform: platforms.join(" / "),
        nights,
        bookingValue,
        status: statuses.sort((a, b) => statusWeight(b) - statusWeight(a))[0] ?? "",
        unit: first.unit,
        guestName: first.guestName,
        conflictFlags,
        mergedFrom: rows.flatMap((item) => item.sourceRefs)
      });
    }

    return { reservations, conflicts };
  }

  applyResolutions(
    reservations: ConsolidatedReservation[],
    resolutions: Array<{ conflictId: string; value: string | number }>,
    patches: Array<{ reservationKey: string; field: keyof ConsolidatedReservation; value: string | number }>
  ): ConsolidatedReservation[] {
    const byKey = new Map(reservations.map((item) => [item.consolidationKey, { ...item }]));

    for (const resolution of resolutions) {
      const [reservationKey, field] = resolution.conflictId.split("::");
      const target = byKey.get(reservationKey);
      if (!target) continue;
      (target as unknown as Record<string, string | number>)[field] = resolution.value;
    }

    for (const patch of patches) {
      const target = byKey.get(patch.reservationKey);
      if (!target) continue;
      (target as unknown as Record<string, string | number>)[patch.field] = patch.value;
    }

    return Array.from(byKey.values());
  }

  private calculateNights(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }
    const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }
}
