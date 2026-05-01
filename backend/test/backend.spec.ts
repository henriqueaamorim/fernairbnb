import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ImportService } from "../src/modules/import/import.service.js";
import { MappingService } from "../src/modules/mapping/mapping.service.js";
import { ConsolidationService } from "../src/modules/consolidation/consolidation.service.js";
import { CalculationService } from "../src/modules/calculation/calculation.service.js";
import { buildApp } from "../src/app.js";

describe("regras de consolidacao", () => {
  it("consolida duplicidades e remove canceladas", () => {
    const csv = readFileSync(join(process.cwd(), "test/fixtures/airbnb-sample.csv"));
    const importer = new ImportService();
    const mapper = new MappingService();
    const consolidator = new ConsolidationService();
    const calculator = new CalculationService();

    const raw = importer.parseFile("airbnb.csv", csv);
    const mapped = mapper.mapRows("airbnb", raw, {
      data: "Data",
      codigoConfirmacao: "Código de Confirmação",
      unidade: "Unidade",
      valorBruto: "Ganhos Brutos",
      valorLiquido: "Valor Líquido",
      status: "Status",
      hospede: "Hóspede"
    });

    const filtered = consolidator.filterCancelled(mapped);
    const consolidated = consolidator.consolidate(filtered);
    const calculated = calculator.applyRepasse(consolidated);
    const duplicate = calculated.find((item) => item.codigoConfirmacao === "HMWYKT2XD9");

    expect(duplicate?.valorBruto).toBe(620);
    expect(duplicate?.valorLiquido).toBe(520);
    expect(duplicate?.repasseNewHabitat).toBe(104);
    expect(calculated.some((item) => item.status.toLowerCase().includes("cancel"))).toBe(false);
  });
});

describe("api contracts", () => {
  it("valida template de mapeamento", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/mappings/validate",
      payload: {
        name: "Modelo Airbnb",
        platform: "airbnb",
        mapping: {
          data: "Data",
          codigoConfirmacao: "Código de Confirmação",
          unidade: "Unidade",
          valorBruto: "Ganhos Brutos",
          valorLiquido: "Valor Líquido",
          status: "Status",
          hospede: "Hóspede"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().valid).toBe(true);
    await app.close();
  });
});
