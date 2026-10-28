import { useMemo, useState } from 'react'
import { CheckCircle2, Clock, Mail } from 'lucide-react'
import { useCurrentHome, useCurrentUser } from '../../store/auth'
import { useDb } from '../../store/db'
import { ROOMS } from '../../data/constants'
import { Badge, EmptyState, PageHeader, Tabs } from '../../components/ui'
import { fmtDateTime } from '../../utils/format'

const PAGE_SIZE = 30

export default function HistoryPage() {
  const [tab, setTab] = useState('alerts')
  return (
    <>
      <PageHeader title="Lịch sử" subtitle="Nhật ký cảnh báo và các lần bật/tắt thiết bị của ngôi nhà" />
      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={setTab}
          options={[
            { value: 'alerts', label: 'Cảnh báo khí gas' },
            { value: 'logs', label: 'Hoạt động' },
          ]}
        />
      </div>
      {tab === 'alerts' ? <AlertHistory /> : <ActivityLog />}
    </>
  )
}

export function AlertStatus({ alert }) {
  return (
    <div className="flex flex-wrap gap-1">
      {alert.resolvedAt ? <Badge tone="green">Đã an toàn</Badge> : <Badge tone="red">Đang rò gas</Badge>}
      {alert.acknowledgedAt ? <Badge tone="blue">Đã xác nhận</Badge> : <Badge tone="amber">Chưa xác nhận</Badge>}
    </div>
  )
}

function AlertHistory() {
  const home = useCurrentHome()
  const user = useCurrentUser()
  const allAlerts = useDb((s) => s.alerts)
  const acknowledge = useDb((s) => s.acknowledgeAlert)
  const alerts = useMemo(() => allAlerts.filter((a) => a.homeId === home.id), [allAlerts, home.id])

  if (!alerts.length) return <div className="card"><EmptyState>Chưa có cảnh báo nào.</EmptyState></div>

  return (
    <div className="space-y-3">
      {alerts.map((a) => (
        <div key={a.id} className={`card ${!a.acknowledgedAt ? 'ring-2 ring-amber-300' : ''}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">
                Rò rỉ khí gas – {ROOMS[a.room]?.name} · đỉnh {a.peakValue} ppm (ngưỡng {a.threshold})
              </p>
              <p className="flex items-center gap-1 text-sm text-slate-500">
                <Clock size={14} /> {fmtDateTime(a.createdAt)}
                {a.resolvedAt && ` → an toàn lúc ${fmtDateTime(a.resolvedAt)}`}
              </p>
              {a.emailsSentTo.length > 0 && (
                <p className="flex items-center gap-1 text-sm text-slate-500">
                  <Mail size={14} /> Đã gửi email: {a.emailsSentTo.join(', ')}
                </p>
              )}
              {a.reminders.length > 0 && (
                <p className="text-sm text-amber-700">
                  Quản trị viên đã nhắc nhở {a.reminders.length} lần (gần nhất {fmtDateTime(a.reminders.at(-1).at)})
                </p>
              )}
              {a.acknowledgedAt && (
                <p className="flex items-center gap-1 text-sm text-emerald-700">
                  <CheckCircle2 size={14} /> {a.acknowledgedBy} đã xác nhận lúc {fmtDateTime(a.acknowledgedAt)}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              <AlertStatus alert={a} />
              {!a.acknowledgedAt && (
                <button className="btn-primary" onClick={() => acknowledge(a.id, user.fullName)}>
                  Tôi đã biết
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivityLog() {
  const home = useCurrentHome()
  const allLogs = useDb((s) => s.logs)
  const [room, setRoom] = useState('all')
  const [limit, setLimit] = useState(PAGE_SIZE)

  const logs = useMemo(
    () => allLogs.filter((l) => l.homeId === home.id && (room === 'all' || l.room === room)),
    [allLogs, home.id, room],
  )

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600" htmlFor="room-filter">Phòng:</label>
        <select id="room-filter" className="input w-auto" value={room} onChange={(e) => setRoom(e.target.value)}>
          <option value="all">Tất cả</option>
          {Object.values(ROOMS).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <span className="ml-auto text-sm text-slate-400">{logs.length} bản ghi</span>
      </div>

      {!logs.length ? (
        <EmptyState>Chưa có hoạt động nào.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3 font-medium">Thời gian</th>
                <th className="py-2 pr-3 font-medium">Người thực hiện</th>
                <th className="py-2 pr-3 font-medium">Phòng</th>
                <th className="py-2 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, limit).map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{fmtDateTime(l.at)}</td>
                  <td className="py-2 pr-3">
                    {l.actor.startsWith('Tự động') || l.actor === 'Hệ thống' ? <Badge tone="violet">{l.actor}</Badge> : l.actor}
                  </td>
                  <td className="py-2 pr-3">{ROOMS[l.room]?.name}</td>
                  <td className="py-2">{l.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {logs.length > limit && (
        <div className="mt-4 text-center">
          <button className="btn-secondary" onClick={() => setLimit(limit + PAGE_SIZE)}>Xem thêm</button>
        </div>
      )}
    </div>
  )
}
