import PDFDocument from "pdfkit";
import type { PdfReportPayload } from "../types.js";

export class PdfTemplateV1Service {
  async render(input: PdfReportPayload): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 22, bottom: 30, left: 0, right: 25 }
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      let pageNumber = 1;
      const contentLeft = 112;
      const contentRight = doc.page.width - 25;
      const contentWidth = contentRight - contentLeft;

      const drawPageFrame = () => {
        const pageHeight = doc.page.height;
        doc.rect(0, 0, doc.page.width, pageHeight).fill("#F5F5F5");
        doc.rect(0, 0, 92, pageHeight).fill("#7A8F7B");
        doc.fillColor("#F5F5F5").font("Helvetica").fontSize(24).text("N", 33, 40);
        doc.lineWidth(1).strokeColor("#F5F5F5").moveTo(50, 36).lineTo(50, 80).stroke();
        doc.fillColor("#F5F5F5").fontSize(24).text("H", 56, 40);

        doc.fillColor("#666666").fontSize(10).font("Helvetica");
        doc.text("New Habitat Home Solutions - CNPJ 36.651.956/0001-09", contentLeft, pageHeight - 24, {
          width: contentWidth,
          align: "center"
        });
        doc.text(String(pageNumber), contentRight - 8, pageHeight - 24, { width: 8, align: "right" });
      };

      drawPageFrame();
      doc.on("pageAdded", () => {
        pageNumber += 1;
        drawPageFrame();
      });

      doc.fillColor("#666666").font("Helvetica").fontSize(11);
      doc.text(input.studio, contentLeft, 24, { width: contentWidth / 2 });
      doc.text(input.nomeRelatorio, contentLeft + contentWidth / 2, 24, {
        width: contentWidth / 2,
        align: "right"
      });

      doc.font("Helvetica-Bold").fillColor("#000000").fontSize(11).text("Proprietária:", contentLeft, 50);
      doc.font("Helvetica").fontSize(11).text(input.proprietario.nome, contentLeft, 66);
      doc.fillColor("#666666").fontSize(10).text(`CPF: ${input.proprietario.cpf}`, contentLeft, 82);

      doc.strokeColor("#666666").lineWidth(1).moveTo(contentLeft, 122).lineTo(contentLeft, 162).stroke();
      doc.font("Helvetica-Bold").fillColor("#000000").fontSize(17).text("Fechamento", contentLeft + 10, 124);
      doc.font("Helvetica").fontSize(12).fillColor("#666666").text(input.nomeRelatorio, contentLeft + 10, 146);

      doc.strokeColor("#666666").lineWidth(1).moveTo(contentLeft + 240, 122).lineTo(contentLeft + 240, 162).stroke();
      doc.font("Helvetica-Bold").fillColor("#000000").fontSize(17).text("Unidade", contentLeft + 250, 124);
      doc.font("Helvetica").fontSize(12).fillColor("#666666").text(input.studio, contentLeft + 250, 146);

      let y = 188;
      doc.strokeColor("#cccccc").lineWidth(1).moveTo(contentLeft, y).lineTo(contentRight, y).stroke();
      y += 8;
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000000");
      doc.text("Data Reserva", contentLeft, y, { width: 160 });
      doc.text("Plataforma", contentLeft + 170, y, { width: 140, align: "center" });
      doc.text("Nº Noites", contentLeft + 320, y, { width: 70, align: "center" });
      doc.text("Valor da Reserva", contentLeft + 396, y, { width: 95, align: "right" });
      y += 20;
      doc.strokeColor("#cccccc").lineWidth(1).moveTo(contentLeft, y).lineTo(contentRight, y).stroke();

      const reservasOrdenadas = [...input.reservas].sort((a, b) => {
        const left = new Date(a.inicio).getTime();
        const right = new Date(b.inicio).getTime();
        if (Number.isNaN(left) && Number.isNaN(right)) return 0;
        if (Number.isNaN(left)) return 1;
        if (Number.isNaN(right)) return -1;
        return left - right;
      });

      for (const row of reservasOrdenadas) {
        y += 30;
        if (y > doc.page.height - 120) {
          doc.addPage();
          y = 36;
        }

        const isCancelled = row.status.toLowerCase().includes("cancel");
        const platformLabel = isCancelled
          ? row.plataforma.toLowerCase().startsWith("cancelado")
            ? row.plataforma
            : `Cancelado - ${row.plataforma}`
          : row.plataforma;
        const platformColor = isCancelled ? "#D32F2F" : "#000000";
        doc.font("Helvetica").fontSize(11).fillColor("#000000");
        doc.text(this.formatDateRange(row.inicio, row.fim), contentLeft, y, { width: 160 });
        doc.fillColor(platformColor).text(platformLabel, contentLeft + 170, y, { width: 140, align: "center" });
        doc.fillColor("#000000").text(String(row.noites), contentLeft + 320, y, { width: 70, align: "center" });
        doc.text(this.formatBrl(row.valor), contentLeft + 396, y, { width: 95, align: "right" });
      }

      y += 22;
      if (y > doc.page.height - 170) {
        doc.addPage();
        y = 42;
      }
      doc.strokeColor("#cccccc").lineWidth(1).moveTo(contentLeft, y).lineTo(contentRight, y).stroke();
      y += 12;
      doc.font("Helvetica").fontSize(11).fillColor("#000000");
      doc.text("Subtotal", contentLeft, y);
      doc.text(String(input.totalNoites), contentLeft + 320, y, { width: 70, align: "center" });
      doc.text(this.formatBrl(input.subtotal), contentLeft + 396, y, { width: 95, align: "right" });
      y += 18;
      doc.strokeColor("#7A8F7B").lineWidth(1).moveTo(contentLeft, y).lineTo(contentRight, y).stroke();
      y += 10;
      doc.fillColor("#666666").fontSize(10).text(`Taxa NEW HABITAT (${input.taxaPercentual}%)`, contentLeft, y);
      doc.fillColor("#000000").fontSize(11).text(this.formatBrl(input.taxaValor), contentLeft + 396, y, {
        width: 95,
        align: "right"
      });
      y += 22;
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#000000").text("Valor líquido a ser pago", contentLeft, y);
      doc.roundedRect(contentLeft + 330, y - 5, 161, 24, 4).fill("#7A8F7B");
      doc.fillColor("#000000").text(this.formatBrl(input.valorLiquido), contentLeft + 338, y + 2, {
        width: 145,
        align: "right"
      });

      doc.end();
    });
  }

  private formatDateRange(startDate: string, endDate: string): string {
    return `${this.toShortDateLabel(startDate)} a ${this.toShortDateLabel(endDate)}`;
  }

  private toDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "--/--";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }

  private toShortDateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "--/--";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  }

  private formatBrl(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
}
