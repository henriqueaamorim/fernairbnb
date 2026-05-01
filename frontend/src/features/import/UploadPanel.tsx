import type { ImportedSheet, Platform } from "../../types/reporting";
import { MAX_FILES, mergeImportedSheets } from "./mergeImportedSheets";


interface UploadPanelProps {
  rows: ImportedSheet[];
  onChange: (rows: ImportedSheet[]) => void;
}

const platforms: Platform[] = ["airbnb", "booking", "lodgify", "vrbo"];
export function UploadPanel({ rows, onChange }: UploadPanelProps) {
  return (
    <section className="card">
      <h3>1. Upload de planilhas (até 6)</h3>
      <p className="summary">Arquivos importados: {rows.length}/{MAX_FILES}</p>
      <input
        type="file"
        multiple
        accept=".csv,.xls,.xlsx"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          const mergedRows = mergeImportedSheets(rows, files);
          onChange(mergedRows);
          event.currentTarget.value = "";
        }}
      />
      <div className="mapping-grid">
        {rows.map((row, index) => (
          <label key={`${row.file.name}-${index}`}>
            {row.file.name}
            <select
              value={row.platform}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, platform: event.target.value as Platform };
                onChange(next);
              }}
            >
              {platforms.map((platform) => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, currentIndex) => currentIndex !== index))}
            >
              Remover arquivo
            </button>
          </label>
        ))}
      </div>
    </section>
  );
}
