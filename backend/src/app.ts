import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import { ImportService } from "./modules/import/import.service.js";
import { MappingService } from "./modules/mapping/mapping.service.js";
import { ConsolidationService } from "./modules/consolidation/consolidation.service.js";
import { CalculationService } from "./modules/calculation/calculation.service.js";
import { ReviewService } from "./modules/review/review.service.js";
import { TemplateService } from "./modules/templates/template.service.js";
import { registerReportRoutes } from "./modules/report/export.controller.js";
import { registerV2Routes } from "./modules/v2/v2.routes.js";
import type { CanonicalField, ConsolidatedReservation, MappingTemplate, Platform } from "./shared/types/domain.js";

const reviewSchema = z.object({
  reservations: z.array(z.any()),
  patches: z.array(
    z.object({
      codigoConfirmacao: z.string(),
      field: z.enum(["data", "hospede", "unidade", "valorBruto", "valorLiquido", "status"]),
      value: z.union([z.string(), z.number()])
    })
  )
});

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(multipart);

  const importService = new ImportService();
  const mappingService = new MappingService();
  const consolidationService = new ConsolidationService();
  const calculationService = new CalculationService();
  const reviewService = new ReviewService();
  const templateService = new TemplateService();

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/v1/process/preview", async (request) => {
    const data = await request.file();
    if (!data) {
      throw new Error("Arquivo não enviado.");
    }

    const fields = data.fields as Record<string, { value: string }>;
    const platform = (fields.platform?.value ?? "airbnb") as Platform;
    const mapping = JSON.parse(fields.mapping?.value ?? "{}") as Partial<Record<CanonicalField, string>>;

    const buffer = await data.toBuffer();
    const rawRows = importService.parseFile(data.filename, buffer);
    const mappedRows = mappingService.mapRows(platform, rawRows, mapping);
    const filteredRows = consolidationService.filterCancelled(mappedRows);
    const consolidated = consolidationService.consolidate(filteredRows);
    const withRepasse = calculationService.applyRepasse(consolidated);

    return {
      totalRawRows: rawRows.length,
      totalActiveRows: filteredRows.length,
      totalConsolidated: withRepasse.length,
      reservations: withRepasse
    };
  });

  app.post("/v1/process/review", async (request) => {
    const payload = reviewSchema.parse(request.body);
    const reservations = payload.reservations as ConsolidatedReservation[];
    const updated = reviewService.applyPatches(reservations, payload.patches);
    return {
      totalConsolidated: updated.length,
      reservations: updated
    };
  });

  app.post("/v1/mappings/validate", async (request) => {
    const body = request.body as MappingTemplate;
    const validation = templateService.validate(body);
    if (validation.valid) {
      templateService.upsert(body);
    }
    return validation;
  });

  await registerReportRoutes(app);
  await registerV2Routes(app);
  return app;
}
