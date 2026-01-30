/** Format amount as Ghana Cedis (GH₵) */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '—'
  return `GH₵${Number(amount).toFixed(2)}`
}
