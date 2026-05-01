import type { UnitReport } from "../../types/reporting";

interface UnitListProps {
  reports: UnitReport[];
  selectedUnitId: string;
  onSelect: (unitId: string) => void;
}

export function UnitList({ reports, selectedUnitId, onSelect }: UnitListProps) {
  return (
    <div className="unit-list">
      {reports.map((report) => (
        <button
          type="button"
          key={report.unitId}
          className={selectedUnitId === report.unitId ? "active-unit" : ""}
          onClick={() => onSelect(report.unitId)}
        >
          <span>{report.unitName}</span>
          <strong>{report.reservations.length} reserva(s)</strong>
        </button>
      ))}
    </div>
  );
}
