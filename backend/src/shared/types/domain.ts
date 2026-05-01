export type Platform = "airbnb" | "booking";

export type CanonicalField =
  | "data"
  | "codigoConfirmacao"
  | "unidade"
  | "valorBruto"
  | "valorLiquido"
  | "status"
  | "hospede";

export interface MappingTemplate {
  name: string;
  platform: Platform;
  mapping: Partial<Record<CanonicalField, string>>;
}

export interface RawRow {
  rowNumber: number;
  values: Record<string, unknown>;
}

export interface MappedRow {
  sourcePlatform: Platform;
  rowNumber: number;
  data: string;
  codigoConfirmacao: string;
  unidade: string;
  valorBruto: number;
  valorLiquido: number;
  status: string;
  hospede: string;
}

export interface ConsolidatedReservation {
  sourcePlatform: Platform;
  codigoConfirmacao: string;
  unidade: string;
  data: string;
  hospede: string;
  status: string;
  valorBruto: number;
  valorLiquido: number;
  repasseNewHabitat: number;
  valorProprietario: number;
  sourceRows: number[];
}

export interface ReviewPatch {
  codigoConfirmacao: string;
  field: keyof Pick<MappedRow, "data" | "hospede" | "unidade" | "valorBruto" | "valorLiquido" | "status">;
  value: string | number;
}

export interface UnitReport {
  unidade: string;
  reservations: ConsolidatedReservation[];
  totalBruto: number;
  totalLiquido: number;
  totalRepasse: number;
  totalProprietario: number;
}

export interface ProcessPreviewInput {
  platform: Platform;
  filename: string;
  buffer: Buffer;
  mapping: Partial<Record<CanonicalField, string>>;
}
