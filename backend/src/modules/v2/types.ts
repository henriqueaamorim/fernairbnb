export type SourcePlatform = "airbnb" | "booking" | "lodgify" | "other";

export type CanonicalV2Field =
  | "reservationCode"
  | "startDate"
  | "endDate"
  | "platform"
  | "nights"
  | "bookingValue"
  | "status"
  | "unit"
  | "guestName";

export interface MappingV2 {
  fileId: string;
  source: SourcePlatform;
  mapping: Partial<Record<CanonicalV2Field, string>>;
}

export interface CanonicalReservation {
  reservationCode: string;
  startDate: string;
  endDate: string;
  platform: string;
  nights: number;
  bookingValue: number;
  status: string;
  unit: string;
  guestName: string;
  sourceRefs: Array<{
    fileId: string;
    fileName: string;
    rowNumber: number;
    sourcePlatform: SourcePlatform;
  }>;
}

export type ConflictSeverity = "warning" | "critical";

export interface ReservationConflict {
  conflictId: string;
  reservationKey: string;
  field: "startDate" | "endDate" | "nights" | "bookingValue" | "status" | "platform";
  candidates: Array<string | number>;
  suggestedValue: string | number;
  reason: string;
  severity: ConflictSeverity;
}

export interface ConsolidatedReservation {
  consolidationKey: string;
  reservationCode: string;
  startDate: string;
  endDate: string;
  platform: string;
  nights: number;
  bookingValue: number;
  status: string;
  unit: string;
  guestName: string;
  conflictFlags: string[];
  mergedFrom: CanonicalReservation["sourceRefs"];
}

export interface PdfReportOwner {
  nome: string;
  cpf: string;
}

export interface PdfReportReservation {
  inicio: string;
  fim: string;
  plataforma: string;
  noites: number;
  valor: number;
  status: string;
}

export interface PdfReportPayload {
  studio: string;
  nomeRelatorio: string;
  proprietario: PdfReportOwner;
  taxaPercentual: number;
  reservas: PdfReportReservation[];
  subtotal: number;
  totalNoites: number;
  taxaValor: number;
  valorLiquido: number;
}

export interface JobFile {
  fileId: string;
  name: string;
  source: SourcePlatform;
  buffer: Buffer;
}

export interface JobSession {
  jobId: string;
  createdAt: number;
  expiresAt: number;
  files: JobFile[];
  mappings: Record<string, MappingV2>;
  lastPreview: {
    reservations: ConsolidatedReservation[];
    conflicts: ReservationConflict[];
  } | null;
}
