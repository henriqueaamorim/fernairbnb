import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { UnitReport } from "../../types/reporting";
import { formatDateBR } from "../../shared/format/date";
import { formatCurrencyBRL } from "../../shared/format/number";

export interface PdfExportMetadata {
  studio: string;
  nomeRelatorio: string;
  ownerName?: string;
  ownerCpf?: string;
}

export function buildUnitPdf(report: UnitReport, metadata: PdfExportMetadata): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 50;

  doc.setFontSize(14);
  doc.text(metadata.studio, 40, y);
  doc.text(metadata.nomeRelatorio, 420, y, { align: "right" });
  y += 24;

  if (metadata.ownerName || metadata.ownerCpf) {
    doc.setFontSize(10);
    doc.text(`Proprietária: ${metadata.ownerName ?? "-"}`, 40, y);
    y += 14;
    doc.text(`CPF: ${metadata.ownerCpf ?? "-"}`, 40, y);
    y += 18;
  }

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

export async function exportAllReportsZip(
  reports: UnitReport[],
  metadata: Omit<PdfExportMetadata, "studio">
): Promise<Blob> {
  const zip = new JSZip();
  for (const report of reports) {
    const currentMetadata: PdfExportMetadata = {
      ...metadata,
      studio: report.unitName
    };
    const pdfBlob = buildUnitPdf(report, currentMetadata);
    const pdfBuffer = await pdfBlob.arrayBuffer();
    zip.file(`${report.unitName.replace(/\s+/g, "_")}_${metadata.nomeRelatorio}.pdf`, pdfBuffer);
  }
  return zip.generateAsync({ type: "blob" });
}
