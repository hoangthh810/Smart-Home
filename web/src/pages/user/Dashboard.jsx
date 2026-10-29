import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ChefHat, Droplets, Flame, Gauge, Receipt, Sofa, Sun, Thermometer, UserCheck, UserX, Zap } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCurrentHome, useCurrentUser } from '../../store/auth'
import { useDb, useHomeSettings } from '../../store/db'
import { useLive } from '../../store/live'
import { useEnergy } from '../../hooks/useEnergy'
import { ROOMS } from '../../data/constants'
import { Badge, NodeBadge, PageHeader, StatCard } from '../../components/ui'
import { DeviceList, ModeSwitch } from '../../components/RoomWidgets'
import { fmtEnergy, fmtNumber, fmtVnd } from '../../utils/format'

export default function Dashboard() {
  const user = useCurrentUser()
  const home = useCurrentHome()
  const rooms = useLive((s) => s.rooms)
  const unack = useDb((s) => s.alerts.filter((a) => a.homeId === home.id && !a.acknowledgedAt).length)
  const { todayWh, monthWh, monthCost, history } = useEnergy(home.id)

  const powerNow = (rooms.living.sensors.power ?? 0) + (rooms.kitchen.sensors.power ?? 0)
  const last7 = history.days.slice(-7).map((d) => ({
    label: new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    'Phòng khách': +d.living.toFixed(1),
    'Phòng bếp': +d.kitchen.toFixed(1),
  }))

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user.fullName.split(' ').at(-1)}!`}
        subtitle={`${home.name} · ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Gauge} label="Công suất hiện tại" value={`${fmtNumber(powerNow, 1)} W`} hint="Tổng 2 phòng (INA219)" tone="violet" />
        <StatCard icon={Zap} label="Điện năng hôm nay" value={fmtEnergy(todayWh)} tone="amber" />
        <StatCard icon={Receipt} label="Tiền điện tháng này" value={fmtVnd(monthCost.total)} hint={`${fmtEnergy(monthWh)} · giá EVN (gồm VAT)`} tone="green" />
        <StatCard
          icon={AlertTriangle}
          label="Cảnh báo chưa xác nhận"
          value={unack}
          hint={unack ? 'Vào Lịch sử để xác nhận' : 'Mọi thứ đều ổn'}
          tone="slate"
          warn={unack > 0}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RoomCard roomId="living" icon={Sofa} />
        <RoomCard roomId="kitchen" icon={ChefHat} />
      </div>

      <div className="card mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Điện năng 7 ngày gần nhất (Wh)</h2>
          <Link to="/nha/dien-nang" className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
            Chi tiết <ArrowRight size={14} />
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={last7} margin={{ top: 0, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip formatter={(v) => `${v} Wh`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Phòng khách" stackId="a" fill="#3b82f6" />
            <Bar dataKey="Phòng bếp" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

function RoomCard({ roomId, icon: Icon }) {
  const room = useLive((s) => s.rooms[roomId])
  const homeId = useCurrentHome().id
  const settings = useHomeSettings(homeId)
  const s = room.sensors

  const metrics = [
    { icon: Thermometer, label: 'Nhiệt độ', value: `${fmtNumber(s.temperature, 1)} °C`, warn: s.temperature > settings.tempHigh },
    { icon: Droplets, label: 'Độ ẩm', value: `${fmtNumber(s.humidity, 0)} %`, warn: s.humidity > settings.humidityHigh },
    roomId === 'living'
      ? { icon: Sun, label: 'Ánh sáng', value: `${fmtNumber(s.lux)} lux`, warn: false, note: s.lux < settings.luxLow ? 'Tối' : null }
      : { icon: Flame, label: 'Khí gas', value: `${fmtNumber(s.gas)} ppm`, warn: room.alarm },
    { icon: Gauge, label: 'Công suất', value: `${fmtNumber(s.power, 1)} W` },
  ]

  return (
    <div className={`card ${room.alarm ? 'ring-2 ring-red-400' : ''}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
          <Icon size={22} />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold">{ROOMS[roomId].name}</h2>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {s.presence ? (
              <Badge tone="green"><UserCheck size={12} /> Có người</Badge>
            ) : (
              <Badge tone="slate"><UserX size={12} /> Không có người</Badge>
            )}
            <NodeBadge id={room.nodeId} />
          </div>
        </div>
        <ModeSwitch roomId={roomId} compact />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl p-3 ${m.warn ? 'bg-red-50' : 'bg-slate-50'}`}>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <m.icon size={14} /> {m.label}
            </p>
            <p className={`mt-1 font-semibold ${m.warn ? 'text-red-600' : 'text-slate-800'}`}>
              {m.value} {m.note && <span className="text-xs font-normal text-slate-500">({m.note})</span>}
            </p>
          </div>
        ))}
      </div>

      <DeviceList roomId={roomId} />

      <Link to={`/nha/phong/${roomId}`} className="mt-4 flex items-center justify-end gap-1 text-sm text-blue-600 hover:underline">
        Xem chi tiết <ArrowRight size={14} />
      </Link>
    </div>
  )
}
