import { useMemo, useState } from 'react'
import { Home, Lock, MapPin, Pencil, Plus, Search, Trash2, Unlock, UserPlus } from 'lucide-react'
import { useDb } from '../../store/db'
import { useLive } from '../../store/live'
import { Badge, EmptyState, Field, Modal, PageHeader } from '../../components/ui'
import { fmtDate } from '../../utils/format'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/

function validateUser(u, { requirePassword, isUsernameTaken, exceptId }) {
  const errs = {}
  if (!u.fullName.trim()) errs.fullName = 'Nhập họ tên'
  if (!USERNAME_RE.test(u.username)) errs.username = '3–30 ký tự: chữ thường, số, dấu _ hoặc .'
  else if (isUsernameTaken(u.username, exceptId)) errs.username = 'Tên đăng nhập đã tồn tại'
  if (!EMAIL_RE.test(u.email)) errs.email = 'Email không hợp lệ'
  if ((requirePassword || u.password) && u.password.length < 6) errs.password = 'Ít nhất 6 ký tự'
  return errs
}

function UserFields({ value, onChange, errors, passwordHint }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  return (
    <div className="space-y-3">
      <Field label="Họ và tên" error={errors.fullName}>
        <input className="input" value={value.fullName} onChange={set('fullName')} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tên đăng nhập" error={errors.username}>
          <input className="input" value={value.username} onChange={(e) => onChange({ ...value, username: e.target.value.toLowerCase() })} />
        </Field>
        <Field label="Mật khẩu" hint={passwordHint} error={errors.password}>
          <input className="input" value={value.password} onChange={set('password')} />
        </Field>
      </div>
      <Field label="Email (nhận cảnh báo)" error={errors.email}>
        <input type="email" className="input" value={value.email} onChange={set('email')} />
      </Field>
    </div>
  )
}

const emptyUser = { fullName: '', username: '', email: '', password: '' }

