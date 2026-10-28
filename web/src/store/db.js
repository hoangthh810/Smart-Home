// "Cơ sở dữ liệu" giả lập, lưu trong localStorage.
// Khi có backend (FastAPI + SQLite), các hàm dưới đây sẽ được thay bằng lời gọi API.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSeed } from '../data/seed'
import { DEFAULT_HOME_SETTINGS } from '../data/constants'

const uid = () => Math.random().toString(36).slice(2, 10)
const nowIso = () => new Date().toISOString()
const MAX_LOGS = 500

export const useDb = create(
  persist(
    (set, get) => ({
      ...createSeed(),

      // ---------- Nhà ----------
      addHome({ name, address }) {
        const id = 'home_' + uid()
        set((s) => ({
          homes: [...s.homes, { id, name, address, createdAt: nowIso() }],
          settings: { ...s.settings, [id]: { ...DEFAULT_HOME_SETTINGS } },
        }))
        return id
      },
      updateHome(id, patch) {
        set((s) => ({ homes: s.homes.map((h) => (h.id === id ? { ...h, ...patch } : h)) }))
      },
      deleteHome(id) {
        set((s) => {
          const settings = { ...s.settings }
          delete settings[id]
          return {
            homes: s.homes.filter((h) => h.id !== id),
            users: s.users.filter((u) => u.homeId !== id),
            alerts: s.alerts.filter((a) => a.homeId !== id),
            logs: s.logs.filter((l) => l.homeId !== id),
            settings,
          }
        })
      },

      // ---------- Tài khoản ----------
      addUser(data) {
        const user = { id: 'u_' + uid(), role: 'user', status: 'active', createdAt: nowIso(), ...data }
        set((s) => {
          const settings = { ...s.settings }
          // Thành viên mới mặc định nhận email cảnh báo của nhà
          if (user.homeId && settings[user.homeId] && user.email) {
            const emails = settings[user.homeId].alertEmails
            if (!emails.includes(user.email)) {
              settings[user.homeId] = { ...settings[user.homeId], alertEmails: [...emails, user.email] }
            }
          }
          return { users: [...s.users, user], settings }
        })
        return user
      },
      updateUser(id, patch) {
        set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
      },
      deleteUser(id) {
        set((s) => ({ users: s.users.filter((u) => u.id !== id) }))
      },
      isUsernameTaken(username, exceptId) {
        return get().users.some((u) => u.username === username && u.id !== exceptId)
      },

      // ---------- Cài đặt nhà ----------
      updateSettings(homeId, patch) {
        set((s) => ({ settings: { ...s.settings, [homeId]: { ...s.settings[homeId], ...patch } } }))
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
    { name: 'smarthome-db', version: 1 },
  ),
)

// Đồng bộ giữa các tab (ví dụ: tab admin bấm "Nhắc nhở", tab user thấy ngay)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'smarthome-db') useDb.persist.rehydrate()
  })
}
