import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, Home, UserPlus, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useDb } from '../../store/db'
import { useAuth } from '../../store/auth'
import { EmptyState, PageHeader, StatCard } from '../../components/ui'
import { RemindButton } from './AdminAlerts'
import { fmtDate, timeAgo } from '../../utils/format'

const monthKeyOf = (iso) => iso.slice(0, 7)

function lastMonths(n) {
  const out = []
  const d = new Date()
  d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, label: `T${m.getMonth() + 1}` })
  }
  return out
}

export default function AdminDashboard() {
  const homes = useAuth((s) => s.homes)
  const users = useAuth((s) => s.users)
  const alerts = useDb((s) => s.alerts)

  const stats = useMemo(() => {
    const accounts = users.filter((u) => u.role === 'user')
    const thisMonth = monthKeyOf(new Date().toISOString())
    const months = lastMonths(6)
    return {
      accounts,
      active: accounts.filter((u) => u.status === 'active').length,
      newThisMonth: accounts.filter((u) => monthKeyOf(u.createdAt) === thisMonth).length,
      alertsThisMonth: alerts.filter((a) => monthKeyOf(a.createdAt) === thisMonth).length,
      unack: alerts.filter((a) => !a.acknowledgedAt),
      chart: months.map((m) => ({
        label: m.label,
        'Tài khoản mới': accounts.filter((u) => monthKeyOf(u.createdAt) === m.key).length,
        'Cảnh báo gas': alerts.filter((a) => monthKeyOf(a.createdAt) === m.key).length,
      })),
      recent: [...accounts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    }
  }, [users, alerts])

  const homeName = (id) => homes.find((h) => h.id === id)?.name ?? '--'

  return (
    <>
      <PageHeader title="Tổng quan hệ thống" subtitle="Thống kê người dùng và cảnh báo của toàn bộ các nhà" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Home} label="Số nhà" value={homes.length} tone="blue" />
        <StatCard icon={Users} label="Tài khoản người dùng" value={stats.accounts.length} hint={`${stats.active} đang hoạt động`} tone="violet" />
        <StatCard icon={UserPlus} label="Tài khoản mới tháng này" value={stats.newThisMonth} tone="green" />
        <StatCard
          icon={BellRing}
          label="Cảnh báo chưa xác nhận"
          value={stats.unack.length}
          hint={`${stats.alertsThisMonth} cảnh báo trong tháng`}
          tone="amber"
          warn={stats.unack.length > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {['Tài khoản mới', 'Cảnh báo gas'].map((key, i) => (
          <div key={key} className="card">
            <h2 className="mb-4 font-semibold">{key} theo tháng</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.chart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey={key} fill={i === 0 ? '#3b82f6' : '#ef4444'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Cảnh báo cần nhắc nhở</h2>
            <Link to="/admin/canh-bao" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              Tất cả <ArrowRight size={14} />
            </Link>
          </div>
          {!stats.unack.length ? (
            <EmptyState>Không có cảnh báo nào chưa xác nhận.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.unack.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{homeName(a.homeId)}</p>
                    <p className="text-xs text-slate-500">
                      Gas {a.peakValue} ppm · {timeAgo(a.createdAt)}
                      {a.reminders.length > 0 && ` · đã nhắc ${a.reminders.length} lần`}
                    </p>
                  </div>
                  <RemindButton alert={a} small />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Tài khoản mới nhất</h2>
            <Link to="/admin/nguoi-dung" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
              Quản lý <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {stats.recent.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{u.email} · {homeName(u.homeId)}</p>
                </div>
                <span className="text-xs text-slate-400">{fmtDate(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
