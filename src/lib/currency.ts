const sekFormatter = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
});

/** Format a numeric value as Swedish currency, e.g. 1234.5 -> "1 234,50 kr". */
export function formatSEK(value: number): string {
  if (!Number.isFinite(value)) return sekFormatter.format(0);
  return sekFormatter.format(value);
}
