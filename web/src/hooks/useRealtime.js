// Kết nối realtime cho nhà của người dùng đang đăng nhập và xử lý các bản tin nhận được.
import { useEffect } from 'react'
import { connect, disconnect } from '../services/realtime'
import { useLive } from '../store/live'
import { useDb } from '../store/db'
import { ROOMS } from '../data/constants'

export function useRealtime(homeId) {
  useEffect(() => {
    if (!homeId) return
    const live = useLive.getState()

    connect(homeId, {
      getSettings: () => useDb.getState().settings[homeId],
      onMessage: ({ room, kind, payload }) => {
        const db = useDb.getState()
        if (kind === 'sensors') live.onSensors(room, payload)
        else if (kind === 'state') live.onState(room, payload)
        else if (kind === 'event') db.addLog({ homeId, room, ...payload })
        else if (kind === 'alert') handleAlert(homeId, room, payload)
      },
    })
    live.setConnected(true)

    return () => {
      disconnect()
      useLive.getState().reset()
    }
  }, [homeId])
}

// Ghi nhận cảnh báo + gửi email. Khi có backend, phần này do Raspberry Pi đảm nhiệm.
function handleAlert(homeId, room, payload) {
  const db = useDb.getState()
  const open = db.alerts.find((a) => a.homeId === homeId && a.room === room && !a.resolvedAt)

  if (payload.event === 'start' && !open) {
    const emails = db.settings[homeId]?.alertEmails ?? []
    db.addAlert({ homeId, room, type: payload.type, peakValue: payload.value, threshold: payload.threshold, emailsSentTo: emails })
    db.addLog({ homeId, room, actor: 'Hệ thống', action: `Phát hiện khí gas ${payload.value} ppm – bật còi báo` })
    useLive.getState().pushToast(
      emails.length ? `Đã gửi email cảnh báo tới: ${emails.join(', ')}` : 'Chưa cấu hình email nhận cảnh báo!',
      emails.length ? 'info' : 'error',
    )
  } else if (payload.event === 'end' && open) {
    db.updateAlert(open.id, { resolvedAt: new Date().toISOString(), peakValue: Math.max(open.peakValue, payload.peak) })
    db.addLog({ homeId, room, actor: 'Hệ thống', action: `Nồng độ gas ${ROOMS[room].name.toLowerCase()} đã về mức an toàn – tắt còi` })
  }
}
