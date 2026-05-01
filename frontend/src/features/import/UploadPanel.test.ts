import { describe, expect, it } from "vitest";
import { mergeImportedSheets } from "./mergeImportedSheets";
import type { ImportedSheet } from "../../types/reporting";

function createFile(name: string, size: number, lastModified: number): File {
  return { name, size, lastModified } as File;
}

describe("mergeImportedSheets", () => {
  it("acumula selecoes sem substituir os arquivos anteriores", () => {
    const firstSelection = mergeImportedSheets([], [
      createFile("airbnb-1.csv", 100, 1),
      createFile("booking-1.csv", 110, 2)
    ]);

    const secondSelection = mergeImportedSheets(firstSelection, [
      createFile("lodgify-1.csv", 120, 3)
    ]);

    expect(secondSelection).toHaveLength(3);
    expect(secondSelection.map((row) => row.file.name)).toEqual([
      "airbnb-1.csv",
      "booking-1.csv",
      "lodgify-1.csv"
    ]);
  });

  it("respeita limite de 6 e ignora duplicados", () => {
    const currentRows: ImportedSheet[] = [
      { file: createFile("1.csv", 10, 1), platform: "airbnb" },
      { file: createFile("2.csv", 10, 2), platform: "airbnb" },
      { file: createFile("3.csv", 10, 3), platform: "airbnb" },
      { file: createFile("4.csv", 10, 4), platform: "airbnb" },
      { file: createFile("5.csv", 10, 5), platform: "airbnb" }
    ];

    const result = mergeImportedSheets(currentRows, [
      createFile("5.csv", 10, 5),
      createFile("6.csv", 10, 6),
      createFile("7.csv", 10, 7)
    ]);

    expect(result).toHaveLength(6);
    expect(result.map((row) => row.file.name)).toEqual(["1.csv", "2.csv", "3.csv", "4.csv", "5.csv", "6.csv"]);
  });
});
