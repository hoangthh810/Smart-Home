import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ChefHat, Droplets, Flame, Power, Sofa, Thermometer, UserCheck, UserX } from 'lucide-react'
import { useCurrentHome, useCurrentUser } from '../../store/auth'
import { useDb, useHomeSettings } from '../../store/db'
import { useLive } from '../../store/live'
import { CONTROLLABLE_DEVICES, ROOMS } from '../../data/constants'
import { Badge, NodeBadge, PageHeader, StatCard } from '../../components/ui'
import { DeviceList, ModeSwitch } from '../../components/RoomWidgets'
import { fmtNumber } from '../../utils/format'

export default function Dashboard() {
  const user = useCurrentUser()
  const home = useCurrentHome()
  const rooms = useLive((s) => s.rooms)
  const unack = useDb((s) => s.alerts.filter((a) => a.homeId === home.id && !a.acknowledgedAt).length)
  const list = Object.values(rooms)
  const devicesOn = list.reduce((n, r) => n + CONTROLLABLE_DEVICES.filter((d) => r.devices?.[d]).length, 0)
  const occupied = list.filter((r) => r.sensors.presence).length

  return (
    <>
      <PageHeader
        title={`Xin chào, ${user.fullName.split(' ').at(-1)}!`}
        subtitle={`${home.name} · ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Power} label="Thiết bị đang bật" value={`${devicesOn} / ${list.length * CONTROLLABLE_DEVICES.length}`} hint="Đèn và quạt" tone="amber" />
        <StatCard icon={UserCheck} label="Phòng có người" value={`${occupied} / ${list.length}`} hint="Theo cảm biến PIR" tone="green" />
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
    ...(roomId === 'kitchen' ? [{ icon: Flame, label: 'Khí gas', value: fmtNumber(s.gas), warn: room.alarm }] : []),
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

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl p-3 ${m.warn ? 'bg-red-50' : 'bg-slate-50'}`}>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <m.icon size={14} /> {m.label}
            </p>
            <p className={`mt-1 font-semibold ${m.warn ? 'text-red-600' : 'text-slate-800'}`}>
              {m.value}
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
