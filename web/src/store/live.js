// Trạng thái thời gian thực (không lưu lại): dữ liệu cảm biến, thiết bị, thông báo nhanh
import { create } from 'zustand'

const HISTORY_POINTS = 90
let toastId = 0

const emptyRoom = () => ({ sensors: {}, mode: 'auto', devices: {}, alarm: false, updatedAt: null })

export const useLive = create((set) => ({
  connected: false,
  rooms: { living: emptyRoom(), kitchen: emptyRoom() },
  history: { living: [], kitchen: [] },
  toasts: [],
  dismissedAlerts: {}, // alertId -> thời điểm bấm "Ẩn tạm"

  setConnected: (connected) => set({ connected }),

  onSensors(room, sensors) {
    const t = new Date()
    const point = {
      t: t.getTime(),
      time: t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...sensors,
    }
    set((s) => ({
      rooms: { ...s.rooms, [room]: { ...s.rooms[room], sensors, updatedAt: t.toISOString() } },
      history: { ...s.history, [room]: [...s.history[room], point].slice(-HISTORY_POINTS) },
    }))
  },

  onState(room, { mode, devices, alarm }) {
    set((s) => ({ rooms: { ...s.rooms, [room]: { ...s.rooms[room], mode, devices, alarm } } }))
  },

  pushToast(message, type = 'info') {
    const id = ++toastId
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

  dismissAlert: (alertId) =>
    set((s) => ({ dismissedAlerts: { ...s.dismissedAlerts, [alertId]: new Date().toISOString() } })),

  reset: () =>
    set({ connected: false, rooms: { living: emptyRoom(), kitchen: emptyRoom() }, history: { living: [], kitchen: [] } }),
}))
