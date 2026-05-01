import { describe, expect, it } from "vitest";
import { formatCurrencyBRL, parseCurrencyBRL } from "./number";

describe("number formatters", () => {
  it("formata moeda em pt-BR com milhares e 2 casas", () => {
    expect(formatCurrencyBRL(2235.25)).toBe("R$ 2.235,25");
  });

  it("converte string monetaria BR para numero", () => {
    expect(parseCurrencyBRL("R$ 2.235,25")).toBe(2235.25);
  });
});
