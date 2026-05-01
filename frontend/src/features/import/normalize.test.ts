import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { normalizeSheets } from "./normalize";

describe("normalizeSheets", () => {
  it("preserva casas decimais com virgula em valores monetarios", async () => {
    const rows = [
      ["Código de Confirmação", "Data de início", "Data de término", "Noites", "Studio", "Valor Líquido", "Status"],
      ["ABC123", "2026-02-14", "2026-02-17", "3", "Studio 413", "636,02", "Confirmada"],
      ["ABC124", "2026-02-18", "2026-02-20", "2", "Studio 413", "476,63", "Confirmada"],
      ["ABC125", "2026-02-20", "2026-02-23", "3", "Studio 413", "655,60", "Confirmada"]
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

    const file = new File([buffer], "airbnb.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    const normalized = await normalizeSheets([{ file, platform: "airbnb" }]);

    expect(normalized).toHaveLength(3);
    expect(normalized[0].bookingValue).toBeCloseTo(636.02, 2);
    expect(normalized[1].bookingValue).toBeCloseTo(476.63, 2);
    expect(normalized[2].bookingValue).toBeCloseTo(655.6, 2);
  });
});
