import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Home, KeyRound, Loader2, Lock, Mail, MapPin, Pencil, Plus, RefreshCw, Search, Send, Trash2, Unlock, UserPlus } from 'lucide-react'
import { useAuth } from '../../store/auth'
import { useLive } from '../../store/live'
import { errorMessage } from '../../services/firebase'
import { createAccount, createHome, deleteAccount, deleteHome, sendResetPassword, updateAccount, updateHome } from '../../services/accounts'
import { accountEmail, sendMail } from '../../services/mail'
import { Badge, EmptyState, Field, Modal, PageHeader } from '../../components/ui'
import { fmtDate, fmtDateTime } from '../../utils/format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mật khẩu tạm 8 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/l/I)
const PW_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function genPassword(len = 8) {
  const buf = crypto.getRandomValues(new Uint32Array(len))
  return Array.from(buf, (n) => PW_CHARS[n % PW_CHARS.length]).join('')
}

function validateUser(u, { isNew }) {
  const errs = {}
  if (!u.fullName.trim()) errs.fullName = 'Nhập họ tên'
  if (isNew && !EMAIL_RE.test(u.email.trim())) errs.email = 'Email không hợp lệ'
  if (isNew && u.password.length < 6) errs.password = 'Ít nhất 6 ký tự'
  return errs
}

function UserFields({ value, onChange, errors, isNew, sendEmail, onSendEmailChange }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-3">
      <Field label="Họ và tên" error={errors.fullName}>
        <input className="input" value={value.fullName} onChange={set('fullName')} />
      </Field>
      <Field
        label="Email đăng nhập"
        hint={isNew ? 'Dùng để đăng nhập, nhận thông tin tài khoản và cảnh báo' : 'Không đổi được email của tài khoản đã cấp'}
        error={errors.email}
      >
        <input type="email" className="input" value={value.email} onChange={set('email')} disabled={!isNew} />
      </Field>
      {isNew && (
        <>
          <Field label="Mật khẩu" error={errors.password}>
            <div className="flex gap-2">
              <input className="input font-mono" value={value.password} onChange={set('password')} />
              <button
                type="button"
                className="btn-secondary shrink-0 px-2.5"
                onClick={() => onChange({ ...value, password: genPassword() })}
                title="Tạo mật khẩu ngẫu nhiên"
                aria-label="Tạo mật khẩu ngẫu nhiên"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </Field>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            <input type="checkbox" className="mt-0.5" checked={sendEmail} onChange={(e) => onSendEmailChange(e.target.checked)} />
            <span>Gửi email đăng nhập và mật khẩu qua Gmail tới email trên</span>
          </label>
        </>
      )}
    </div>
  )
}

const newUser = () => ({ fullName: '', email: '', password: genPassword() })

// Xem trước thư + trạng thái gửi
function MailPreview({ mail, status, sentAt, error, onRetry }) {
  return (
    <div className="space-y-3 text-sm">
      {status === 'sending' && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-700">
          <Loader2 size={18} className="animate-spin" /> Đang gửi email…
        </div>
      )}
      {status === 'sent' && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-700">
          <CheckCircle2 size={18} /> Đã gửi email lúc {fmtDateTime(sentAt)}
        </div>
      )}
      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3 text-red-700">
          <AlertCircle size={18} /> <span className="flex-1">Gửi email thất bại: {error}</span>
          <button className="btn-secondary px-3 py-1 text-xs" onClick={onRetry}><Send size={14} /> Gửi lại</button>
        </div>
      )}
      <div className="rounded-xl border border-slate-200">
        <div className="space-y-1 border-b border-slate-100 px-4 py-3">
          <p><span className="text-slate-500">Tới:</span> <b>{mail.to}</b></p>
          <p><span className="text-slate-500">Tiêu đề:</span> {mail.subject}</p>
        </div>
        <pre className="px-4 py-3 font-sans text-sm break-words whitespace-pre-wrap text-slate-700">{mail.body}</pre>
      </div>
    </div>
  )
}

