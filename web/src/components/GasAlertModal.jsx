// Popup cảnh báo khí gas phía người dùng. Không tự tắt – phải bấm "Tôi đã biết".
// Nếu bấm "Ẩn tạm", popup sẽ hiện lại khi admin bấm "Nhắc nhở".
import { useEffect, useMemo } from 'react'
import { BellRing, Flame } from 'lucide-react'
import { useDb } from '../store/db'
import { useLive } from '../store/live'
import { ROOMS } from '../data/constants'
import { fmtDateTime } from '../utils/format'

function useAlarmSound(active) {
  useEffect(() => {
    if (!active) return
    let ctx
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
    } catch {
      return
    }
    const beep = () => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.value = 0.05
      osc.connect(gain).connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    }
    beep()
    const timer = setInterval(beep, 1000)
    return () => {
      clearInterval(timer)
      ctx.close()
    }
  }, [active])
}

export default function GasAlertModal({ homeId, user }) {
  const alerts = useDb((s) => s.alerts)
  const acknowledge = useDb((s) => s.acknowledgeAlert)
  const dismissed = useLive((s) => s.dismissedAlerts)
  const dismiss = useLive((s) => s.dismissAlert)
  const gasNow = useLive((s) => s.rooms.kitchen.sensors.gas)

  const alert = useMemo(
    () =>
      alerts.find((a) => {
        if (a.homeId !== homeId || a.acknowledgedAt) return false
        const dismissedAt = dismissed[a.id]
        if (!dismissedAt) return true
        const lastReminder = a.reminders.at(-1)?.at
        return lastReminder && lastReminder > dismissedAt
      }),
    [alerts, homeId, dismissed],
  )

  const active = !!alert && !alert.resolvedAt
  useAlarmSound(active)

  if (!alert) return null
  const lastReminder = alert.reminders.at(-1)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-red-950/60 p-4">
      <div className="alarm-pulse w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
          <Flame size={28} />
          <div>
            <h2 className="text-lg font-bold">CẢNH BÁO RÒ RỈ KHÍ GAS</h2>
            <p className="text-sm text-red-100">{ROOMS[alert.room]?.name}</p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          {lastReminder && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <BellRing size={18} className="mt-0.5 shrink-0" />
              <span>
                <b>{lastReminder.by}</b> đã nhắc nhở bạn lúc {fmtDateTime(lastReminder.at)}. Vui lòng kiểm tra ngay!
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">{active ? 'Nồng độ hiện tại' : 'Nồng độ cao nhất'}</p>
              <p className="text-xl font-bold text-red-600">{active ? gasNow ?? alert.peakValue : alert.peakValue} ppm</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-slate-500">Ngưỡng cảnh báo</p>
              <p className="text-xl font-bold text-slate-800">{alert.threshold} ppm</p>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Phát hiện lúc <b>{fmtDateTime(alert.createdAt)}</b>.{' '}
            {active ? (
              <span className="font-semibold text-red-600">Khí gas vẫn đang vượt ngưỡng.</span>
            ) : (
              <span className="font-semibold text-emerald-600">Nồng độ đã về mức an toàn lúc {fmtDateTime(alert.resolvedAt)}.</span>
            )}
          </p>

          <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-800">
            <p className="mb-1 font-semibold">Hướng dẫn an toàn:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>Không bật/tắt bất kỳ thiết bị điện nào, không dùng lửa.</li>
              <li>Khoá van bình gas, mở cửa để thông gió tự nhiên.</li>
              <li>Rời khỏi khu vực nếu nồng độ tiếp tục tăng, gọi 114 khi cần.</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
          <button className="btn-secondary flex-1" onClick={() => dismiss(alert.id)}>
            Ẩn tạm
          </button>
          <button className="btn-danger flex-1" onClick={() => acknowledge(alert.id, user.fullName)}>
            Tôi đã biết
          </button>
        </div>
      </div>
    </div>
  )
}
