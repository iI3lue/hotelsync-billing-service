/**
 * Tasas impositivas simplificadas por país (BL-4).
 *
 * Acepta códigos ISO y nombres (Property guarda nombres como
 * "Argentina"/"Colombia"). Alcance académico: tabla estática con las
 * tasas generales por país. La estructura (country + tax_rate guardados
 * en la factura) ya permite evolucionar a reglas fiscales completas
 * sin cambiar el modelo.
 */
const TAX_RATES: Record<string, number> = {
  CO: 0.19,
  COLOMBIA: 0.19,
  AR: 0.21,
  ARGENTINA: 0.21,
  CL: 0.19,
  CHILE: 0.19,
  MX: 0.16,
  MEXICO: 0.16,
  "MÉXICO": 0.16,
  ES: 0.21,
  "ESPAÑA": 0.21,
  ESPANA: 0.21,
  US: 0,
  USA: 0,
  "ESTADOS UNIDOS": 0,
};

export function taxRateForCountry(country: string | undefined): number {
  if (!country) return 0;
  const key = country
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TAX_RATES[key] ?? 0;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
