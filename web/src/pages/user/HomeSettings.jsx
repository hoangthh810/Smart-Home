import { useState } from 'react'
import { Mail, Plus, Save, X } from 'lucide-react'
import { useCurrentHome } from '../../store/auth'
import { useDb } from '../../store/db'
import { useLive } from '../../store/live'
import { Field, PageHeader } from '../../components/ui'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function HomeSettings() {
  const home = useCurrentHome()
  const settings = useDb((s) => s.settings[home.id])
  const updateSettings = useDb((s) => s.updateSettings)
  const allUsers = useDb((s) => s.users)
  const members = allUsers.filter((u) => u.homeId === home.id)
  const pushToast = useLive((s) => s.pushToast)

  const [form, setForm] = useState(() => ({ ...settings }))
  const [newEmail, setNewEmail] = useState('')
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) return setErrors({ ...errors, email: 'Email không hợp lệ' })
    if (form.alertEmails.includes(email)) return setErrors({ ...errors, email: 'Email đã có trong danh sách' })
    setForm({ ...form, alertEmails: [...form.alertEmails, email] })
    setNewEmail('')
    setErrors({ ...errors, email: null })
  }

  const save = (e) => {
    e.preventDefault()
    const num = (k) => Number(form[k])
    const errs = {}
    if (!(num('gasThreshold') >= 100 && num('gasThreshold') <= 10000)) errs.gasThreshold = 'Nhập giá trị từ 100 đến 10000 ppm'
    if (!(num('offDelayMin') >= 1 && num('offDelayMin') <= 120)) errs.offDelayMin = 'Nhập từ 1 đến 120 phút'
    if (!(num('tempHigh') > 0 && num('tempHigh') < 80)) errs.tempHigh = 'Giá trị không hợp lệ'
    if (!(num('humidityHigh') > 0 && num('humidityHigh') <= 100)) errs.humidityHigh = 'Nhập từ 1 đến 100%'
    if (!(num('luxLow') >= 0)) errs.luxLow = 'Giá trị không hợp lệ'
    if (!form.alertEmails.length) errs.email = 'Cần ít nhất 1 email nhận cảnh báo'
    setErrors(errs)
    if (Object.values(errs).some(Boolean)) return

    updateSettings(home.id, {
      gasThreshold: num('gasThreshold'),
      offDelayMin: num('offDelayMin'),
      tempHigh: num('tempHigh'),
      humidityHigh: num('humidityHigh'),
      luxLow: num('luxLow'),
      alertEmails: form.alertEmails,
    })
    pushToast('Đã lưu cài đặt', 'success')
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Cài đặt nhà"
        subtitle={home.name}
        actions={<button type="submit" className="btn-primary"><Save size={16} /> Lưu thay đổi</button>}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold">Cảnh báo & tự động</h2>
            <p className="text-sm text-slate-500">Các thông số ảnh hưởng tới cách hệ thống tự xử lý.</p>
          </div>
          <Field label="Ngưỡng cảnh báo khí gas (ppm)" hint="Vượt ngưỡng: còi kêu, gửi email, hiện cảnh báo trên web" error={errors.gasThreshold}>
            <input type="number" className="input" value={form.gasThreshold} onChange={set('gasThreshold')} />
          </Field>
          <Field label="Tự tắt đèn & quạt khi không có người sau (phút)" hint="Áp dụng cho các phòng đang ở chế độ Tự động" error={errors.offDelayMin}>
            <input type="number" className="input" value={form.offDelayMin} onChange={set('offDelayMin')} />
          </Field>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold">Ngưỡng hiển thị</h2>
            <p className="text-sm text-slate-500">Chỉ dùng để làm nổi bật chỉ số trên web, không ảnh hưởng tới chế độ Tự động.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Nhiệt độ cao (°C)" error={errors.tempHigh}>
              <input type="number" step="0.5" className="input" value={form.tempHigh} onChange={set('tempHigh')} />
            </Field>
            <Field label="Độ ẩm cao (%)" error={errors.humidityHigh}>
              <input type="number" className="input" value={form.humidityHigh} onChange={set('humidityHigh')} />
            </Field>
            <Field label="Ánh sáng yếu (lux)" error={errors.luxLow}>
              <input type="number" className="input" value={form.luxLow} onChange={set('luxLow')} />
            </Field>
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="font-semibold">Email nhận cảnh báo</h2>
            <p className="text-sm text-slate-500">Khi phát hiện khí gas, hệ thống gửi email tới tất cả địa chỉ dưới đây.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.alertEmails.map((email) => (
              <span key={email} className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pr-1.5 pl-3 text-sm text-blue-700">
                <Mail size={14} /> {email}
                <button
                  type="button"
                  onClick={() => setForm({ ...form, alertEmails: form.alertEmails.filter((x) => x !== email) })}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-blue-100"
                  aria-label={`Xoá ${email}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
          <Field error={errors.email}>
            <div className="flex gap-2">
              <input
                type="email"
                className="input"
                placeholder="vidu@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addEmail()
                  }
                }}
              />
              <button type="button" className="btn-secondary shrink-0" onClick={addEmail}>
                <Plus size={16} /> Thêm
              </button>
            </div>
          </Field>
        </div>

        <div className="card">
          <h2 className="mb-1 font-semibold">Thành viên trong nhà</h2>
          <p className="mb-4 text-sm text-slate-500">Tài khoản do quản trị viên cấp. Liên hệ quản trị viên để thêm thành viên.</p>
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {m.fullName.split(' ').at(-1)[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.fullName}</p>
                  <p className="truncate text-xs text-slate-500">@{m.username} · {m.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </form>
  )
}
