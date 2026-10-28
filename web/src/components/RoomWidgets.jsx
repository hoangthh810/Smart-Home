import { BellRing, Bot, Fan, Hand, Lightbulb } from 'lucide-react'
import { CONTROLLABLE_DEVICES, DEVICE_LABELS, ROOMS } from '../data/constants'
import { useRoomControl } from '../hooks/useRoomControl'
import { Toggle } from './ui'

const DEVICE_ICONS = { light: Lightbulb, fan: Fan, buzzer: BellRing }

export function ModeSwitch({ roomId, compact }) {
  const { room, setMode } = useRoomControl(roomId)
  const options = [
    { value: 'auto', label: 'Tự động', icon: Bot },
    { value: 'manual', label: 'Thủ công', icon: Hand },
  ]
  return (
    <div className="inline-flex rounded-xl bg-slate-200/70 p-1" role="radiogroup" aria-label="Chế độ">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={room.mode === value}
          onClick={() => setMode(value)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-lg font-medium transition ${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
            room.mode === value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon size={compact ? 14 : 16} /> {label}
        </button>
      ))}
    </div>
  )
}

export function DeviceList({ roomId }) {
  const { room, setDevice, canControl, lockReason } = useRoomControl(roomId)

  return (
    <div className="space-y-2">
      {ROOMS[roomId].devices.map((device) => {
        const Icon = DEVICE_ICONS[device]
        const on = !!room.devices[device]
        const controllable = CONTROLLABLE_DEVICES.includes(device)
        const activeColor = device === 'buzzer' ? 'bg-red-100 text-red-600' : device === 'light' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'
        return (
          <div key={device} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
            <div className={`rounded-lg p-2 ${on ? activeColor : 'bg-slate-100 text-slate-400'}`}>
              <Icon size={20} className={on && device === 'fan' ? 'animate-spin [animation-duration:1.5s]' : ''} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{DEVICE_LABELS[device]}</p>
              <p className={`text-xs ${on ? 'text-emerald-600' : 'text-slate-400'}`}>
                {on ? 'Đang bật' : 'Đang tắt'}
                {!controllable && ' · Hệ thống tự điều khiển'}
              </p>
            </div>
            {controllable && (
              <Toggle checked={on} disabled={!canControl} onChange={(v) => setDevice(device, v)} label={DEVICE_LABELS[device]} />
            )}
          </div>
        )
      })}
      {lockReason && <p className="pt-1 text-xs text-slate-500">{lockReason}</p>}
    </div>
  )
}
