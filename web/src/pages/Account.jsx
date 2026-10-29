import { useState } from 'react'
import { KeyRound, Save } from 'lucide-react'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useCurrentHome, useCurrentUser } from '../store/auth'
import { useLive } from '../store/live'
import { auth, errorMessage } from '../services/firebase'
import { updateAccount } from '../services/accounts'
import { Field, PageHeader } from '../components/ui'
import { fmtDate } from '../utils/format'

export default function Account() {
  const user = useCurrentUser()
  const home = useCurrentHome()
  const pushToast = useLive((s) => s.pushToast)

  const [fullName, setFullName] = useState(user.fullName)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [busy, setBusy] = useState(null) // 'info' | 'pw'

  const saveInfo = async (e) => {
    e.preventDefault()
    if (!fullName.trim()) return
    setBusy('info')
    try {
      await updateAccount(user.id, { fullName: fullName.trim() })
      pushToast('Đã cập nhật thông tin', 'success')
    } catch (err) {
      pushToast(errorMessage(err), 'error')
    }
    setBusy(null)
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pw.next.length < 6) return setPwError('Mật khẩu mới phải có ít nhất 6 ký tự')
    if (pw.next !== pw.confirm) return setPwError('Mật khẩu xác nhận không khớp')
    setBusy('pw')
    try {
      // Firebase yêu cầu xác thực lại bằng mật khẩu hiện tại trước khi đổi
      await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, pw.current))
      await updatePassword(auth.currentUser, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwError('')
      pushToast('Đã đổi mật khẩu', 'success')
    } catch (err) {
      setPwError(err?.code === 'auth/invalid-credential' ? 'Mật khẩu hiện tại không đúng' : errorMessage(err))
    }
    setBusy(null)
  }

  return (
    <>
      <PageHeader title="Tài khoản" subtitle={`${user.email} · ${user.role === 'admin' ? 'Quản trị viên' : home?.name ?? ''} · tham gia ${fmtDate(user.createdAt)}`} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form onSubmit={saveInfo} className="card space-y-4">
          <h2 className="font-semibold">Thông tin cá nhân</h2>
          <Field label="Họ và tên">
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="Email đăng nhập" hint="Liên hệ quản trị viên nếu cần đổi email">
            <input type="email" className="input" value={user.email} disabled />
          </Field>
          <button type="submit" className="btn-primary" disabled={busy === 'info'}><Save size={16} /> Lưu</button>
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
          <button type="submit" className="btn-primary" disabled={busy === 'pw'}><KeyRound size={16} /> Đổi mật khẩu</button>
        </form>
      </div>
    </>
  )
}
