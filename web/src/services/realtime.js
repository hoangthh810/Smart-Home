// Lớp kết nối thời gian thực giữa Web và hệ thống (theo mô hình MQTT).
//
// Cấu trúc topic dự kiến (dùng chung cho ESP32, Raspberry Pi và Web):
//   smarthome/{homeId}/{room}/sensors   ESP32 -> Web   {temperature, humidity, lux|gas, presence, power}
//   smarthome/{homeId}/{room}/state     ESP32 -> Web   {mode, devices: {light, fan, buzzer}, alarm}
//   smarthome/{homeId}/{room}/cmd       Web -> Pi/ESP32 {mode} | {device, value}
//   smarthome/{homeId}/{room}/event     Pi -> Web      {actor, action}            (nhật ký thao tác tự động)
//   smarthome/{homeId}/{room}/alert     Pi -> Web      {event: start|end, type: 'gas', ...}
//
// Hiện tại dùng MockClient (giả lập). Khi tích hợp, chỉ cần thay createMockClient bằng
// mqtt.connect('ws://<ip-raspberry-pi>:9001') của thư viện mqtt.js – phần giao diện giữ nguyên.
import { createSimulator } from './simulator'

export const topic = (homeId, room, kind) => `smarthome/${homeId}/${room}/${kind}`

function createMockClient(homeId, getSettings) {
  const listeners = new Set()
  const simulator = createSimulator({
    getSettings,
    emit: (room, kind, payload) => {
      const t = topic(homeId, room, kind)
      listeners.forEach((fn) => fn(t, payload))
    },
  })

  return {
    onMessage: (fn) => listeners.add(fn),
    publish(t, payload) {
      const [, , room, kind] = t.split('/')
      if (kind === 'cmd') simulator.handleCommand(room, payload)
    },
    end: () => {
      simulator.stop()
      listeners.clear()
    },
    simulator,
  }
}

let client = null
let currentHomeId = null

export function connect(homeId, { getSettings, onMessage }) {
  disconnect()
  currentHomeId = homeId
  client = createMockClient(homeId, getSettings)
  client.onMessage((t, payload) => {
    const [, , room, kind] = t.split('/')
    onMessage({ room, kind, payload })
  })
}

export function disconnect() {
  client?.end()
  client = null
  currentHomeId = null
}

export function sendCommand(room, payload) {
  if (!client) return
  client.publish(topic(currentHomeId, room, 'cmd'), payload)
}

// Chỉ dành cho giai đoạn giả lập
export function getSimState(room) {
  return client?.simulator?.getSimState(room) ?? { gasLeak: false, presenceOverride: null }
}
