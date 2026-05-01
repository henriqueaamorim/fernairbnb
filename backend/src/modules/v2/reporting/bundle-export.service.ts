import Archiver from "archiver";
import { PassThrough } from "stream";
import type { ConsolidatedReservation, PdfReportPayload } from "../types.js";

export class BundleExportService {
  splitByUnit(reservations: ConsolidatedReservation[]): Array<{ unitName: string; rows: ConsolidatedReservation[] }> {
    const grouped = new Map<string, ConsolidatedReservation[]>();
    for (const reservation of reservations) {
      const unitName = reservation.unit || "Unidade não informada";
      const list = grouped.get(unitName) ?? [];
      list.push(reservation);
      grouped.set(unitName, list);
    }

    return Array.from(grouped.entries()).map(([unitName, rows]) => ({
      unitName,
      rows: rows.sort((a, b) => a.startDate.localeCompare(b.startDate))
    }));
  }

  createPdfFilename(payload: PdfReportPayload): string {
    const studioSlug = payload.studio.replace(/\s+/g, "_");
    const periodoSlug = payload.nomeRelatorio.replace(/\s+/g, "_");
    return `${studioSlug}_${periodoSlug}.pdf`;
  }

  async zip(files: Array<{ name: string; content: Buffer }>): Promise<Buffer> {
    const stream = new PassThrough();
    const archive = Archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const output = new Promise<Buffer>((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
      archive.on("error", reject);
    });

    archive.pipe(stream);
    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }
    await archive.finalize();
    return output;
  }
}
