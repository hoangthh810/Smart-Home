import { useMemo, useState } from 'react'
import { BellRing, Search } from 'lucide-react'
import { useAuth, useCurrentUser } from '../../store/auth'
import { useDb } from '../../store/db'
import { useLive } from '../../store/live'
import { ROOMS } from '../../data/constants'
import { EmptyState, PageHeader, Tabs } from '../../components/ui'
import { AlertStatus } from '../user/History'
import { fmtDateTime, timeAgo } from '../../utils/format'

// Nhắc nhở người dùng: gửi lại email + hiện lại popup trên web của user
export function useRemind() {
  const admin = useCurrentUser()
  const remindAlert = useDb((s) => s.remindAlert)
  const pushToast = useLive((s) => s.pushToast)
  return (alert) => {
    remindAlert(alert.id, admin.fullName)
    pushToast(`Đã gửi lại email nhắc nhở tới ${alert.emailsSentTo.join(', ') || 'thành viên trong nhà'} và hiển thị cảnh báo trên web của họ`, 'success')
  }
}

export function RemindButton({ alert, small }) {
  const remind = useRemind()
  return (
    <button className={`btn-danger ${small ? 'px-3 py-1.5 text-xs' : ''}`} onClick={() => remind(alert)} disabled={!!alert.acknowledgedAt}>
      <BellRing size={small ? 14 : 16} /> Nhắc nhở
    </button>
  )
}

export default function AdminAlerts() {
  const alerts = useDb((s) => s.alerts)
  const homes = useAuth((s) => s.homes)
  const [filter, setFilter] = useState('unack')
  const [q, setQ] = useState('')

  const homeName = (id) => homes.find((h) => h.id === id)?.name ?? '(đã xoá)'
  const list = useMemo(() => {
    const term = q.toLowerCase()
    return alerts.filter((a) => {
      if (filter === 'unack' && a.acknowledgedAt) return false
      if (filter === 'ack' && !a.acknowledgedAt) return false
      const name = homes.find((h) => h.id === a.homeId)?.name ?? ''
      return name.toLowerCase().includes(term)
    })
  }, [alerts, homes, filter, q])
  const unackCount = alerts.filter((a) => !a.acknowledgedAt).length

  return (
    <>
      <PageHeader title="Cảnh báo toàn hệ thống" subtitle="Theo dõi cảnh báo khí gas của mọi nhà, nhắc nhở người dùng chưa xác nhận" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'unack', label: `Chưa xác nhận (${unackCount})` },
            { value: 'ack', label: 'Đã xác nhận' },
            { value: 'all', label: 'Tất cả' },
          ]}
        />
        <div className="relative sm:ml-auto sm:w-64">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Tìm theo tên nhà…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-x-auto p-0">
        {!list.length ? (
          <EmptyState>Không có cảnh báo nào.</EmptyState>
        ) : (
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Nhà</th>
                <th className="px-4 py-3 font-medium">Nồng độ đỉnh</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Xác nhận / nhắc nhở</th>
                <th className="px-4 py-3 text-right font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fmtDateTime(a.createdAt)}
                    <p className="text-xs text-slate-400">{timeAgo(a.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{homeName(a.homeId)}</p>
                    <p className="text-xs text-slate-500">{ROOMS[a.room]?.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-red-600">{a.peakValue} ppm</span>
                    <p className="text-xs text-slate-400">ngưỡng {a.threshold}</p>
                  </td>
                  <td className="px-4 py-3"><AlertStatus alert={a} /></td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {a.acknowledgedAt ? (
                      <p>{a.acknowledgedBy} · {fmtDateTime(a.acknowledgedAt)}</p>
                    ) : (
                      <p className="text-amber-700">Người dùng chưa xác nhận</p>
                    )}
                    {a.reminders.length > 0 && (
                      <p className="mt-0.5">Đã nhắc {a.reminders.length} lần, gần nhất {timeAgo(a.reminders.at(-1).at)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!a.acknowledgedAt && <RemindButton alert={a} small />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
