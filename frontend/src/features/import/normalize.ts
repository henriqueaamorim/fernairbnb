import * as XLSX from "xlsx";
import type { ImportedSheet, NormalizedReservation, Platform } from "../../types/reporting";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeUnitId(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? digits : value.toLowerCase().replace(/\s+/g, "-");
}

function parseDate(value: unknown): string {
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    const month = String(date.m).padStart(2, "0");
    const day = String(date.d).padStart(2, "0");
    return `${date.y}-${month}-${day}`;
  }
  const raw = normalizeText(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const raw = normalizeText(value);
  if (!raw) return 0;

  const cleaned = raw.replace(/[^\d.,-]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;
  if (lastComma >= 0 && lastDot >= 0) {
    // Assume separador decimal como o ultimo simbolo encontrado.
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const decimalDigits = cleaned.length - lastDot - 1;
    normalized = decimalDigits === 2 ? cleaned : cleaned.replace(/\./g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapByPlatform(row: Record<string, unknown>, platform: Platform): NormalizedReservation | null {
  if (platform === "airbnb") {
    const status = normalizeText(row["Status"] ?? row["status"]);
    const unitName = normalizeText(row["Studio"] ?? row["Anúncio"] ?? row["Anuncio"]);
    if (!unitName || status.toLowerCase().includes("cancelado")) return null;

    return {
      unitRawName: unitName,
      unitId: normalizeUnitId(unitName),
      platform,
      startDate: parseDate(row["Data de início"] ?? row["Data de inicio"]),
      endDate: parseDate(row["Data de término"] ?? row["Data de termino"]),
      confirmationCode: normalizeText(row["Código de Confirmação"] ?? row["Codigo de Confirmacao"]),
      nights: asNumber(row["Noites"]),
      bookingValue: asNumber(row["Valor Líquido"] ?? row["Valor Liquido"]),
      status
    };
  }

  if (platform === "booking") {
    const tipo = normalizeText(row["Tipo"] ?? row["type"]);
    if (tipo.toLowerCase().includes("cancelado")) return null;
    const unitName = normalizeText(row["Studio"] ?? row["Anúncio"] ?? row["Anuncio"]);
    if (!unitName) return null;

    return {
      unitRawName: unitName,
      unitId: normalizeUnitId(unitName),
      platform,
      startDate: parseDate(row["Data de início"] ?? row["Data de inicio"]),
      endDate: parseDate(row["Data de término"] ?? row["Data de termino"]),
      confirmationCode: normalizeText(row["Reference number"] ?? row["Reference Number"]),
      nights: asNumber(row["Noites"]),
      bookingValue: asNumber(row["Valor Líquido"] ?? row["Valor Liquido"]),
      status: normalizeText(row["Status"] ?? "confirmado")
    };
  }

  const unitName = normalizeText(row["Studio"] ?? row["Property ID"] ?? row["Unidade"]);
  if (!unitName) return null;
  return {
    unitRawName: unitName,
    unitId: normalizeUnitId(unitName),
    platform,
    startDate: parseDate(row["Data de início"] ?? row["Check-in"] ?? row["start_date"]),
    endDate: parseDate(row["Data de término"] ?? row["Check-out"] ?? row["end_date"]),
    confirmationCode: normalizeText(row["Código de Confirmação"] ?? row["Reference number"] ?? row["confirmation_code"]),
    nights: asNumber(row["Noites"] ?? row["nights"]),
    bookingValue: asNumber(row["Valor Líquido"] ?? row["valor"]),
    status: normalizeText(row["Status"] ?? row["status"])
  };
}

export async function normalizeSheets(inputSheets: ImportedSheet[]): Promise<NormalizedReservation[]> {
  const allRows: NormalizedReservation[] = [];

  for (const item of inputSheets) {
    const buffer = await item.file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: "",
      raw: false
    });

    for (const row of rows) {
      const mapped = mapByPlatform(row, item.platform);
      if (mapped) allRows.push(mapped);
    }
  }

  return allRows;
}
