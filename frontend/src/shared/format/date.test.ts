import { describe, expect, it } from "vitest";
import { formatDateBR } from "./date";

describe("date formatter", () => {
  it("converte yyyy-mm-dd para dd/mm/aaaa", () => {
    expect(formatDateBR("2026-02-14")).toBe("14/02/2026");
  });

  it("mantem dd/mm/aaaa inalterado", () => {
    expect(formatDateBR("14/02/2026")).toBe("14/02/2026");
  });
});
