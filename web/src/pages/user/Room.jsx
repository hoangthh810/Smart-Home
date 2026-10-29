import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Bot, Droplets, FlaskConical, Flame, Gauge, Sun, Thermometer, UserCheck, UserX } from 'lucide-react'
import { useCurrentHome } from '../../store/auth'
import { useHomeSettings } from '../../store/db'
import { useLive } from '../../store/live'
import { getSimState, sendCommand } from '../../services/realtime'
import { ROOMS } from '../../data/constants'
import { NodeBadge, PageHeader, StatCard, Toggle } from '../../components/ui'
import { DeviceList, ModeSwitch } from '../../components/RoomWidgets'
import SensorChart from '../../components/SensorChart'
import { fmtDateTime, fmtNumber } from '../../utils/format'

export default function Room() {
  const { roomId } = useParams()
  const home = useCurrentHome()
  const settings = useHomeSettings(home.id)
  const room = useLive((s) => s.rooms[roomId])
  const history = useLive((s) => s.history[roomId])

  if (!ROOMS[roomId]) return <Navigate to="/nha" replace />
  const s = room.sensors
  const isLiving = roomId === 'living'

  return (
    <>
      <PageHeader
        title={ROOMS[roomId].name}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <NodeBadge id={room.nodeId} />
            Cập nhật lúc {room.updatedAt ? fmtDateTime(room.updatedAt) : '--'}
          </span>
        }
        actions={<ModeSwitch roomId={roomId} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard
          icon={Thermometer}
          label="Nhiệt độ"
          value={`${fmtNumber(s.temperature, 1)} °C`}
          tone="red"
          warn={s.temperature > settings.tempHigh}
          hint={s.temperature > settings.tempHigh ? `Cao hơn ngưỡng ${settings.tempHigh} °C` : 'DHT22'}
        />
        <StatCard
          icon={Droplets}
          label="Độ ẩm"
          value={`${fmtNumber(s.humidity, 0)} %`}
          tone="blue"
          warn={s.humidity > settings.humidityHigh}
          hint={s.humidity > settings.humidityHigh ? `Cao hơn ngưỡng ${settings.humidityHigh} %` : 'DHT22'}
        />
        {isLiving ? (
          <StatCard icon={Sun} label="Ánh sáng" value={`${fmtNumber(s.lux)} lux`} tone="amber" hint={s.lux < settings.luxLow ? 'Trời tối' : 'BH1750'} />
        ) : (
          <StatCard
            icon={Flame}
            label="Khí gas"
            value={`${fmtNumber(s.gas)} ppm`}
            tone="amber"
            warn={room.alarm}
            hint={room.alarm ? 'VƯỢT NGƯỠNG!' : `Ngưỡng ${settings.gasThreshold} ppm · MQ-2`}
          />
        )}
        <StatCard
          icon={s.presence ? UserCheck : UserX}
          label="Chuyển động"
          value={s.presence ? 'Có người' : 'Không có'}
          tone={s.presence ? 'green' : 'slate'}
          hint="PIR"
        />
        <StatCard icon={Gauge} label="Công suất" value={`${fmtNumber(s.power, 1)} W`} tone="violet" hint="INA219" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <h2 className="mb-4 font-semibold">Thiết bị</h2>
          <DeviceList roomId={roomId} />
          <div className="mt-4 flex gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
            <Bot size={18} className="mt-0.5 shrink-0" />
            <p>
              <b>Chế độ Tự động:</b> khi PIR phát hiện có người sẽ bật đèn và quạt; không còn người sau{' '}
              <b>{settings.offDelayMin} phút</b> sẽ tự tắt.
              {!isLiving && ' Khi phát hiện khí gas: còi kêu, gửi email cảnh báo, đèn và quạt giữ nguyên trạng thái.'}
            </p>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-4 font-semibold">Nhiệt độ & độ ẩm (thời gian thực)</h2>
            <SensorChart
              data={history}
              lines={[
                { key: 'temperature', name: 'Nhiệt độ', color: '#ef4444', unit: '°C' },
                { key: 'humidity', name: 'Độ ẩm', color: '#3b82f6', unit: '%' },
              ]}
            />
          </div>
          <div className="card">
            <h2 className="mb-4 font-semibold">{isLiving ? 'Cường độ ánh sáng' : 'Nồng độ khí gas'} (thời gian thực)</h2>
            <SensorChart
              data={history}
              lines={[isLiving ? { key: 'lux', name: 'Ánh sáng', color: '#f59e0b', unit: 'lux' } : { key: 'gas', name: 'Khí gas', color: '#f97316', unit: 'ppm' }]}
              refLine={isLiving ? { value: settings.luxLow, label: 'Ngưỡng tối' } : { value: settings.gasThreshold, label: 'Ngưỡng cảnh báo' }}
            />
          </div>
        </div>
      </div>

      <SimulatorPanel key={roomId} roomId={roomId} />
    </>
  )
}

// Công cụ chỉ dùng khi chưa có phần cứng, để thử các tình huống
function SimulatorPanel({ roomId }) {
  const [sim, setSim] = useState(() => getSimState(roomId))
  const update = (patch) => {
    const next = { ...sim, ...patch }
    setSim(next)
    if ('gasLeak' in patch) sendCommand(roomId, { simulate: 'gasLeak', value: patch.gasLeak })
    if ('presenceOverride' in patch) sendCommand(roomId, { simulate: 'presence', value: patch.presenceOverride })
    if ('nodeId' in patch) sendCommand(roomId, { simulate: 'nodeId', value: patch.nodeId })
  }
  const presenceOptions = [
    { value: null, label: 'Ngẫu nhiên' },
    { value: true, label: 'Có người' },
    { value: false, label: 'Không có người' },
  ]

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-300 p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
        <FlaskConical size={18} /> Công cụ giả lập
      </h2>
      <p className="mb-4 text-xs text-slate-500">Chỉ dùng trong giai đoạn chưa kết nối phần cứng, sẽ được gỡ bỏ khi tích hợp ESP32.</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Cảm biến PIR:</span>
          {presenceOptions.map((o) => (
            <button
              key={String(o.value)}
              onClick={() => update({ presenceOverride: o.value })}
              className={`cursor-pointer rounded-lg px-3 py-1 ${sim.presenceOverride === o.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          ID node (nút SET/OK):
          <input
            type="number"
            min={1}
            max={99}
            value={sim.nodeId}
            onChange={(e) => update({ nodeId: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })}
            className="input w-20 py-1"
          />
        </label>
        {roomId === 'kitchen' && (
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <Toggle checked={sim.gasLeak} onChange={(v) => update({ gasLeak: v })} label="Giả lập rò gas" />
            Giả lập rò rỉ khí gas
          </label>
        )}
      </div>
    </div>
  )
}
