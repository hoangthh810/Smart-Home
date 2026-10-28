// Đăng nhập giả lập. Lưu theo sessionStorage để mỗi tab có thể đăng nhập một tài khoản khác nhau
// (tiện demo: 1 tab admin, 1 tab user).
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useDb } from './db'

export const useAuth = create(
  persist(
    (set) => ({
      userId: null,
      login(username, password) {
        const user = useDb.getState().users.find((u) => u.username === username.trim())
        if (!user || user.password !== password) return 'Sai tên đăng nhập hoặc mật khẩu'
        if (user.status === 'locked') return 'Tài khoản đã bị khoá. Vui lòng liên hệ quản trị viên'
        set({ userId: user.id })
        return null
      },
      logout() {
        set({ userId: null })
      },
    }),
    { name: 'smarthome-auth', storage: createJSONStorage(() => sessionStorage) },
  ),
)

// Trang chính sau khi đăng nhập
export const homePathOf = (user) => (user.role === 'admin' ? '/admin' : '/nha')

export function useCurrentUser() {
  const userId = useAuth((s) => s.userId)
  return useDb((s) => s.users.find((u) => u.id === userId) ?? null)
}

export function useCurrentHome() {
  const user = useCurrentUser()
  return useDb((s) => s.homes.find((h) => h.id === user?.homeId) ?? null)
}
