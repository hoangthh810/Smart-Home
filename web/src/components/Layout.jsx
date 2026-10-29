import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, BarChart3, Bell, ChefHat, History, LayoutDashboard, LogOut, Menu, Moon, ReceiptText,
  Settings, Sofa, Sun, User, Users, X, Zap,
} from 'lucide-react'
import { useAuth, useCurrentHome, useCurrentUser } from '../store/auth'
import { useDb } from '../store/db'
import { useLive } from '../store/live'
import { useRealtime } from '../hooks/useRealtime'
import { useTheme } from '../store/theme'
import GasAlertModal from './GasAlertModal'
import Toasts from './Toasts'
import { LogoIcon } from './landing/BrandMark'

const USER_NAV = [
  { to: '/nha', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/nha/phong/living', label: 'Phòng khách', icon: Sofa },
  { to: '/nha/phong/kitchen', label: 'Phòng bếp', icon: ChefHat },
  { to: '/nha/dien-nang', label: 'Điện năng', icon: Zap },
  { to: '/nha/lich-su', label: 'Lịch sử', icon: History },
  { to: '/nha/cai-dat', label: 'Cài đặt nhà', icon: Settings },
  { to: '/nha/tai-khoan', label: 'Tài khoản', icon: User },
]

const ADMIN_NAV = [
  { to: '/admin', label: 'Tổng quan', icon: BarChart3, end: true },
  { to: '/admin/nguoi-dung', label: 'Nhà & tài khoản', icon: Users },
  { to: '/admin/canh-bao', label: 'Cảnh báo', icon: Bell, badge: 'unack' },
  { to: '/admin/bang-gia', label: 'Bảng giá EVN', icon: ReceiptText },
  { to: '/admin/tai-khoan', label: 'Tài khoản', icon: User },
]

export default function Layout({ role }) {
  const [open, setOpen] = useState(false)
  const user = useCurrentUser()
  const home = useCurrentHome()
  const homesLoaded = useAuth((s) => s.homesLoaded)
  const logout = useAuth((s) => s.logout)
  const navigate = useNavigate()
  const unackCount = useDb((s) => s.alerts.filter((a) => !a.acknowledgedAt).length)

  useRealtime(role === 'user' ? home?.id : null)

  // Bật class .dark trên <html> khi đang ở trong app; gỡ ra khi rời app (landing/đăng nhập có giao diện riêng)
  const theme = useTheme((s) => s.theme)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    return () => document.documentElement.classList.remove('dark')
  }, [theme])

  const nav = role === 'admin' ? ADMIN_NAV : USER_NAV
  const handleLogout = async () => {
    await logout()
    navigate('/dang-nhap')
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-night">
          <LogoIcon size={24} />
        </span>
        <div>
          <p className="font-display font-bold text-slate-900">Nhà Thông Minh</p>
          <p className="text-xs text-slate-500">{role === 'admin' ? 'Quản trị hệ thống' : home?.name}</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            {badge === 'unack' && unackCount > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{unackCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium text-slate-800">{user?.fullName}</p>
          <p className="truncate text-xs text-slate-500">{user?.email}</p>
        </div>
        <button onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600">
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:block lg:h-screen">
        {sidebar}
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Đóng menu">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button onClick={() => setOpen(true)} className="cursor-pointer rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Mở menu">
            <Menu size={22} />
          </button>
          <p className="font-semibold text-slate-800 lg:hidden">Nhà Thông Minh</p>
          <div className="ml-auto flex items-center gap-3">
            {role === 'user' && <ConnectionStatus />}
            <ThemeToggle />
          </div>
        </header>

        {role === 'user' && <GasBanner />}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8">
          {role === 'user' && !home ? <NoHome loaded={homesLoaded} /> : <Outlet />}
        </main>
      </div>

      {role === 'user' && home && <GasAlertModal homeId={home.id} user={user} />}
      <Toasts />
    </div>
  )
}

function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggle}
      className="relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
      aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      title={dark ? 'Giao diện sáng' : 'Giao diện tối'}
    >
      <Sun size={18} className={`absolute transition duration-500 ${dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      <Moon size={18} className={`absolute transition duration-500 ${dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`} />
    </button>
  )
}

function ConnectionStatus() {
  const connected = useLive((s) => s.connected)
  return (
    <span className="flex items-center gap-2 text-xs text-slate-500" title="Đang dùng dữ liệu giả lập – chưa kết nối phần cứng">
      <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {connected ? 'Đang kết nối (giả lập)' : 'Mất kết nối'}
    </span>
  )
}

function GasBanner() {
  const alarm = useLive((s) => s.rooms.kitchen.alarm)
  const gas = useLive((s) => s.rooms.kitchen.sensors.gas)
  if (!alarm) return null
  return (
    <div className="flex items-center gap-2 bg-red-600 px-4 py-2 text-sm font-medium text-white lg:px-8">
      <AlertTriangle size={18} className="shrink-0" />
      Phòng bếp đang rò rỉ khí gas ({gas} ppm). Còi báo đang kêu – không bật/tắt thiết bị điện!
    </div>
  )
}

// Trang của user cần dữ liệu nhà: đang tải thì chờ, không có nhà thì báo
function NoHome({ loaded }) {
  if (!loaded) {
    return (
      <div className="flex justify-center py-24">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      </div>
    )
  }
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <h2 className="font-semibold">Tài khoản chưa được gắn với nhà nào</h2>
      <p className="mt-2 text-sm text-slate-500">Nhà của bạn có thể đã bị xoá. Vui lòng liên hệ quản trị viên.</p>
    </div>
  )
}
