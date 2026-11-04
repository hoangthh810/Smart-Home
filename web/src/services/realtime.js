// Lớp kết nối thời gian thực giữa Web và hệ thống (theo mô hình MQTT).
//
// Cấu trúc topic dự kiến (dùng chung cho ESP32, Raspberry Pi và Web):
//   smarthome/{homeId}/{room}/sensors   ESP32 -> Web   {temperature, humidity, lux|gas, presence, power}
//   smarthome/{homeId}/{room}/state     ESP32 -> Web   {nodeId, mode, devices: {light, fan, buzzer}, alarm}
//                                                      nodeId: ID cài bằng nút SET/OK trên node, hiện trên LCD
//   smarthome/{homeId}/{room}/cmd       Web -> Pi/ESP32 {mode} | {device, value}
//   smarthome/{homeId}/{room}/event     Pi -> Web      {actor, action}            (nhật ký thao tác tự động)
//   smarthome/{homeId}/{room}/alert     Pi -> Web      {event: start|end, type: 'gas', ...}
//
//   smarthome/{homeId}/{room}/config    Pi -> ESP32    {gasThreshold, offDelaySec}  (retained, từ cài đặt nhà)
//
// Web không nói MQTT trực tiếp: Pi (gateway/) chép các bản tin trên sang Realtime Database
//   live/{homeId}/{room}/{sensors|state|event|alert}   Pi ghi, web nghe
//   cmd/{homeId}/{room}                                web ghi lệnh, Pi chuyển xuống ESP32
//   settings/{homeId}                                  web ghi cài đặt, Pi gửi xuống ESP32 + dùng khi gửi Gmail
// Chưa cấu hình Realtime Database hoặc VITE_REALTIME=mock → dùng MockClient (giả lập).
import { onValue, ref, serverTimestamp, set } from 'firebase/database'
import { rtdb } from './firebase'
import { createSimulator } from './simulator'
import { ROOM_IDS } from '../data/constants'

export const USE_SIMULATOR = !rtdb || import.meta.env.VITE_REALTIME === 'mock'

export const topic = (homeId, room, kind) => `smarthome/${homeId}/${room}/${kind}`

function createFirebaseClient(homeId) {
  const listeners = new Set()
  const since = Date.now()
  const offs = ROOM_IDS.flatMap((room) =>
    ['sensors', 'state', 'event', 'alert'].map((kind) =>
      onValue(
        ref(rtdb, `live/${homeId}/${room}/${kind}`),
        (snap) => {
          const payload = snap.val()
          if (!payload) return
          if (kind === 'event' && payload.ts < since) return // nhật ký cũ đã ghi lúc trước
          listeners.forEach((fn) => fn(topic(homeId, room, kind), payload))
        },
        (e) => console.error(`Không đọc được live/${homeId}/${room}/${kind}`, e),
      ),
    ),
  )

  return {
    onMessage: (fn) => listeners.add(fn),
    publish(t, payload) {
      const [, , room] = t.split('/')
      set(ref(rtdb, `cmd/${homeId}/${room}`), { ...payload, ts: serverTimestamp() }).catch((e) =>
        console.error('Không gửi được lệnh', e),
      )
    },
    end: () => {
      offs.forEach((off) => off())
      listeners.clear()
    },
  }
}

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
  client = USE_SIMULATOR ? createMockClient(homeId, getSettings) : createFirebaseClient(homeId)
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

// Cài đặt nhà đang lưu ở trình duyệt (store/db.js) → chép lên để Pi dùng (ngưỡng gas, thời gian tự tắt, email)
// shortcut: máy nào lưu sau thì thắng, hết khi chuyển cài đặt sang Firestore
export function syncSettings(homeId, { gasThreshold, offDelayMin, alertEmails }) {
  if (USE_SIMULATOR || !homeId) return
  set(ref(rtdb, `settings/${homeId}`), { gasThreshold, offDelayMin, alertEmails }).catch((e) =>
    console.error('Không đồng bộ được cài đặt nhà', e),
  )
}

// Chỉ dành cho giai đoạn giả lập
export function getSimState(room) {
  return client?.simulator?.getSimState(room) ?? { gasLeak: false, presenceOverride: null, nodeId: 1 }
}
