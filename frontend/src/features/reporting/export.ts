import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { UnitReport } from "../../types/reporting";
import { formatDateBR } from "../../shared/format/date";
import { formatCurrencyBRL } from "../../shared/format/number";

export function buildUnitPdf(report: UnitReport, referenceMonth: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 50;

  doc.setFontSize(14);
  doc.text(report.unitName, 40, y);
  doc.text(referenceMonth, 420, y, { align: "right" });
  y += 24;

  doc.setFontSize(10);
  doc.text("Data Reserva", 40, y);
  doc.text("Plataforma", 190, y);
  doc.text("Noites", 300, y);
  doc.text("Valor", 360, y);
  y += 16;

  for (const reservation of report.reservations) {
    doc.text(`${formatDateBR(reservation.startDate)} a ${formatDateBR(reservation.endDate)}`, 40, y);
    doc.text(reservation.platform.toUpperCase(), 190, y);
    doc.text(String(reservation.nights), 300, y);
    doc.text(formatCurrencyBRL(reservation.bookingValue), 360, y);
    y += 14;
    if (y > 760) {
      doc.addPage();
      y = 50;
    }
  }

  y += 16;
  doc.text(`Subtotal: ${formatCurrencyBRL(report.subtotal)}`, 40, y);
  y += 14;
  doc.text(`Taxa NEW HABITAT (${report.habitatFeePercent}%): ${formatCurrencyBRL(report.habitatFeeValue)}`, 40, y);
  y += 14;
  doc.text(`Valor líquido a pagar: ${formatCurrencyBRL(report.netValue)}`, 40, y);

  return doc.output("blob");
}

export async function exportAllReportsZip(reports: UnitReport[], referenceMonth: string): Promise<Blob> {
  const zip = new JSZip();
  for (const report of reports) {
    const pdfBlob = buildUnitPdf(report, referenceMonth);
    zip.file(`${report.unitName.replace(/\s+/g, "_")}_${referenceMonth}.pdf`, pdfBlob);
  }
  return zip.generateAsync({ type: "blob" });
}
