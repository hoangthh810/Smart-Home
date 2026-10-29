import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, BellRing, Eye, EyeOff, Lock, Mail, Power } from 'lucide-react'
import { homePathOf, useAuth, useCurrentUser } from '../store/auth'
import BrandMark from '../components/landing/BrandMark'
import HeroEmblem from '../components/landing/HeroEmblem'
import { BlurWords } from '../components/landing/effects'

const FEATURES = [
  { icon: Activity, title: 'Giám sát thời gian thực', desc: 'Nhiệt độ, độ ẩm, ánh sáng, khí gas cập nhật mỗi 2 giây', cls: 'text-violet-300' },
  { icon: Power, title: 'Điều khiển từ xa', desc: 'Bật tắt đèn, quạt của từng phòng ở bất cứ đâu', cls: 'text-sky-300' },
  { icon: BellRing, title: 'Cảnh báo tức thì', desc: 'Còi, web và email ngay khi phát hiện rò rỉ gas', cls: 'text-amber-300' },
]

function DarkInput({ icon: Icon, right, ...props }) {
  return (
    <div className="group relative">
      <Icon size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-500 transition group-focus-within:text-lilac" />
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] pr-12 pl-11 text-[15px] text-white placeholder-slate-600 outline-none transition focus:border-violet-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(124,108,255,0.15)]"
      />
      {right}
    </div>
  )
}

export default function Login() {
  const login = useAuth((s) => s.login)
  const user = useCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={homePathOf(user)} replace />

  // Đăng nhập thành công: hồ sơ tải xong thì <Navigate> ở trên tự chuyển trang
  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const err = await login(email, password)
    if (err) {
      setLoading(false)
      setError(err)
      setShakeKey((k) => k + 1)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-night font-display text-white">
      <div aria-hidden className="beam pointer-events-none absolute -top-24 -left-32 h-[260px] w-[1100px] origin-top-left rotate-[38deg] bg-gradient-to-r from-amber-100/25 via-violet-200/10 to-transparent blur-3xl" />

      <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="blur-in">
          <BrandMark dark />
        </Link>
        <Link to="/" className="blur-in inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white" style={{ animationDelay: '100ms' }}>
          <ArrowLeft size={15} /> Trang chủ
        </Link>
      </header>

      <main className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-12 px-5 pb-12 sm:px-8 lg:grid-cols-2">
        {/* giới thiệu (màn hình lớn) */}
        <div className="hidden lg:block">
          <h1 className="text-6xl leading-[1.08] font-semibold tracking-tight">
            <span className="block text-white">
              <BlurWords text="Chào mừng" />
            </span>
            <span className="block">
              <BlurWords text="bạn trở lại." delay={200} className="text-grad" />
            </span>
          </h1>
          <p className="blur-in mt-6 max-w-md text-[17px] leading-relaxed text-slate-400" style={{ animationDelay: '450ms' }}>
            Đăng nhập để xem tình trạng ngôi nhà, điều khiển thiết bị và nhận cảnh báo theo thời gian thực.
          </p>

          <ul className="mt-12 space-y-5">
            {FEATURES.map((f, i) => (
              <li key={f.title} className="blur-in flex items-center gap-4" style={{ animationDelay: `${600 + i * 120}ms` }}>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[#1d1f55] to-[#0b0d26] shadow-[0_8px_24px_-8px_rgba(124,108,255,0.5)]">
                  <f.icon size={20} className={f.cls} />
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="text-sm text-slate-400">{f.desc}</span>
                </span>
              </li>
            ))}
          </ul>

          <p className="blur-in mt-12 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-wide text-slate-500" style={{ animationDelay: '1000ms' }}>
            <span className="eyebrow">[ Nền tảng ]</span> ESP32 · Raspberry Pi 5 · MQTT · Firebase
          </p>
        </div>

        {/* form đăng nhập */}
        <div className="blur-in relative mx-auto w-full max-w-md" style={{ animationDelay: '200ms' }}>
          {/* cảm biến bay quanh form */}
          <HeroEmblem center={false} inner={false} className="pointer-events-none absolute top-1/2 left-1/2 hidden w-[720px] -translate-x-1/2 -translate-y-1/2 lg:block" />
          <div key={shakeKey} className={`relative rounded-3xl p-px ${shakeKey ? 'shake' : ''}`}>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-400/50 via-white/10 to-amber-300/40" />
            <div className="relative rounded-[calc(1.5rem-1px)] bg-[#0b0d26]/95 p-7 sm:p-9">
              <h2 className="text-2xl font-semibold lg:hidden">
                Chào mừng <span className="text-grad">trở lại.</span>
              </h2>
              <h2 className="hidden text-2xl font-semibold lg:block">Đăng nhập</h2>
              <p className="mt-1.5 text-sm text-slate-400">Sử dụng tài khoản được quản trị viên cấp.</p>

              <form onSubmit={submit} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm text-slate-300">Email</label>
                  <DarkInput
                    id="email"
                    type="email"
                    icon={Mail}
                    placeholder="vd: ten@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setError('')
                    }}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm text-slate-300">Mật khẩu</label>
                  <DarkInput
                    id="password"
                    icon={Lock}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    autoComplete="current-password"
                    required
                    right={
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-500 hover:text-white"
                        aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />
                </div>

                {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">{error}</p>}

                <button type="submit" disabled={loading} className="group relative mt-2 block w-full cursor-pointer rounded-xl p-px disabled:cursor-wait">
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500 to-amber-300 opacity-0 blur-lg transition group-hover:opacity-50" />
                  <span className="relative flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6a5cff] to-[#8f6bff] text-[15px] font-semibold shadow-[0_8px_30px_rgba(106,92,255,0.35)]">
                    {loading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <>
                        Đăng nhập <ArrowRight size={17} className="transition group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              <p className="mt-8 border-t border-white/10 pt-6 text-xs text-slate-500">
                Chưa có tài khoản? Liên hệ quản trị viên để được cấp. Thông tin đăng nhập sẽ được gửi qua email.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
