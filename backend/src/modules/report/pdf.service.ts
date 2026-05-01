import PDFDocument from "pdfkit";
import Archiver from "archiver";
import { PassThrough } from "stream";
import type { ConsolidatedReservation, UnitReport } from "../../shared/types/domain.js";
import { toMoney } from "../../shared/utils/money.js";

export class PdfService {
  buildUnitReports(reservations: ConsolidatedReservation[]): UnitReport[] {
    const grouped = new Map<string, ConsolidatedReservation[]>();
    for (const reservation of reservations) {
      const list = grouped.get(reservation.unidade) ?? [];
      list.push(reservation);
      grouped.set(reservation.unidade, list);
    }

    return Array.from(grouped.entries()).map(([unidade, rows]) => ({
      unidade,
      reservations: rows,
      totalBruto: toMoney(rows.reduce((acc, row) => acc + row.valorBruto, 0)),
      totalLiquido: toMoney(rows.reduce((acc, row) => acc + row.valorLiquido, 0)),
      totalRepasse: toMoney(rows.reduce((acc, row) => acc + row.repasseNewHabitat, 0)),
      totalProprietario: toMoney(rows.reduce((acc, row) => acc + row.valorProprietario, 0))
    }));
  }

  async generatePdf(report: UnitReport): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.fontSize(18).text(`Relatório da Unidade ${report.unidade}`);
      doc.moveDown();
      doc.fontSize(10).text("Modelo visual base: Sunrise 413");
      doc.moveDown();

      for (const reservation of report.reservations) {
        doc
          .fontSize(11)
          .text(
            `${reservation.codigoConfirmacao} | ${reservation.hospede} | Líquido: R$ ${reservation.valorLiquido.toFixed(2)} | Repasse: R$ ${reservation.repasseNewHabitat.toFixed(2)}`
          );
      }

      doc.moveDown();
      doc.text(`Total Bruto: R$ ${report.totalBruto.toFixed(2)}`);
      doc.text(`Total Líquido: R$ ${report.totalLiquido.toFixed(2)}`);
      doc.text(`Repasse NEW HABITAT (20%): R$ ${report.totalRepasse.toFixed(2)}`);
      doc.text(`Total Proprietário: R$ ${report.totalProprietario.toFixed(2)}`);

      doc.end();
    });
  }

  async generateZip(unitReports: UnitReport[]): Promise<Buffer> {
    const zipStream = new PassThrough();
    const archive = Archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    const outputPromise = new Promise<Buffer>((resolve, reject) => {
      zipStream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      zipStream.on("end", () => resolve(Buffer.concat(chunks)));
      zipStream.on("error", reject);
      archive.on("error", reject);
    });

    archive.pipe(zipStream);

    for (const report of unitReports) {
      const pdf = await this.generatePdf(report);
      archive.append(pdf, { name: `relatorio-${report.unidade}.pdf` });
    }

    await archive.finalize();
    return outputPromise;
  }
}
