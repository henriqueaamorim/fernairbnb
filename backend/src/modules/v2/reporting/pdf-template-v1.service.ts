import PDFDocument from "pdfkit";
import { toMoney } from "../../../shared/utils/money.js";
import type { ConsolidatedReservation } from "../types.js";

export interface PdfTemplateV1Input {
  ownerName: string;
  ownerDocument: string;
  closingPeriod: string;
  unitName: string;
  reservations: ConsolidatedReservation[];
}

export class PdfTemplateV1Service {
  async render(input: PdfTemplateV1Input): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: "A4" });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const subtotal = toMoney(input.reservations.reduce((acc, row) => acc + row.bookingValue, 0));
      const fee = toMoney(subtotal * 0.2);
      const net = toMoney(subtotal - fee);

      doc.rect(36, 36, 54, 770).fill("#879681");
      doc.fillColor("#1f2937");
      doc.fontSize(18).text("NH", 50, 70);
      doc.fontSize(11).text("Proprietária:", 180, 72);
      doc.fontSize(10).text(input.ownerName, 180, 92);
      doc.text(`CPF: ${input.ownerDocument}`, 180, 108);

      doc.fontSize(16).text("Fechamento", 104, 170);
      doc.fontSize(11).text(input.closingPeriod, 104, 190);
      doc.fontSize(16).text("Unidade", 370, 170);
      doc.fontSize(11).text(input.unitName, 370, 190);

      let y = 225;
      doc.moveTo(104, y).lineTo(560, y).stroke("#4b5563");
      y += 6;
      doc.fontSize(10).font("Helvetica-Bold");
      doc.text("Data Reserva", 110, y);
      doc.text("Plataforma", 240, y);
      doc.text("N° Noites", 360, y);
      doc.text("Valor da Reserva", 450, y);
      y += 18;
      doc.moveTo(104, y).lineTo(560, y).stroke("#4b5563");
      doc.font("Helvetica");

      for (const row of input.reservations) {
        y += 10;
        const dateLabel = `${row.startDate || "--"} a ${row.endDate || "--"}`;
        doc.fontSize(10).fillColor("#111827").text(dateLabel, 110, y);
        doc.text(row.platform, 240, y, { width: 110 });
        doc.text(String(row.nights), 375, y);
        doc.text(`R$ ${row.bookingValue.toFixed(2)}`, 450, y);
        y += 10;
        if (y > 680) break;
      }

      y += 20;
      doc.moveTo(104, y).lineTo(560, y).stroke("#6b7280");
      y += 10;
      doc.fontSize(11).text("Subtotal", 104, y);
      doc.text(`R$ ${subtotal.toFixed(2)}`, 450, y);
      y += 22;
      doc.text("Taxa NEW HABITAT (20%)", 104, y);
      doc.text(`R$ ${fee.toFixed(2)}`, 450, y);
      y += 24;
      doc.font("Helvetica-Bold").text("Valor líquido a ser pago", 104, y);
      doc.rect(448, y - 4, 110, 24).fill("#879681");
      doc.fillColor("#111827").text(`R$ ${net.toFixed(2)}`, 455, y + 2);
      doc.end();
    });
  }
}
