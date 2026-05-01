import { useMemo, useState } from "react";
import { UploadPanel } from "../features/import/UploadPanel";
import { normalizeSheets } from "../features/import/normalize";
import { consolidateReservations } from "../features/reporting/consolidate";
import { calculateUnitReport, DEFAULT_HABITAT_FEE_PERCENT } from "../features/reporting/calc";
import { EditableReportGrid } from "../features/reporting/EditableReportGrid";
import { UnitList } from "../features/reporting/UnitList";
import { buildUnitPdf, exportAllReportsZip } from "../features/reporting/export";
import { formatCurrencyBRL } from "../shared/format/number";
import type { ConsolidatedReservation, ImportedSheet, UnitReport } from "../types/reporting";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function Dashboard() {
  const [inputSheets, setInputSheets] = useState<ImportedSheet[]>([]);
  const [rows, setRows] = useState<ConsolidatedReservation[]>([]);
  const [habitatFeePercent, setHabitatFeePercent] = useState(DEFAULT_HABITAT_FEE_PERCENT);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("Janeiro_2026");
  const [status, setStatus] = useState("Importe planilhas para consolidar por unidade.");

  const reports = useMemo<UnitReport[]>(() => {
    const byUnit = new Map<string, ConsolidatedReservation[]>();
    for (const row of rows) {
      const current = byUnit.get(row.unitId) ?? [];
      current.push(row);
      byUnit.set(row.unitId, current);
    }
    return Array.from(byUnit.entries()).map(([unitId, reservations]) =>
      calculateUnitReport(unitId, reservations[0]?.unitName ?? unitId, reservations, habitatFeePercent)
    );
  }, [rows, habitatFeePercent]);

  const selectedReport = reports.find((report) => report.unitId === selectedUnitId) ?? reports[0] ?? null;

  async function processSheets() {
    if (inputSheets.length === 0) {
      setStatus("Selecione ao menos uma planilha.");
      return;
    }
    const normalized = await normalizeSheets(inputSheets);
    const consolidated = consolidateReservations(normalized);
    setRows(consolidated);
    setSelectedUnitId(consolidated[0]?.unitId ?? "");
    setStatus(`Processamento concluído com ${consolidated.length} reservas consolidadas.`);
  }

  function updateReservationValue(rowKey: string, value: number) {
    setRows((current) => current.map((row) => row.key === rowKey ? { ...row, bookingValue: value } : row));
  }

  async function exportZip() {
    const blob = await exportAllReportsZip(reports, {
      nomeRelatorio: referenceMonth,
      ownerName: "Suely Marcelino Da Rocha",
      ownerCpf: "274.233.398-30"
    });
    downloadBlob(blob, `Relatorios_${referenceMonth}.zip`);
  }

  function exportCurrentPdf() {
    if (!selectedReport) return;
    const blob = buildUnitPdf(selectedReport, {
      studio: selectedReport.unitName,
      nomeRelatorio: referenceMonth,
      ownerName: "Suely Marcelino Da Rocha",
      ownerCpf: "274.233.398-30"
    });
    downloadBlob(blob, `${selectedReport.unitName}_${referenceMonth}.pdf`);
  }

  return (
    <div className="app app--hero-layout">
      <header className="brand-hero" aria-label="Marca fernairbnb">
        <div className="brand-title-wrap">
          <h1 className="brand-title">fernairbnb</h1>
        </div>
        <p className="brand-subtitle">Consolidação de faturamento por unidade</p>
      </header>
      <main className="content">
        <section className="hero-card">
          <h2>Prestação de contas mensal</h2>
          <p>{status}</p>
          <div className="hero-fields">
            <label>
              Nome do Relatório
              <input value={referenceMonth} onChange={(event) => setReferenceMonth(event.target.value)} />
            </label>
            <label>
              Taxa NEW HABITAT (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={habitatFeePercent}
                onChange={(event) => setHabitatFeePercent(Number(event.target.value))}
              />
            </label>
          </div>
        </section>

        <UploadPanel rows={inputSheets} onChange={setInputSheets} />

        <section className="card">
          <button type="button" onClick={processSheets} disabled={inputSheets.length === 0}>
            2. Consolidar dados
          </button>
          {inputSheets.length === 0 && (
            <p className="summary">Importe entre 1 e 6 arquivos para habilitar a consolidação.</p>
          )}
        </section>

        <section className="card">
          <h3>3. Unidades consolidadas</h3>
          <UnitList reports={reports} selectedUnitId={selectedReport?.unitId ?? ""} onSelect={setSelectedUnitId} />
        </section>

        <section className="card">
          <h3>4. Grade editável e prévia</h3>
          <EditableReportGrid report={selectedReport} onUpdateValue={updateReservationValue} />
          {selectedReport && (
            <p className="summary">
              Subtotal: {formatCurrencyBRL(selectedReport.subtotal)} | Taxa: {formatCurrencyBRL(selectedReport.habitatFeeValue)} | Líquido: {formatCurrencyBRL(selectedReport.netValue)}
            </p>
          )}
          <div className="actions">
            <button type="button" disabled={!selectedReport} onClick={exportCurrentPdf}>Exportar PDF unidade</button>
            <button type="button" disabled={reports.length === 0} onClick={exportZip}>Exportar tudo (ZIP)</button>
          </div>
        </section>
      </main>
    </div>
  );
}
