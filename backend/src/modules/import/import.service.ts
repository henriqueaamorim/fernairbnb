import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import type { RawRow } from "../../shared/types/domain.js";

export class ImportService {
  parseFile(filename: string, fileBuffer: Buffer): RawRow[] {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".csv")) {
      return this.parseCsv(fileBuffer);
    }

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      return this.parseXlsx(fileBuffer);
    }

    throw new Error("Formato de arquivo não suportado. Use CSV ou XLSX.");
  }

  private parseCsv(fileBuffer: Buffer): RawRow[] {
    const records = parseCsv(fileBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as Record<string, unknown>[];

    return records.map((values, index) => ({
      rowNumber: index + 2,
      values
    }));
  }

  private parseXlsx(fileBuffer: Buffer): RawRow[] {
    const workbook = XLSX.read(fileBuffer, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) {
      return [];
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
      defval: ""
    });

    return rows.map((values, index) => ({
      rowNumber: index + 2,
      values
    }));
  }
}
