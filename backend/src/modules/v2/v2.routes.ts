import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ImportService } from "../import/import.service.js";
import { JobStoreService } from "./job-store.service.js";
import { ReconciliationService } from "./reconciliation.service.js";
import { BundleExportService } from "./reporting/bundle-export.service.js";
import { PdfTemplateV1Service } from "./reporting/pdf-template-v1.service.js";
import { XlsReportService } from "./reporting/xls-report.service.js";
import type { CanonicalV2Field, MappingV2, SourcePlatform } from "./types.js";

const REQUIRED_MAPPING_FIELDS: CanonicalV2Field[] = [
  "reservationCode",
  "startDate",
  "endDate",
  "platform",
  "nights",
  "bookingValue",
  "status",
  "unit"
];

const mapValidateSchema = z.object({
  fileId: z.string(),
  source: z.enum(["airbnb", "booking", "lodgify", "other"]),
  mapping: z.record(z.string(), z.string().min(1))
});

const reconcileApplySchema = z.object({
  resolutions: z.array(
    z.object({
      conflictId: z.string(),
      value: z.union([z.string(), z.number()])
    })
  ),
  patches: z.array(
    z.object({
      reservationKey: z.string(),
      field: z.enum([
        "consolidationKey",
        "reservationCode",
        "startDate",
        "endDate",
        "platform",
        "nights",
        "bookingValue",
        "status",
        "unit",
        "guestName"
      ]),
      value: z.union([z.string(), z.number()])
    })
  )
});

const exportMetadataSchema = z.object({
  ownerName: z.string().default("Proprietária"),
  ownerDocument: z.string().default("CPF não informado"),
  nomeRelatorio: z.string().default("01_2026"),
  studio: z.string().optional(),
  taxaPercentual: z.number().min(0).max(100).default(20)
});

const jobStore = new JobStoreService();
const importService = new ImportService();
const reconciliationService = new ReconciliationService();
const pdfService = new PdfTemplateV1Service();
const xlsService = new XlsReportService();
const bundleService = new BundleExportService();

