// Tính tiền điện theo bậc thang EVN cho tổng lượng điện trong một tháng
export function calcEvnCost(kwh, tiers, vat) {
  let remaining = Math.max(0, kwh)
  let prevMax = 0
  const breakdown = []

  for (const [i, tier] of tiers.entries()) {
    const width = tier.max == null ? Infinity : tier.max - prevMax
    const used = Math.min(remaining, width)
    breakdown.push({ tier: i + 1, from: prevMax, to: tier.max, price: tier.price, kwh: used, cost: used * tier.price })
    remaining -= used
    prevMax = tier.max ?? prevMax
  }

  const subtotal = breakdown.reduce((s, b) => s + b.cost, 0)
  const vatAmount = (subtotal * vat) / 100
  return { breakdown, subtotal, vatAmount, total: subtotal + vatAmount }
}
