// Bộ giả lập phần cứng: đóng vai 2 ESP32 (cảm biến + thiết bị) và logic tự động trên Raspberry Pi.
// Chỉ dùng trong giai đoạn chưa có phần cứng. Khi tích hợp thật, file này không còn được dùng.
import { CONTROLLABLE_DEVICES, DEVICE_LABELS } from '../data/constants'

const TICK_MS = 2000
// Công suất danh định giả lập (W) – thay bằng số đo thật từ INA219
const DEVICE_WATTS = { light: 3, fan: 6, buzzer: 0.4 }

const rand = (a, b) => a + Math.random() * (b - a)
const drift = (value, target, rate, noise) => value + (target - value) * rate + rand(-noise, noise)
const round1 = (v) => Math.round(v * 10) / 10

export function createSimulator({ getSettings, emit }) {
  const now = Date.now()
  const rooms = {
    living: {
      nodeId: 1, // ID cài bằng nút trên node, hiện trên LCD
      mode: 'auto',
      devices: { light: false, fan: false },
      sensors: { temperature: 29.5, humidity: 68, lux: 250, presence: false, power: 0 },
      lastSeenAt: now,
      presenceOverride: null,
    },
    kitchen: {
      nodeId: 2,
      mode: 'auto',
      devices: { light: false, fan: false, buzzer: false },
      sensors: { temperature: 31, humidity: 72, gas: 120, presence: false, power: 0 },
      lastSeenAt: now,
      presenceOverride: null,
      gasLeak: false,
      alarm: false,
      peak: 0,
    },
  }

  const setDevice = (roomId, device, value, actor) => {
    const room = rooms[roomId]
    if (room.devices[device] === value) return
    room.devices[device] = value
    if (actor) emit(roomId, 'event', { actor, action: `${value ? 'Bật' : 'Tắt'} ${DEVICE_LABELS[device]}` })
  }

  const publishState = (roomId) => {
    const r = rooms[roomId]
    emit(roomId, 'state', { nodeId: r.nodeId, mode: r.mode, devices: { ...r.devices }, alarm: !!r.alarm })
  }

  function tick() {
    const settings = getSettings()
    const t = Date.now()
    const hour = new Date().getHours() + new Date().getMinutes() / 60
    const daylight = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12))

    for (const [roomId, r] of Object.entries(rooms)) {
      const s = r.sensors

      // Môi trường
      s.temperature = round1(drift(s.temperature, roomId === 'kitchen' ? 31 : 29 + daylight * 2, 0.05, 0.15))
      s.humidity = round1(drift(s.humidity, 70, 0.05, 0.4))

      // PIR
      if (r.presenceOverride !== null) s.presence = r.presenceOverride
      else if (Math.random() < 0.015) s.presence = !s.presence
      if (s.presence) r.lastSeenAt = t

      // Khí gas (chỉ phòng bếp)
      if (roomId === 'kitchen') {
        s.gas = Math.max(0, Math.round(drift(s.gas, r.gasLeak ? 720 : 120, 0.15, 6)))
        const threshold = settings.gasThreshold
        if (!r.alarm && s.gas >= threshold) {
          r.alarm = true
          r.peak = s.gas
          r.devices.buzzer = true
          emit(roomId, 'alert', { event: 'start', type: 'gas', value: s.gas, threshold })
        } else if (r.alarm) {
          r.peak = Math.max(r.peak, s.gas)
          if (s.gas < threshold * 0.9) {
            r.alarm = false
            r.devices.buzzer = false
            emit(roomId, 'alert', { event: 'end', type: 'gas', peak: r.peak })
          }
        }
      }

      // Logic Auto: có người -> bật đèn + quạt; không có người sau X phút -> tắt.
      // Khi đang rò gas: không bật/tắt thiết bị điện (tránh phát tia lửa).
      if (r.mode === 'auto' && !r.alarm) {
        if (s.presence) {
          setDevice(roomId, 'light', true, 'Tự động (Auto)')
          setDevice(roomId, 'fan', true, 'Tự động (Auto)')
        } else if (t - r.lastSeenAt > settings.offDelayMin * 60000) {
          setDevice(roomId, 'light', false, 'Tự động (Auto)')
          setDevice(roomId, 'fan', false, 'Tự động (Auto)')
        }
      }

      // Ánh sáng (chỉ phòng khách) – có cộng thêm ánh sáng đèn
      if (roomId === 'living') {
        const target = daylight * 600 + 5 + (r.devices.light ? 120 : 0)
        s.lux = Math.max(0, Math.round(drift(s.lux, target, 0.2, 4)))
      }

      // INA219: tổng công suất các tải trong phòng
      const watts = Object.entries(r.devices).reduce((sum, [d, on]) => sum + (on ? DEVICE_WATTS[d] : 0), 0)
      s.power = watts > 0 ? round1(watts + rand(-0.2, 0.2)) : round1(rand(0, 0.05))

      emit(roomId, 'sensors', { ...s })
      publishState(roomId)
    }
  }

  // Nhận lệnh từ Web
  function handleCommand(roomId, payload) {
    const r = rooms[roomId]
    if (!r) return
    if (payload.mode) {
      r.mode = payload.mode
      // Khi về Auto, coi như vừa thấy người để không tắt thiết bị ngay lập tức
      if (payload.mode === 'auto') r.lastSeenAt = Date.now()
    } else if (payload.device) {
      if (r.mode === 'manual' && !r.alarm && CONTROLLABLE_DEVICES.includes(payload.device)) {
        setDevice(roomId, payload.device, !!payload.value)
      }
    } else if (payload.simulate === 'gasLeak') {
      r.gasLeak = !!payload.value
    } else if (payload.simulate === 'presence') {
      r.presenceOverride = payload.value
    } else if (payload.simulate === 'nodeId') {
      r.nodeId = payload.value
    }
    publishState(roomId)
  }

  tick()
  const timer = setInterval(tick, TICK_MS)

  return {
    handleCommand,
    getSimState: (roomId) => ({
      gasLeak: !!rooms[roomId]?.gasLeak,
      presenceOverride: rooms[roomId]?.presenceOverride ?? null,
      nodeId: rooms[roomId]?.nodeId ?? 1,
    }),
    stop: () => clearInterval(timer),
  }
}
