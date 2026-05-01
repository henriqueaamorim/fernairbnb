import { z } from "zod";
import { parseNumberLike } from "../../shared/utils/money.js";
import type { CanonicalField, MappedRow, MappingTemplate, Platform, RawRow } from "../../shared/types/domain.js";

const REQUIRED_FIELDS: CanonicalField[] = [
  "data",
  "codigoConfirmacao",
  "unidade",
  "valorBruto",
  "valorLiquido",
  "status",
  "hospede"
];

const mappingSchema = z.object({
  name: z.string().min(1),
  platform: z.enum(["airbnb", "booking"]),
  mapping: z.record(z.string(), z.string().min(1))
});

export class MappingService {
  validateTemplate(template: MappingTemplate): { valid: boolean; missingFields: CanonicalField[] } {
    mappingSchema.parse(template);
    const missingFields = REQUIRED_FIELDS.filter((field) => !template.mapping[field]);
    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  mapRows(platform: Platform, rows: RawRow[], mapping: Partial<Record<CanonicalField, string>>): MappedRow[] {
    const missing = REQUIRED_FIELDS.filter((field) => !mapping[field]);
    if (missing.length > 0) {
      throw new Error(`Template inválido. Campos faltantes: ${missing.join(", ")}`);
    }

    return rows.map((row) => ({
      sourcePlatform: platform,
      rowNumber: row.rowNumber,
      data: String(row.values[mapping.data!] ?? ""),
      codigoConfirmacao: String(row.values[mapping.codigoConfirmacao!] ?? "").trim(),
      unidade: String(row.values[mapping.unidade!] ?? "").trim(),
      valorBruto: parseNumberLike(row.values[mapping.valorBruto!]),
      valorLiquido: parseNumberLike(row.values[mapping.valorLiquido!]),
      status: String(row.values[mapping.status!] ?? "").trim(),
      hospede: String(row.values[mapping.hospede!] ?? "").trim()
    }));
  }
}
