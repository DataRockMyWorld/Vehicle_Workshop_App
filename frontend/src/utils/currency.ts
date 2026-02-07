/** Format amount as Ghana Cedis (GH₵) with thousand separators */
export function formatCurrency(amount: number | string | null | undefined): string {
  const n = Number(amount)
  if (amount == null || amount === '' || isNaN(n)) return '—'
  return `GH₵${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
