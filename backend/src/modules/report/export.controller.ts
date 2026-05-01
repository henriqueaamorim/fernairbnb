import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ConsolidatedReservation } from "../../shared/types/domain.js";
import { PdfService } from "./pdf.service.js";

const exportSchema = z.object({
  reservations: z.array(
    z.object({
      sourcePlatform: z.enum(["airbnb", "booking"]),
      codigoConfirmacao: z.string(),
      unidade: z.string(),
      data: z.string(),
      hospede: z.string(),
      status: z.string(),
      valorBruto: z.number(),
      valorLiquido: z.number(),
      repasseNewHabitat: z.number(),
      valorProprietario: z.number(),
      sourceRows: z.array(z.number())
    })
  )
});

export async function registerReportRoutes(app: FastifyInstance): Promise<void> {
  const pdfService = new PdfService();

  app.post("/v1/reports/export", async (request, reply) => {
    const payload = exportSchema.parse(request.body);
    const unitReports = pdfService.buildUnitReports(payload.reservations as ConsolidatedReservation[]);
    const zipBuffer = await pdfService.generateZip(unitReports);

    reply
      .header("content-type", "application/zip")
      .header("content-disposition", 'attachment; filename="relatorios.zip"')
      .send(zipBuffer);
  });
}