export default function AdminUsers() {
  const homes = useDb((s) => s.homes)
  const users = useDb((s) => s.users)
  const db = useDb()
  const pushToast = useLive((s) => s.pushToast)
  const [q, setQ] = useState('')

  // modal: { type: 'addHome' | 'editHome' | 'addUser' | 'editUser' | 'deleteHome' | 'deleteUser', home?, user? }
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const close = () => {
    setModal(null)
    setErrors({})
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return homes
      .map((h) => ({ ...h, members: users.filter((u) => u.homeId === h.id) }))
      .filter(
        (h) =>
          !term ||
          h.name.toLowerCase().includes(term) ||
          h.members.some((m) => m.fullName.toLowerCase().includes(term) || m.username.includes(term) || m.email.includes(term)),
      )
  }, [homes, users, q])

  const open = (type, data = {}) => {
    setErrors({})
    setModal({ type, ...data })
    if (type === 'addHome') setForm({ name: '', address: '', user: { ...emptyUser } })
    if (type === 'editHome') setForm({ name: data.home.name, address: data.home.address })
    if (type === 'addUser') setForm({ user: { ...emptyUser } })
    if (type === 'editUser') setForm({ user: { ...data.user, password: '' } })
  }

  const submit = () => {
    const { type } = modal
    if (type === 'addHome' || type === 'editHome') {
      const errs = {}
      if (!form.name.trim()) errs.name = 'Nhập tên nhà'
      const userErrs = type === 'addHome' ? validateUser(form.user, { requirePassword: true, isUsernameTaken: db.isUsernameTaken }) : {}
      setErrors({ ...errs, ...userErrs })
      if (Object.keys(errs).length || Object.keys(userErrs).length) return
      if (type === 'addHome') {
        const homeId = db.addHome({ name: form.name.trim(), address: form.address.trim() })
        db.addUser({ ...form.user, fullName: form.user.fullName.trim(), email: form.user.email.trim(), homeId })
        pushToast(`Đã tạo "${form.name}" và tài khoản @${form.user.username}`, 'success')
      } else {
        db.updateHome(modal.home.id, { name: form.name.trim(), address: form.address.trim() })
        pushToast('Đã cập nhật thông tin nhà', 'success')
      }
    }

    if (type === 'addUser' || type === 'editUser') {
      const exceptId = modal.user?.id
      const errs = validateUser(form.user, { requirePassword: type === 'addUser', isUsernameTaken: db.isUsernameTaken, exceptId })
      setErrors(errs)
      if (Object.keys(errs).length) return
      const { fullName, username, email, password } = form.user
      const data = { fullName: fullName.trim(), username, email: email.trim() }
      if (type === 'addUser') {
        db.addUser({ ...data, password, homeId: modal.home.id })
        pushToast(`Đã thêm tài khoản @${username}`, 'success')
      } else {
        db.updateUser(exceptId, password ? { ...data, password } : data)
        pushToast(`Đã cập nhật tài khoản @${username}`, 'success')
      }
    }

    if (type === 'deleteHome') {
      db.deleteHome(modal.home.id)
      pushToast(`Đã xoá "${modal.home.name}"`, 'success')
    }
    if (type === 'deleteUser') {
      db.deleteUser(modal.user.id)
      pushToast(`Đã xoá tài khoản @${modal.user.username}`, 'success')
    }
    close()
  }

  const toggleLock = (u) => {
    const status = u.status === 'locked' ? 'active' : 'locked'
    db.updateUser(u.id, { status })
    pushToast(`${status === 'locked' ? 'Đã khoá' : 'Đã mở khoá'} tài khoản @${u.username}`, 'success')
  }

  const titles = {
    addHome: 'Thêm nhà mới',
    editHome: 'Sửa thông tin nhà',
    addUser: `Thêm thành viên – ${modal?.home?.name}`,
    editUser: 'Sửa tài khoản',
    deleteHome: 'Xoá nhà',
    deleteUser: 'Xoá tài khoản',
  }
  const isDelete = modal?.type?.startsWith('delete')

  return (
    <>
      <PageHeader
        title="Nhà & tài khoản"
        subtitle="Mỗi nhà có thể có nhiều tài khoản thành viên, dùng chung thiết bị và cài đặt"
        actions={<button className="btn-primary" onClick={() => open('addHome')}><Plus size={16} /> Thêm nhà</button>}
      />

      <div className="relative mb-4 sm:w-80">
        <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Tìm nhà, họ tên, tên đăng nhập…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!filtered.length && <div className="card"><EmptyState>Không tìm thấy kết quả.</EmptyState></div>}

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
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => open('addUser', { home: h })}><UserPlus size={14} /> Thêm thành viên</button>
                <button className="btn-secondary px-2 py-1.5" onClick={() => open('editHome', { home: h })} aria-label="Sửa nhà"><Pencil size={14} /></button>
                <button className="btn-secondary px-2 py-1.5 text-red-600" onClick={() => open('deleteHome', { home: h })} aria-label="Xoá nhà"><Trash2 size={14} /></button>
              </div>
            </div>

            {!h.members.length ? (
              <EmptyState>Chưa có tài khoản nào.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="px-4 py-2 font-medium">Họ tên</th>
                      <th className="px-4 py-2 font-medium">Tên đăng nhập</th>
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
                        <td className="px-4 py-2.5 text-slate-600">@{u.username}</td>
                        <td className="px-4 py-2.5 text-slate-600">{u.email}</td>
                        <td className="px-4 py-2.5 text-slate-500">{fmtDate(u.createdAt)}</td>
                        <td className="px-4 py-2.5">
                          {u.status === 'locked' ? <Badge tone="red">Đã khoá</Badge> : <Badge tone="green">Hoạt động</Badge>}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex justify-end gap-1">
                            <button className="cursor-pointer rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => open('editUser', { user: u })} title="Sửa"><Pencil size={16} /></button>
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
          <>
            <button className="btn-secondary" onClick={close}>Huỷ</button>
            <button className={isDelete ? 'btn-danger' : 'btn-primary'} onClick={submit}>{isDelete ? 'Xoá' : 'Lưu'}</button>
          </>
        }
      >
        {modal?.type === 'deleteHome' && (
          <p className="text-sm text-slate-600">
            Xoá <b>{modal.home.name}</b> sẽ xoá luôn <b>{users.filter((u) => u.homeId === modal.home.id).length} tài khoản</b>, lịch sử cảnh báo và nhật ký của nhà này. Không thể hoàn tác.
          </p>
        )}
        {modal?.type === 'deleteUser' && (
          <p className="text-sm text-slate-600">
            Xoá tài khoản <b>{modal.user.fullName}</b> (@{modal.user.username})? Không thể hoàn tác.
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
                <UserFields value={form.user} onChange={(user) => setForm({ ...form, user })} errors={errors} />
              </>
            )}
          </div>
        )}
        {(modal?.type === 'addUser' || modal?.type === 'editUser') && (
          <UserFields
            value={form.user}
            onChange={(user) => setForm({ ...form, user })}
            errors={errors}
            passwordHint={modal.type === 'editUser' ? 'Để trống nếu không đổi' : null}
          />
        )}
      </Modal>
    </>
  )
}
