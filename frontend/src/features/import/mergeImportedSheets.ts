import type { ImportedSheet } from "../../types/reporting";

const MAX_FILES = 6;

function fileFingerprint(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

export function mergeImportedSheets(currentRows: ImportedSheet[], incomingFiles: File[]): ImportedSheet[] {
  const existingByFingerprint = new Set(currentRows.map((row) => fileFingerprint(row.file)));
  const nextRows = [...currentRows];

  for (const file of incomingFiles) {
    const fingerprint = fileFingerprint(file);
    if (existingByFingerprint.has(fingerprint)) {
      continue;
    }
    if (nextRows.length >= MAX_FILES) {
      break;
    }
    nextRows.push({ file, platform: "airbnb" });
    existingByFingerprint.add(fingerprint);
  }

  return nextRows;
}

export { MAX_FILES };
