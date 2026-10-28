import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { useCurrentHome, useCurrentUser } from '../store/auth'
import { useDb } from '../store/db'
import { useLive } from '../store/live'
import { Field, PageHeader } from '../components/ui'
import { fmtDate } from '../utils/format'

export default function Account() {
  const user = useCurrentUser()
  const home = useCurrentHome()
  const updateUser = useDb((s) => s.updateUser)
  const pushToast = useLive((s) => s.pushToast)

  const [info, setInfo] = useState({ fullName: user.fullName, email: user.email })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const saveInfo = (e) => {
    e.preventDefault()
    if (!info.fullName.trim()) return
    updateUser(user.id, { fullName: info.fullName.trim(), email: info.email.trim() })
    pushToast('Đã cập nhật thông tin', 'success')
  }

  const changePassword = (e) => {
    e.preventDefault()
    if (pw.current !== user.password) return setPwError('Mật khẩu hiện tại không đúng')
    if (pw.next.length < 6) return setPwError('Mật khẩu mới phải có ít nhất 6 ký tự')
    if (pw.next !== pw.confirm) return setPwError('Mật khẩu xác nhận không khớp')
    updateUser(user.id, { password: pw.next })
    setPw({ current: '', next: '', confirm: '' })
    setPwError('')
    pushToast('Đã đổi mật khẩu', 'success')
  }

  return (
    <>
      <PageHeader title="Tài khoản" subtitle={`@${user.username} · ${user.role === 'admin' ? 'Quản trị viên' : home?.name} · tham gia ${fmtDate(user.createdAt)}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={saveInfo} className="card space-y-4">
          <h2 className="font-semibold">Thông tin cá nhân</h2>
          <Field label="Họ và tên">
            <input className="input" value={info.fullName} onChange={(e) => setInfo({ ...info, fullName: e.target.value })} required />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required />
          </Field>
          <button type="submit" className="btn-primary"><Save size={16} /> Lưu</button>
        </form>

        <form onSubmit={changePassword} className="card space-y-4">
          <h2 className="font-semibold">Đổi mật khẩu</h2>
          <Field label="Mật khẩu hiện tại">
            <input type="password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required />
          </Field>
          <Field label="Mật khẩu mới">
            <input type="password" className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required />
          </Field>
          <Field label="Nhập lại mật khẩu mới" error={pwError}>
            <input type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required />
          </Field>
          <button type="submit" className="btn-primary"><KeyRound size={16} /> Đổi mật khẩu</button>
        </form>
      </div>
    </>
  )
}
