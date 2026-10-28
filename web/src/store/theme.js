// Giao diện sáng/tối cho các trang sau đăng nhập (landing & đăng nhập luôn tối)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches

export const useTheme = create(
  persist(
    (set, get) => ({
      theme: prefersDark() ? 'dark' : 'light',
      toggle: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: 'smarthome-theme' },
  ),
)
