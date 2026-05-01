import { ConsolidationService } from "../modules/consolidation/consolidation.service.js";
import { CalculationService } from "../modules/calculation/calculation.service.js";
import type { MappedRow } from "../shared/types/domain.js";

function makeRows(total: number): MappedRow[] {
  const rows: MappedRow[] = [];
  for (let index = 0; index < total; index += 1) {
    rows.push({
      sourcePlatform: index % 2 === 0 ? "airbnb" : "booking",
      rowNumber: index + 2,
      data: "2026-03-01",
      codigoConfirmacao: `CODE-${Math.floor(index / 2)}`,
      unidade: `Studio-${(index % 10) + 1}`,
      valorBruto: 100 + (index % 5),
      valorLiquido: 80 + (index % 5),
      status: "Confirmada",
      hospede: `Hospede ${index}`
    });
  }
  return rows;
}

const consolidator = new ConsolidationService();
const calculator = new CalculationService();
const rows = makeRows(500);

const started = performance.now();
const filtered = consolidator.filterCancelled(rows);
const consolidated = consolidator.consolidate(filtered);
calculator.applyRepasse(consolidated);
const ended = performance.now();

const elapsed = ended - started;
console.log(`Processed 500 rows in ${elapsed.toFixed(2)} ms`);
if (elapsed > 2000) {
  process.exitCode = 1;
}
