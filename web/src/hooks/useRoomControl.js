import { useCurrentUser } from '../store/auth'
import { useDb } from '../store/db'
import { useLive } from '../store/live'
import { sendCommand } from '../services/realtime'
import { DEVICE_LABELS, MODE_LABELS } from '../data/constants'

// Điều khiển một phòng: đổi chế độ, bật/tắt thiết bị (gửi lệnh qua MQTT + ghi nhật ký)
export function useRoomControl(roomId) {
  const user = useCurrentUser()
  const addLog = useDb((s) => s.addLog)
  const room = useLive((s) => s.rooms[roomId])

  const log = (action) => addLog({ homeId: user.homeId, room: roomId, actor: user.fullName, action })

  const setMode = (mode) => {
    if (mode === room.mode) return
    sendCommand(roomId, { mode })
    log(`Chuyển sang chế độ ${MODE_LABELS[mode]}`)
  }

  const setDevice = (device, value) => {
    sendCommand(roomId, { device, value })
    log(`${value ? 'Bật' : 'Tắt'} ${DEVICE_LABELS[device]}`)
  }

  const lockReason = room.alarm
    ? 'Đang rò gas – tạm khoá điều khiển để tránh phát tia lửa điện'
    : room.mode === 'auto'
      ? 'Đang ở chế độ Tự động. Chuyển sang Thủ công để bật/tắt.'
      : null

  return { room, setMode, setDevice, canControl: !lockReason, lockReason }
}