export default function AdminUsers() {
  const homes = useAuth((s) => s.homes)
  const users = useAuth((s) => s.users)
  const pushToast = useLive((s) => s.pushToast)
  const [q, setQ] = useState('')

  // modal: { type: 'addHome' | 'editHome' | 'addUser' | 'editUser' | 'resetPassword' | 'deleteHome' | 'deleteUser' | 'sent', ... }
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const close = () => {
    if (busy) return
    setModal(null)
    setErrors({})
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...homes]
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .map((h) => ({ ...h, members: users.filter((u) => u.homeId === h.id) }))
      .filter(
        (h) =>
          !term ||
          h.name.toLowerCase().includes(term) ||
          h.members.some((m) => m.fullName.toLowerCase().includes(term) || m.email.toLowerCase().includes(term)),
      )
  }, [homes, users, q])

  const open = (type, data = {}) => {
    setErrors({})
    setModal({ type, ...data })
    if (type === 'addHome') setForm({ name: '', address: '', user: newUser(), sendEmail: true })
    if (type === 'editHome') setForm({ name: data.home.name, address: data.home.address ?? '' })
    if (type === 'addUser') setForm({ user: newUser(), sendEmail: true })
    if (type === 'editUser') setForm({ user: { ...data.user } })
  }

  // Gửi thư cấp tài khoản, hiện trạng thái trong modal
  const deliver = async (mail) => {
    setModal({ type: 'sent', mail, status: 'sending' })
    try {
      await sendMail(mail)
      setModal((m) => (m?.type === 'sent' ? { ...m, status: 'sent', sentAt: new Date().toISOString() } : m))
    } catch (e) {
      setModal((m) => (m?.type === 'sent' ? { ...m, status: 'error', error: e.message } : m))
    }
  }

  // Tạo tài khoản rồi (nếu chọn) gửi email
  const provision = async (data, home) => {
    const user = await createAccount({ ...data, fullName: data.fullName.trim(), homeId: home.id })
    pushToast(`Đã cấp tài khoản ${user.email}`, 'success')
    if (!form.sendEmail) return 'close'
    deliver(accountEmail({ user, home, password: data.password }))
    return 'mail'
  }

  // Kết quả: 'invalid' (giữ form để sửa), 'mail' (đã chuyển sang modal gửi thư), 'close'
  const run = async () => {
    const { type } = modal
    if (type === 'addHome' || type === 'editHome') {
      const errs = {}
      if (!form.name.trim()) errs.name = 'Nhập tên nhà'
      const userErrs = type === 'addHome' ? validateUser(form.user, { isNew: true }) : {}
      setErrors({ ...errs, ...userErrs })
      if (Object.keys(errs).length || Object.keys(userErrs).length) return 'invalid'
      const home = { name: form.name.trim(), address: form.address.trim() }
      if (type === 'editHome') {
        await updateHome(modal.home.id, home)
        pushToast('Đã cập nhật thông tin nhà', 'success')
        return 'close'
      }
      const id = await createHome(home)
      try {
        return await provision(form.user, { id, ...home })
      } catch (e) {
        // Không cấp được tài khoản (vd: trùng email) thì bỏ nhà vừa tạo
        await deleteHome(id)
        throw e
      }
    }

    if (type === 'addUser' || type === 'editUser') {
      const errs = validateUser(form.user, { isNew: type === 'addUser' })
      setErrors(errs)
      if (Object.keys(errs).length) return 'invalid'
      if (type === 'addUser') return provision(form.user, modal.home)
      await updateAccount(modal.user.id, { fullName: form.user.fullName.trim() })
      pushToast('Đã cập nhật tài khoản', 'success')
    }

    if (type === 'resetPassword') {
      await sendResetPassword(modal.user.email)
      pushToast(`Đã gửi email đặt lại mật khẩu tới ${modal.user.email}`, 'success')
    }
    if (type === 'deleteHome') {
      await deleteHome(modal.home.id)
      pushToast(`Đã xoá "${modal.home.name}"`, 'success')
    }
    if (type === 'deleteUser') {
      await deleteAccount(modal.user.id)
      pushToast(`Đã xoá tài khoản ${modal.user.email}`, 'success')
    }
    return 'close'
  }

  const submit = async () => {
    setBusy(true)
    try {
      if ((await run()) === 'close') setModal(null)
    } catch (e) {
      const msg = errorMessage(e)
      if (e?.code === 'auth/email-already-in-use' || e?.code === 'auth/invalid-email') setErrors({ email: msg })
      else pushToast(msg, 'error')
    }
    setBusy(false)
  }

  const toggleLock = async (u) => {
    const status = u.status === 'locked' ? 'active' : 'locked'
    try {
      await updateAccount(u.id, { status })
      pushToast(`${status === 'locked' ? 'Đã khoá' : 'Đã mở khoá'} tài khoản ${u.email}`, 'success')
    } catch (e) {
      pushToast(errorMessage(e), 'error')
    }
  }

  const titles = {
    addHome: 'Thêm nhà mới',
    editHome: 'Sửa thông tin nhà',
    addUser: `Cấp tài khoản – ${modal?.home?.name}`,
    editUser: 'Sửa tài khoản',
    resetPassword: 'Đặt lại mật khẩu',
    deleteHome: 'Xoá nhà',
    deleteUser: 'Xoá tài khoản',
    sent: 'Email thông tin tài khoản',
  }
  const isDelete = modal?.type?.startsWith('delete')
  const submitLabel = isDelete ? (
    'Xoá'
  ) : modal?.type === 'resetPassword' ? (
    <><Mail size={16} /> Gửi email đặt lại</>
  ) : modal?.type?.startsWith('add') ? (
    'Cấp tài khoản'
  ) : (
    'Lưu'
  )

  return (
    <>
      <PageHeader
        title="Nhà & tài khoản"
        subtitle="Mỗi nhà có thể có nhiều tài khoản thành viên, dùng chung thiết bị và cài đặt"
        actions={<button className="btn-primary" onClick={() => open('addHome')}><Plus size={16} /> Thêm nhà</button>}
      />

      <div className="relative mb-4 sm:w-80">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Tìm nhà, họ tên, email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!filtered.length && (
        <div className="card">
          <EmptyState>{homes.length ? 'Không tìm thấy kết quả.' : 'Chưa có nhà nào. Bấm "Thêm nhà" để tạo nhà và cấp tài khoản đầu tiên.'}</EmptyState>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((h) => (
          <div key={h.id} className="card p-0">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600"><Home size={20} /></div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {h.name} {h.hasHardware && <Badge tone="green">Đã gắn phần cứng</Badge>}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} /> {h.address || 'Chưa có địa chỉ'} · tạo {fmtDate(h.createdAt)} · {h.members.length} tài khoản
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => open('addUser', { home: h })}><UserPlus size={14} /> Cấp tài khoản</button>
                <button className="btn-secondary px-2 py-1.5" onClick={() => open('editHome', { home: h })} aria-label="Sửa nhà"><Pencil size={14} /></button>
                <button className="btn-secondary px-2 py-1.5 text-red-600" onClick={() => open('deleteHome', { home: h })} aria-label="Xoá nhà"><Trash2 size={14} /></button>
              </div>
            </div>

            {!h.members.length ? (
              <EmptyState>Chưa có tài khoản nào.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-2 font-medium">Họ tên</th>
                      <th className="px-4 py-2 font-medium">Email</th>
                      <th className="px-4 py-2 font-medium">Ngày tạo</th>
                      <th className="px-4 py-2 font-medium">Trạng thái</th>
                      <th className="px-4 py-2 text-right font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h.members.map((u) => (
                      <tr key={u.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium">{u.fullName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                        <td className="px-4 py-2.5 text-slate-500">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          {u.status === 'locked' ? <Badge tone="red">Đã khoá</Badge> : <Badge tone="green">Hoạt động</Badge>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => open('editUser', { user: u })} title="Sửa"><Pencil size={16} /></button>
                            <button className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => open('resetPassword', { user: u })} title="Đặt lại mật khẩu (gửi email)"><KeyRound size={16} /></button>
                            <button className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => toggleLock(u)} title={u.status === 'locked' ? 'Mở khoá' : 'Khoá'}>
                              {u.status === 'locked' ? <Unlock size={16} /> : <Lock size={16} />}
                            </button>
                            <button className="cursor-pointer rounded-lg p-1.5 text-red-500 hover:bg-red-50" onClick={() => open('deleteUser', { user: u })} title="Xoá"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal
        open={!!modal}
        onClose={close}
        title={modal ? titles[modal.type] : ''}
        size={modal?.type === 'addHome' ? 'lg' : 'md'}
        footer={
          modal?.type === 'sent' ? (
            <button className="btn-primary" onClick={close}>Đóng</button>
          ) : (
            <>
              <button className="btn-secondary" onClick={close} disabled={busy}>Huỷ</button>
              <button className={isDelete ? 'btn-danger' : 'btn-primary'} onClick={submit} disabled={busy}>
                {busy && <Loader2 size={16} className="animate-spin" />} {submitLabel}
              </button>
            </>
          )
        }
      >
        {modal?.type === 'sent' && <MailPreview {...modal} onRetry={() => deliver(modal.mail)} />}
        {modal?.type === 'resetPassword' && (
          <p className="text-sm text-slate-600">
            Gửi email đặt lại mật khẩu tới <b>{modal.user.email}</b>? Người dùng bấm vào đường link trong email để tự đặt mật khẩu mới (email do Firebase gửi, kiểm tra cả thư mục Spam).
          </p>
        )}
        {modal?.type === 'deleteHome' && (
          <p className="text-sm text-slate-600">
            Xoá <b>{modal.home.name}</b> sẽ xoá luôn <b>{users.filter((u) => u.homeId === modal.home.id).length} tài khoản</b> của nhà này. Không thể hoàn tác.
          </p>
        )}
        {modal?.type === 'deleteUser' && (
          <p className="text-sm text-slate-600">
            Xoá tài khoản <b>{modal.user.fullName}</b> ({modal.user.email})? Người này sẽ không đăng nhập được nữa. Không thể hoàn tác.
          </p>
        )}
        {(modal?.type === 'addHome' || modal?.type === 'editHome') && (
          <div className="space-y-3">
            <Field label="Tên nhà" error={errors.name}>
              <input className="input" placeholder="VD: Nhà anh Nam" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Địa chỉ">
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            {modal.type === 'addHome' && (
              <>
                <p className="pt-2 text-sm font-semibold text-slate-700">Tài khoản đầu tiên của nhà</p>
                <UserFields
                  value={form.user}
                  onChange={(user) => setForm({ ...form, user })}
                  errors={errors}
                  isNew
                  sendEmail={form.sendEmail}
                  onSendEmailChange={(sendEmail) => setForm({ ...form, sendEmail })}
                />
              </>
            )}
          </div>
        )}
        {(modal?.type === 'addUser' || modal?.type === 'editUser') && (
          <UserFields
            value={form.user}
            onChange={(user) => setForm({ ...form, user })}
            errors={errors}
            isNew={modal.type === 'addUser'}
            sendEmail={form.sendEmail}
            onSendEmailChange={(sendEmail) => setForm({ ...form, sendEmail })}
          />
        )}
      </Modal>
    </>
  )
}
