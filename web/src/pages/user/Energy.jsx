import { useMemo, useState } from 'react'
import { CalendarDays, Receipt, TrendingUp, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCurrentHome } from '../../store/auth'
import { useEnergy } from '../../hooks/useEnergy'
import { sumByMonth } from '../../utils/energy'
import { calcEvnCost } from '../../utils/evn'
import { PageHeader, StatCard, Tabs } from '../../components/ui'
import { fmtEnergy, fmtNumber, fmtVnd } from '../../utils/format'

const PERIODS = [
  { value: 'day', label: 'Hôm nay' },
  { value: 'week', label: '7 ngày' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year', label: '12 tháng' },
]

const shortDate = (date) => new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })

export default function Energy() {
  const home = useCurrentHome()
  const { history, todayWh, monthDays, monthWh, monthCost, evn } = useEnergy(home.id)
  const [period, setPeriod] = useState('day')

  const months = useMemo(() => sumByMonth(history.days).slice(-12), [history])

  const { chartData, unit } = useMemo(() => {
    const toRow = (label, living, kitchen, div = 1) => ({
      label,
      'Phòng khách': +(living / div).toFixed(div === 1 ? 1 : 3),
      'Phòng bếp': +(kitchen / div).toFixed(div === 1 ? 1 : 3),
    })
    switch (period) {
      case 'day':
        return { unit: 'Wh', chartData: history.today.map((h) => toRow(`${h.hour}h`, h.living, h.kitchen)) }
      case 'week':
        return { unit: 'Wh', chartData: history.days.slice(-7).map((d) => toRow(shortDate(d.date), d.living, d.kitchen)) }
      case 'month':
        return { unit: 'Wh', chartData: monthDays.map((d) => toRow(shortDate(d.date), d.living, d.kitchen)) }
      default:
        return { unit: 'kWh', chartData: months.map((m) => toRow(`T${+m.month.slice(5)}/${m.month.slice(2, 4)}`, m.living, m.kitchen, 1000)) }
    }
  }, [period, history, monthDays, months])

  const roomTotals = chartData.reduce(
    (acc, r) => ({ living: acc.living + r['Phòng khách'], kitchen: acc.kitchen + r['Phòng bếp'] }),
    { living: 0, kitchen: 0 },
  )
  const periodTotal = roomTotals.living + roomTotals.kitchen

  return (
    <>
      <PageHeader title="Điện năng" subtitle="Thống kê điện năng tiêu thụ của đèn và quạt, tính tiền theo bảng giá bậc thang EVN" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Zap} label="Hôm nay" value={fmtEnergy(todayWh)} tone="amber" />
        <StatCard icon={CalendarDays} label="Tháng này" value={fmtEnergy(monthWh)} hint={`${monthDays.length} ngày`} tone="blue" />
        <StatCard icon={TrendingUp} label="Trung bình mỗi ngày" value={fmtEnergy(monthWh / monthDays.length)} tone="violet" />
        <StatCard icon={Receipt} label="Tiền điện tháng này" value={fmtVnd(monthCost.total)} hint={`Đã gồm VAT ${evn.vat}%`} tone="green" />
      </div>

      <div className="card mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Biểu đồ tiêu thụ ({unit})</h2>
          <Tabs value={period} onChange={setPeriod} options={PERIODS} />
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} minTickGap={8} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip formatter={(v) => `${v} ${unit}`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Phòng khách" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Phòng bếp" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { name: 'Phòng khách', value: roomTotals.living, color: 'bg-blue-500' },
            { name: 'Phòng bếp', value: roomTotals.kitchen, color: 'bg-amber-500' },
          ].map((r) => (
            <div key={r.name} className="rounded-xl bg-slate-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">{r.name}</span>
                <span className="font-semibold">
                  {fmtNumber(r.value, unit === 'kWh' ? 3 : 1)} {unit} ({periodTotal ? Math.round((r.value / periodTotal) * 100) : 0}%)
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200">
                <div className={`h-2 rounded-full ${r.color}`} style={{ width: `${periodTotal ? (r.value / periodTotal) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">Mỗi phòng có một cảm biến INA219 đo tổng điện năng của đèn và quạt trong phòng.</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold">Chi tiết tiền điện tháng này (bậc thang EVN)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2 font-medium">Bậc</th>
                  <th className="py-2 pr-2 font-medium">Mức (kWh)</th>
                  <th className="py-2 pr-2 text-right font-medium">Đơn giá</th>
                  <th className="py-2 pr-2 text-right font-medium">Sử dụng</th>
                  <th className="py-2 text-right font-medium">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {monthCost.breakdown.map((b) => (
                  <tr key={b.tier} className={`border-b border-slate-100 ${b.kwh > 0 ? '' : 'text-slate-400'}`}>
                    <td className="py-2 pr-2">Bậc {b.tier}</td>
                    <td className="py-2 pr-2">{b.to == null ? `Từ ${b.from + 1} trở lên` : `${b.from === 0 ? 0 : b.from + 1} – ${b.to}`}</td>
                    <td className="py-2 pr-2 text-right">{fmtNumber(b.price)}</td>
                    <td className="py-2 pr-2 text-right">{fmtNumber(b.kwh, 3)}</td>
                    <td className="py-2 text-right">{fmtVnd(b.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="text-slate-700">
                <tr>
                  <td colSpan={4} className="pt-3 text-right">Cộng</td>
                  <td className="pt-3 text-right">{fmtVnd(monthCost.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="text-right">VAT {evn.vat}%</td>
                  <td className="text-right">{fmtVnd(monthCost.vatAmount)}</td>
                </tr>
                <tr className="font-semibold text-slate-900">
                  <td colSpan={4} className="pt-1 text-right">Tổng cộng</td>
                  <td className="pt-1 text-right">{fmtVnd(monthCost.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Lịch sử theo tháng</h2>
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 font-medium">Tháng</th>
                  <th className="py-2 text-right font-medium">Điện năng</th>
                  <th className="py-2 text-right font-medium">Tiền điện</th>
                </tr>
              </thead>
              <tbody>
                {[...months].reverse().map((m) => {
                  const wh = m.living + m.kitchen
                  return (
                    <tr key={m.month} className="border-b border-slate-100">
                      <td className="py-2">Tháng {+m.month.slice(5)}/{m.month.slice(0, 4)}</td>
                      <td className="py-2 text-right">{fmtEnergy(wh)}</td>
                      <td className="py-2 text-right">{fmtVnd(calcEvnCost(wh / 1000, evn.tiers, evn.vat).total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
