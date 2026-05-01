export type Platform = "airbnb" | "booking" | "lodgify" | "vrbo";

export interface ImportedSheet {
  file: File;
  platform: Platform;
}

export interface NormalizedReservation {
  unitRawName: string;
  unitId: string;
  platform: Platform;
  startDate: string;
  endDate: string;
  confirmationCode: string;
  nights: number;
  bookingValue: number;
  status: string;
  ownerName?: string;
  ownerCpf?: string;
}

export interface ConsolidatedReservation {
  key: string;
  unitId: string;
  unitName: string;
  platform: Platform;
  startDate: string;
  endDate: string;
  confirmationCode: string;
  nights: number;
  bookingValue: number;
  status: string;
}

export interface UnitReport {
  unitId: string;
  unitName: string;
  reservations: ConsolidatedReservation[];
  subtotal: number;
  habitatFeePercent: number;
  habitatFeeValue: number;
  netValue: number;
}
