// Phần dữ liệu còn giả lập, lưu trong localStorage: cài đặt nhà, cảnh báo, nhật ký, bảng giá EVN.
// Nhà và tài khoản đã chuyển lên Firebase (store/auth.js); phần này sẽ chuyển dần sang Firestore.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { createSeed } from '../data/seed'
import { DEFAULT_HOME_SETTINGS } from '../data/constants'

const uid = () => Math.random().toString(36).slice(2, 10)
const nowIso = () => new Date().toISOString()
const MAX_LOGS = 500

export const useDb = create(
  persist(
    (set, get) => ({
      ...createSeed(),

      // ---------- Cài đặt nhà ----------
      updateSettings(homeId, patch) {
        set((s) => ({ settings: { ...s.settings, [homeId]: { ...DEFAULT_HOME_SETTINGS, ...s.settings[homeId], ...patch } } }))
      },

      // ---------- Bảng giá EVN ----------
      setEvn(evn) {
        set({ evn })
      },

      // ---------- Cảnh báo ----------
      addAlert(data) {
        const alert = {
          id: 'a_' + uid(),
          type: 'gas',
          createdAt: nowIso(),
          resolvedAt: null,
          acknowledgedAt: null,
          acknowledgedBy: null,
          reminders: [],
          emailsSentTo: [],
          ...data,
        }
        set((s) => ({ alerts: [alert, ...s.alerts] }))
        return alert
      },
      updateAlert(id, patch) {
        set((s) => ({ alerts: s.alerts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }))
      },
      acknowledgeAlert(id, byName) {
        get().updateAlert(id, { acknowledgedAt: nowIso(), acknowledgedBy: byName })
      },
      remindAlert(id, byName) {
        const alert = get().alerts.find((a) => a.id === id)
        if (!alert) return
        get().updateAlert(id, { reminders: [...alert.reminders, { at: nowIso(), by: byName }] })
      },

      // ---------- Nhật ký hoạt động ----------
      addLog(entry) {
        set((s) => ({ logs: [{ id: 'l_' + uid(), at: nowIso(), ...entry }, ...s.logs].slice(0, MAX_LOGS) }))
      },

      resetDemo() {
        set(createSeed())
      },
    }),
    { name: 'smarthome-db', version: 2, migrate: () => createSeed() },
  ),
)

// Cài đặt của 1 nhà (nhà mới chưa lưu cài đặt thì dùng mặc định)
export const settingsOf = (state, homeId) => ({ ...DEFAULT_HOME_SETTINGS, ...state.settings[homeId] })
export const useHomeSettings = (homeId) => useDb(useShallow((s) => settingsOf(s, homeId)))

// Đồng bộ giữa các tab (ví dụ: tab admin bấm "Nhắc nhở", tab user thấy ngay)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'smarthome-db') useDb.persist.rehydrate()
  })
}
