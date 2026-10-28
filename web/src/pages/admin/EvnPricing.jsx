import { useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { useDb } from '../../store/db'
import { useLive } from '../../store/live'
import { DEFAULT_EVN_TIERS, DEFAULT_VAT } from '../../data/constants'
import { calcEvnCost } from '../../utils/evn'
import { Field, PageHeader } from '../../components/ui'
import { fmtNumber, fmtVnd } from '../../utils/format'

export default function EvnPricing() {
  const evn = useDb((s) => s.evn)
  const setEvn = useDb((s) => s.setEvn)
  const pushToast = useLive((s) => s.pushToast)

  const [tiers, setTiers] = useState(() => evn.tiers.map((t) => ({ max: t.max ?? '', price: t.price })))
  const [vat, setVat] = useState(evn.vat)
  const [error, setError] = useState('')
  const [testKwh, setTestKwh] = useState(150)

  const parsed = tiers.map((t, i) => ({ max: i === tiers.length - 1 ? null : Number(t.max), price: Number(t.price) }))
  const preview = calcEvnCost(Number(testKwh) || 0, parsed, Number(vat) || 0)

  const updateTier = (i, key, value) => setTiers(tiers.map((t, j) => (i === j ? { ...t, [key]: value } : t)))

  const save = () => {
    for (let i = 0; i < parsed.length; i++) {
      if (!(parsed[i].price > 0)) return setError(`Đơn giá bậc ${i + 1} không hợp lệ`)
      if (parsed[i].max !== null) {
        const prev = i === 0 ? 0 : parsed[i - 1].max
        if (!(parsed[i].max > prev)) return setError(`Mốc kWh của bậc ${i + 1} phải lớn hơn bậc trước`)
      }
    }
    if (!(Number(vat) >= 0 && Number(vat) <= 100)) return setError('VAT không hợp lệ')
    setError('')
    setEvn({ tiers: parsed, vat: Number(vat) })
    pushToast('Đã cập nhật bảng giá điện cho toàn hệ thống', 'success')
  }

  const reset = () => {
    setTiers(DEFAULT_EVN_TIERS.map((t) => ({ max: t.max ?? '', price: t.price })))
    setVat(DEFAULT_VAT)
  }

  return (
    <>
      <PageHeader
        title="Bảng giá điện EVN"
        subtitle="Giá điện sinh hoạt bậc thang, áp dụng để tính tiền điện cho mọi nhà"
        actions={
          <>
            <button className="btn-secondary" onClick={reset}><RotateCcw size={16} /> Giá mặc định</button>
            <button className="btn-primary" onClick={save}><Save size={16} /> Lưu</button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">Bậc</th>
                  <th className="py-2 pr-3 font-medium">Từ (kWh)</th>
                  <th className="py-2 pr-3 font-medium">Đến (kWh)</th>
                  <th className="py-2 font-medium">Đơn giá (đ/kWh)</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const from = i === 0 ? 0 : Number(tiers[i - 1].max) + 1
                  const last = i === tiers.length - 1
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-medium">Bậc {i + 1}</td>
                      <td className="py-2 pr-3 text-slate-500">{from}</td>
                      <td className="py-2 pr-3">
                        {last ? (
                          <span className="text-slate-500">trở lên</span>
                        ) : (
                          <input type="number" className="input w-28" value={t.max} onChange={(e) => updateTier(i, 'max', e.target.value)} />
                        )}
                      </td>
                      <td className="py-2">
                        <input type="number" className="input w-32" value={t.price} onChange={(e) => updateTier(i, 'price', e.target.value)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 max-w-40">
            <Field label="Thuế VAT (%)">
              <input type="number" className="input" value={vat} onChange={(e) => setVat(e.target.value)} />
            </Field>
          </div>
          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <p className="mt-3 text-xs text-slate-400">Giá mặc định theo biểu giá điện sinh hoạt EVN hiện hành. Vui lòng đối chiếu với thông báo mới nhất của EVN khi có điều chỉnh.</p>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold">Tính thử</h2>
          <Field label="Điện năng trong tháng (kWh)">
            <input type="number" className="input" value={testKwh} onChange={(e) => setTestKwh(e.target.value)} />
          </Field>
          <ul className="space-y-1 text-sm">
            {preview.breakdown
              .filter((b) => b.kwh > 0)
              .map((b) => (
                <li key={b.tier} className="flex justify-between text-slate-600">
                  <span>Bậc {b.tier}: {fmtNumber(b.kwh, 1)} × {fmtNumber(b.price)}</span>
                  <span>{fmtVnd(b.cost)}</span>
                </li>
              ))}
            <li className="flex justify-between border-t border-slate-100 pt-1 text-slate-600">
              <span>VAT</span>
              <span>{fmtVnd(preview.vatAmount)}</span>
            </li>
            <li className="flex justify-between text-base font-semibold">
              <span>Tổng</span>
              <span>{fmtVnd(preview.total)}</span>
            </li>
          </ul>
        </div>
      </div>
    </>
  )
}
