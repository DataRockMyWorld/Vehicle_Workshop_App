/** Format amount as Ghana Cedis (GHC) with thousand separators */
export function formatCurrency(amount: number | string | null | undefined): string {
  const n = Number(amount)
  if (amount == null || amount === '' || isNaN(n)) return '—'
  return `GHC ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
