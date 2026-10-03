/**
 * All money math for the application.
 * Prices are in decimal (e.g., 375.00). We convert them to minor units (paisa) 
 * for calculation to avoid floating point errors, then format back.
 */

export function toMinor(value: number | string): number {
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function fromMinor(minor: number): number {
  return minor / 100;
}

export function lineAmountMinor(l: { quantity: number; rateMinor: number | null }): number {
  if (l.rateMinor === null || l.quantity <= 0) return 0;
  return l.quantity * l.rateMinor;
}

export function invoiceTotalMinor(lines: { quantity: number; rateMinor: number | null }[]): number {
  return lines.reduce((total, line) => total + lineAmountMinor(line), 0);
}

export function formatMoney(minor: number): string {
  const num = fromMinor(minor);
  // Show decimals only if they are not zero
  if (num % 1 === 0) {
    return num.toLocaleString('en-US');
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function describeQty(quantity: number, unit: 'dozen' | 'piece'): string {
  return unit === 'dozen' ? `${quantity} Dozen` : `${quantity} Pcs`;
}

export function describeRate(rate: number, unit: 'dozen' | 'piece'): string {
  return unit === 'dozen' ? `${rate} / Dozen` : `${rate} / Pc`;
}

export function validateLine(l: { quantity: number; rateMinor: number | null }): { ok: true } | { ok: false; code: 'PRICE_MISSING' | 'BAD_QTY' } {
  if (l.quantity <= 0) return { ok: false, code: 'BAD_QTY' };
  if (l.rateMinor === null) return { ok: false, code: 'PRICE_MISSING' };
  return { ok: true };
}