export async function registerV2Routes(app: FastifyInstance): Promise<void> {
  app.post("/v2/jobs", async () => {
    const job = jobStore.createJob();
    return { jobId: job.jobId, expiresInSec: 3600 };
  });

  app.post("/v2/jobs/:jobId/files", async (request) => {
    const { jobId } = request.params as { jobId: string };
    const parts = request.parts();
    const sourceMapByName: Record<string, SourcePlatform> = {};
    const files: Array<{ name: string; source: SourcePlatform; buffer: Buffer }> = [];

    for await (const part of parts) {
      if (part.type === "file") {
        const source = sourceMapByName[part.filename] ?? "other";
        files.push({ name: part.filename, source, buffer: await part.toBuffer() });
      } else if (part.fieldname === "sourceMap" && typeof part.value === "string") {
        const parsed = JSON.parse(part.value) as Record<string, SourcePlatform>;
        Object.assign(sourceMapByName, parsed);
      }
    }

    const appended = jobStore.addFiles(jobId, files);
    return {
      accepted: appended.length,
      files: appended.map((item) => ({ fileId: item.fileId, name: item.name, source: item.source }))
    };
  });

  app.post("/v2/jobs/:jobId/mappings/validate", async (request) => {
    const { jobId } = request.params as { jobId: string };
    const body = mapValidateSchema.parse(request.body);
    const missingFields = REQUIRED_MAPPING_FIELDS.filter((field) => !body.mapping[field]);
    if (missingFields.length > 0) {
      return { valid: false, missingFields };
    }

    jobStore.saveMapping(jobId, {
      fileId: body.fileId,
      source: body.source,
      mapping: body.mapping as MappingV2["mapping"]
    });

    return { valid: true, missingFields: [] };
  });

  app.post("/v2/jobs/:jobId/reconcile/preview", async (request) => {
    const { jobId } = request.params as { jobId: string };
    const session = jobStore.getJob(jobId);
    const mappedRows = session.files.flatMap((file) => {
      const mapping = session.mappings[file.fileId];
      if (!mapping) {
        throw new Error(`Mapping ausente para arquivo ${file.name}.`);
      }
      const raw = importService.parseFile(file.name, file.buffer);
      return reconciliationService.mapRows(raw, mapping, file.fileId, file.name);
    });

    const reconciled = reconciliationService.reconcile(mappedRows);
    jobStore.savePreview(jobId, reconciled.reservations, reconciled.conflicts);

    return {
      summary: {
        files: session.files.length,
        rowsIn: mappedRows.length,
        reservationsOut: reconciled.reservations.length,
        conflicts: reconciled.conflicts.length
      },
      reservations: reconciled.reservations,
      conflicts: reconciled.conflicts
    };
  });

  app.post("/v2/jobs/:jobId/reconcile/apply", async (request) => {
    const { jobId } = request.params as { jobId: string };
    const payload = reconcileApplySchema.parse(request.body);
    const session = jobStore.getJob(jobId);
    if (!session.lastPreview) {
      throw new Error("Prévia ainda não gerada.");
    }

    const updated = reconciliationService.applyResolutions(session.lastPreview.reservations, payload.resolutions, payload.patches);
    jobStore.savePreview(jobId, updated, session.lastPreview.conflicts);
    return { reservations: updated, conflicts: session.lastPreview.conflicts };
  });

  app.post("/v2/jobs/:jobId/exports/pdf", async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const metadata = exportMetadataSchema.parse(request.body ?? {});
    const session = jobStore.getJob(jobId);
    if (!session.lastPreview) {
      throw new Error("Não há dados consolidados para exportar.");
    }

    const studio = metadata.studio ?? session.lastPreview.reservations[0]?.unit ?? "Unidade";
    const filteredReservations = metadata.studio
      ? session.lastPreview.reservations.filter((row) => row.unit === metadata.studio)
      : session.lastPreview.reservations;
    const payload = reconciliationService.toPdfReportPayload({
      studio,
      nomeRelatorio: metadata.nomeRelatorio,
      ownerName: metadata.ownerName,
      ownerDocument: metadata.ownerDocument,
      taxaPercentual: metadata.taxaPercentual,
      reservations: filteredReservations
    });
    const pdf = await pdfService.render(payload);
    reply.header("content-type", "application/pdf").header("content-disposition", 'attachment; filename="relatorio-v1.pdf"').send(pdf);
  });

  app.post("/v2/jobs/:jobId/exports/xls", async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const session = jobStore.getJob(jobId);
    if (!session.lastPreview) {
      throw new Error("Não há dados consolidados para exportar.");
    }
    const workbook = xlsService.buildWorkbook(session.lastPreview.reservations, session.lastPreview.conflicts);
    reply
      .header("content-type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .header("content-disposition", 'attachment; filename="relatorio-consolidado.xlsx"')
      .send(workbook);
  });

  app.post("/v2/jobs/:jobId/exports/bundle", async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const metadata = exportMetadataSchema.parse(request.body ?? {});
    const session = jobStore.getJob(jobId);
    if (!session.lastPreview) {
      throw new Error("Não há dados consolidados para exportar.");
    }

    const xls = xlsService.buildWorkbook(session.lastPreview.reservations, session.lastPreview.conflicts);
    const units = bundleService.splitByUnit(session.lastPreview.reservations);
    const pdfFiles: Array<{ name: string; content: Buffer }> = [];
    for (const unit of units) {
      const payload = reconciliationService.toPdfReportPayload({
        studio: unit.unitName,
        nomeRelatorio: metadata.nomeRelatorio,
        ownerName: metadata.ownerName,
        ownerDocument: metadata.ownerDocument,
        taxaPercentual: metadata.taxaPercentual,
        reservations: unit.rows
      });
      const pdf = await pdfService.render(payload);
      pdfFiles.push({ name: bundleService.createPdfFilename(payload), content: pdf });
    }
    const zip = await bundleService.zip([...pdfFiles, { name: "relatorio-consolidado.xlsx", content: xls }]);
    reply.header("content-type", "application/zip").header("content-disposition", 'attachment; filename="relatorios-v2.zip"').send(zip);
  });
}
