const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatCurrencyBRL(value: number): string {
  if (!Number.isFinite(value)) return "R$ 0,00";
  return brlFormatter.format(value);
}

export function parseCurrencyBRL(input: string): number {
  const sanitized = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
}
