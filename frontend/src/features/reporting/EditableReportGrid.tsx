import { useState } from "react";
import type { UnitReport } from "../../types/reporting";
import { formatDateBR } from "../../shared/format/date";
import { formatCurrencyBRL, parseCurrencyBRL } from "../../shared/format/number";

interface EditableReportGridProps {
  report: UnitReport | null;
  onUpdateValue: (rowKey: string, nextValue: number) => void;
}

export function EditableReportGrid({ report, onUpdateValue }: EditableReportGridProps) {
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});

  if (!report) return <p>Faça upload e selecione uma unidade para editar.</p>;

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Data Reserva</th>
            <th>Plataforma</th>
            <th>Noites</th>
            <th>Valor da Reserva</th>
          </tr>
        </thead>
        <tbody>
          {report.reservations.map((row) => (
            <tr key={row.key}>
              <td>{formatDateBR(row.startDate)} a {formatDateBR(row.endDate)}</td>
              <td className={row.status.toLowerCase().includes("cancel") ? "platform-cancelled" : ""}>
                {row.status.toLowerCase().includes("cancel") ? `Cancelado - ${row.platform}` : row.platform}
              </td>
              <td>{row.nights}</td>
              <td>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draftValues[row.key] ?? formatCurrencyBRL(row.bookingValue)}
                  onChange={(event) =>
                    setDraftValues((current) => ({
                      ...current,
                      [row.key]: event.target.value
                    }))
                  }
                  onBlur={(event) => {
                    const parsed = parseCurrencyBRL(event.target.value);
                    onUpdateValue(row.key, parsed);
                    setDraftValues((current) => ({
                      ...current,
                      [row.key]: formatCurrencyBRL(parsed)
                    }));
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
