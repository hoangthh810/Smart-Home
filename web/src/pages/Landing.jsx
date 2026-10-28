import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Cloud, Cpu, Fan, Flame, Lightbulb, Mail, Menu, MonitorSmartphone, Plus, Router, UserCheck, X, Zap } from 'lucide-react'
import { homePathOf, useCurrentUser } from '../store/auth'
import BrandMark, { LogoIcon } from '../components/landing/BrandMark'
import HeroEmblem from '../components/landing/HeroEmblem'
import { BlurWords, Reveal, Scramble, ScrollWords, useScrollFrame } from '../components/landing/effects'

const NAV = [
  { href: '#giai-phap', label: 'Giải pháp' },
  { href: '#cach-hoat-dong', label: 'Cách hoạt động' },
  { href: '#hoi-dap', label: 'Hỏi đáp' },
]

export default function Landing() {
  const user = useCurrentUser()
  const cta = user ? { to: homePathOf(user), label: 'Vào bảng điều khiển' } : { to: '/dang-nhap', label: 'Đăng nhập' }

  return (
    <div className="bg-night font-display text-white selection:bg-violet-500/40">
      <IconGradientDefs />
      <TopNav cta={cta} />
      <Hero cta={cta} />
      <IsThisYou />
      <Solutions />
      <HowItWorks />
      <Vision />
      <Faq />
      <FinalCta cta={cta} />
    </div>
  )
}

// Gradient dùng chung cho icon lucide (stroke="url(#icon-grad)")
function IconGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <linearGradient id="icon-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d6d0ff" />
          <stop offset="50%" stopColor="#7c6cff" />
          <stop offset="100%" stopColor="#4a3df0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ------------------------------------------------------------------ */

function GlowButton({ to, children }) {
  return (
    <Link to={to} className="group relative inline-flex w-fit self-start rounded-full p-px lg:self-auto">
      <span className="glow-border absolute inset-0 rounded-full bg-gradient-to-r from-violet-500/60 via-white/20 to-amber-300/70" />
      <span className="absolute inset-0 rounded-full opacity-0 blur-lg transition group-hover:opacity-60 bg-gradient-to-r from-violet-500 to-amber-300" />
      <span className="relative flex items-center gap-3 rounded-full bg-[#14163a] py-1.5 pr-6 pl-1.5 transition group-hover:bg-[#1b1d48]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#2a2470] to-[#0d0f2e] ring-1 ring-white/15">
          <LogoIcon size={24} />
        </span>
        <span className="text-[15px] font-semibold">{children}</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
      </span>
    </Link>
  )
}

function Beam({ className = '' }) {
  return (
    <div
      aria-hidden
      className={`beam pointer-events-none absolute h-[260px] w-[1100px] origin-top-left rotate-[38deg] bg-gradient-to-r from-amber-100/25 via-violet-200/10 to-transparent blur-3xl ${className}`}
    />
  )
}

function SectionTitle({ eyebrow, children, aside }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <Reveal className="lg:col-span-2">
        <span className="eyebrow">[ {eyebrow} ]</span>
      </Reveal>
      <Reveal delay={80} className={aside ? 'lg:col-span-6' : 'lg:col-span-10'}>
        <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-[3.6rem]">{children}</h2>
      </Reveal>
      {aside && (
        <Reveal delay={160} className="lg:col-span-4">
          <p className="text-base leading-relaxed text-slate-400">{aside}</p>
        </Reveal>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function TopNav({ cta }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-night/85 backdrop-blur-md' : ''}`}>
      <div className="mx-auto flex h-20 max-w-7xl items-center px-5 sm:px-8">
        <a href="#top" className="blur-in" aria-label="Về đầu trang">
          <BrandMark dark />
        </a>
        <nav className="blur-in absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur md:flex" style={{ animationDelay: '100ms' }}>
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="rounded-full px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="blur-in ml-auto flex items-center gap-2" style={{ animationDelay: '200ms' }}>
          <Link to={cta.to} className="hidden items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-night transition hover:bg-lilac sm:inline-flex">
            {cta.label} <ArrowUpRight size={16} />
          </Link>
          <button onClick={() => setOpen(!open)} className="cursor-pointer rounded-full p-2 md:hidden" aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-night/95 px-5 pb-6 backdrop-blur md:hidden">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="block py-3 text-slate-200">
              {n.label}
            </a>
          ))}
          <Link to={cta.to} className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-white py-3 text-sm font-semibold text-night">
            {cta.label} <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </header>
  )
}

/* ------------------------------------------------------------------ */

function Hero({ cta }) {
  return (
    <section id="top" className="relative flex min-h-screen items-center overflow-hidden">
      <Beam className="-top-24 -left-32" />
      <HeroEmblem className="pointer-events-none absolute top-1/2 right-[4%] hidden w-[380px] -translate-y-1/2 lg:block xl:right-[7%] xl:w-[440px]" />

      <div className="relative mx-auto w-full max-w-7xl px-5 pt-28 pb-20 sm:px-8 lg:pl-24">
        <h1 className="max-w-4xl text-[2.2rem] leading-[1.1] font-semibold tracking-tight sm:text-6xl lg:text-[3.8rem] xl:text-[4.2rem]">
          <span className="block">
            <BlurWords text="Biến ngôi nhà" className="text-white" />
            <BlurWords text={'của bạn'} delay={140} className="text-grad" />
          </span>
          <span className="block">
            <BlurWords text="thành tổ ấm" delay={280} className="text-white" />
            <BlurWords text="thông minh." delay={420} className="text-grad-warm" />
          </span>
        </h1>

        <p className="blur-in mt-8 max-w-lg text-[17px] leading-relaxed text-slate-400" style={{ animationDelay: '650ms' }}>
          Hệ thống giúp bạn <b className="font-semibold text-white">giám sát môi trường</b>,{' '}
          <b className="font-semibold text-white">điều khiển thiết bị từ xa</b> và{' '}
          <b className="font-semibold text-white">nhận cảnh báo khí gas</b> ngay khi có sự cố.
        </p>

        <div className="blur-in mt-14 flex flex-col gap-10 sm:mt-20 lg:flex-row lg:items-end lg:gap-24" style={{ animationDelay: '800ms' }}>
          <GlowButton to={cta.to}>{cta.label} để bắt đầu</GlowButton>
          <div>
            <p className="text-[15px] text-lilac">“Phát hiện rò rỉ gas chỉ sau 2 giây.”</p>
            <p className="mt-1 text-xs text-slate-500">Cảm biến MQ-2 · Phòng bếp</p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

// Đoạn "Đây có phải là bạn?" – dính màn hình, các nỗi lo hiện/ẩn theo tiến độ cuộn
const PAINS = [
  { text: 'Ra khỏi nhà mới nhớ chưa tắt quạt', pos: 'left-[6%] top-[18%] sm:left-[16%]', at: 0.05 },
  { text: 'Lo rò rỉ gas khi không ai ở nhà', pos: 'right-[6%] top-[66%] sm:right-[10%] sm:top-[64%]', at: 0.22 },
  { text: 'Không biết tháng này tốn bao nhiêu tiền điện', pos: 'left-[6%] bottom-[14%] sm:left-[22%]', at: 0.4 },
  { text: 'Đèn bật cả ngày dù chẳng ai trong phòng', pos: 'right-[6%] top-[16%] sm:right-[16%] sm:top-[14%]', at: 0.58 },
  { text: 'Muốn biết trong nhà đang nóng hay mát', pos: 'right-[6%] bottom-[10%] sm:right-[20%] sm:bottom-[14%]', at: 0.74 },
]

function Bracketed({ children }) {
  return (
    <span className="relative inline-block px-6 py-3 text-center text-base leading-snug font-semibold sm:text-xl">
      <span className="absolute top-0 left-0 h-2.5 w-2.5 border-t border-l border-white/40" />
      <span className="absolute right-0 bottom-0 h-2.5 w-2.5 border-r border-b border-white/40" />
      {children}
    </span>
  )
}

function IsThisYou() {
  const ref = useRef(null)
  const items = useRef([])

  // cập nhật thẳng style của từng dòng, không render lại React khi cuộn
  useScrollFrame(ref, (p) => {
    PAINS.forEach((pain, i) => {
      const el = items.current[i]
      if (!el) return
      // hiện trong khoảng [at, at + 0.3], mờ dần hai đầu
      const local = (p - pain.at) / 0.3
      const fade = local > 0 && local < 1 ? Math.min(1, local * 4, (1 - local) * 4) : 0
      el.style.opacity = fade
      el.style.transform = `translate3d(0, ${(0.5 - Math.min(1, Math.max(0, local))) * 40}px, 0) scale(${0.96 + fade * 0.04})`
    })
  })

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        <h2 className="absolute inset-0 flex items-center justify-center px-5 text-center text-5xl font-semibold tracking-tight sm:text-7xl lg:text-8xl">
          <span>
            <span className="text-white">Đây có phải </span>
            <span className="text-grad">là bạn?</span>
          </span>
        </h2>
        {PAINS.map((pain, i) => (
          <div
            key={pain.text}
            ref={(el) => (items.current[i] = el)}
            className={`absolute max-w-[70%] opacity-0 will-change-transform sm:max-w-sm ${pain.pos}`}
          >
            <Bracketed>{pain.text}</Bracketed>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Orb({ className = '' }) {
  return <span className={`inline-block h-7 w-7 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_30%,#fff_0%,#d9d2ff_25%,#8b7bff_55%,#ffb86b_100%)] shadow-[0_0_18px_rgba(167,139,250,0.8)] ${className}`} />
}

function GlowPill({ children, className = '' }) {
  return (
    <span className={`relative inline-flex rounded-full p-px shadow-[0_0_30px_rgba(124,108,255,0.35)] ${className}`}>
      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-400 via-violet-300/40 to-amber-300" />
      <span className="relative flex items-center gap-3 rounded-full bg-[#16183c] px-4 py-2.5 text-[15px] font-medium whitespace-nowrap text-white">{children}</span>
    </span>
  )
}

function FaintPill({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[15px] whitespace-nowrap text-slate-500 ${className}`}>
      {children}
    </span>
  )
}

function SolutionCard({ className = '', delay, title, desc, children }) {
  return (
    <Reveal delay={delay} className={`glass-card group flex flex-col overflow-hidden transition duration-500 hover:border-white/20 ${className}`}>
      <div className="relative h-56 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">{children}</div>
      <div className="p-6 pt-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">{desc}</p>
      </div>
    </Reveal>
  )
}

function useTicker(ms = 2000) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return tick
}

// Số nhiệt độ tự nhảy – tách riêng để chỉ component nhỏ này render lại
function LiveTemp() {
  const tick = useTicker(2200)
  return (29.2 + ((tick * 7) % 9) / 10).toFixed(1).replace('.', ',')
}

function LightCard() {
  const lightOn = useTicker(2200) % 2 === 0
  return (
    <div className="w-[115%] -rotate-[12deg] rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <Orb />
        <span className="flex-1 text-lg font-medium">Đèn phòng khách</span>
        <span className={`inline-flex h-7 w-12 items-center rounded-full transition-colors duration-500 ${lightOn ? 'bg-violet-500' : 'bg-white/15'}`}>
          <span className={`h-5 w-5 rounded-full bg-white transition-transform duration-500 ${lightOn ? 'translate-x-6' : 'translate-x-1'}`} />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-500">
        <Lightbulb size={15} className={lightOn ? 'text-amber-300' : ''} /> {lightOn ? 'Đang bật · Thủ công' : 'Đang tắt · Thủ công'}
      </div>
    </div>
  )
}

function Solutions() {

  return (
    <section id="giai-phap" className="relative scroll-mt-20 overflow-hidden px-5 py-28 sm:px-8 sm:py-36">
      <div className="relative mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Giải pháp"
          aside="Mỗi phòng có một bộ ESP32 với cảm biến riêng. Dữ liệu được đồng bộ liên tục để bạn luôn nắm được tình trạng ngôi nhà."
        >
          <span className="text-white">Ngôi nhà </span>
          <span className="text-grad">tự vận hành</span>
          <span className="text-white">, bạn chỉ việc tận hưởng</span>
        </SectionTitle>

        <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-12">
          <SolutionCard className="md:col-span-7" title="Giám sát theo thời gian thực" desc="Nhiệt độ, độ ẩm, ánh sáng, chuyển động và điện năng của từng phòng, cập nhật mỗi 2 giây.">
            <div className="absolute inset-0 flex -rotate-[14deg] flex-col items-center justify-center gap-5">
              <div className="drift flex gap-4">
                <FaintPill>Độ ẩm · 68%</FaintPill>
                <FaintPill>Chuyển động · Có người</FaintPill>
              </div>
              <div className="flex translate-x-10 gap-4">
                <GlowPill>
                  <Orb /> Nhiệt độ phòng khách · <LiveTemp /> °C
                </GlowPill>
              </div>
              <div className="drift flex -translate-x-8 gap-4 [animation-delay:-3s]">
                <FaintPill>Ánh sáng · 320 lux</FaintPill>
                <FaintPill>Công suất · 9,1 W</FaintPill>
              </div>
            </div>
          </SolutionCard>

          <SolutionCard className="md:col-span-5" delay={80} title="Điều khiển từ xa" desc="Bật tắt đèn, quạt của từng phòng chỉ với một chạm, dù bạn đang ở bất cứ đâu.">
            <div className="absolute inset-0 flex items-center justify-center">
              <LightCard />
            </div>
          </SolutionCard>

          <SolutionCard className="md:col-span-4" title="Tự động theo cảm biến" desc="Có người thì bật đèn và quạt, vắng người vài phút sẽ tự tắt để tiết kiệm điện.">
            <div className="absolute inset-0 flex -rotate-[14deg] flex-col items-start justify-center gap-4 pl-6">
              <GlowPill>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300"><UserCheck size={15} /></span>
                PIR · Phát hiện có người
              </GlowPill>
              <FaintPill className="ml-12">
                <Lightbulb size={16} /> Bật đèn
              </FaintPill>
              <FaintPill className="ml-24">
                <Fan size={16} /> Bật quạt
              </FaintPill>
            </div>
          </SolutionCard>

          <SolutionCard className="md:col-span-4" delay={80} title="Cảnh báo khí gas" desc="Vượt ngưỡng là còi kêu, web báo động và email gửi tới mọi thành viên trong nhà.">
            <div className="absolute inset-0 flex -rotate-[14deg] flex-col items-center justify-center gap-4">
              <FaintPill className="-translate-x-10">MQ-2 · 124 ppm · An toàn</FaintPill>
              <span className="relative inline-flex rounded-full p-px shadow-[0_0_40px_rgba(248,113,113,0.45)]">
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-rose-400 via-rose-300/30 to-amber-300" />
                <span className="relative flex items-center gap-3 rounded-full bg-[#2a1426] px-4 py-2.5 text-[15px] font-medium whitespace-nowrap">
                  <span className="flex h-7 w-7 animate-pulse items-center justify-center rounded-full bg-rose-500 text-white"><Flame size={15} /></span>
                  Rò rỉ gas · 512 ppm
                </span>
              </span>
              <FaintPill className="translate-x-12">
                <Mail size={16} /> Đã gửi tới 2 thành viên
              </FaintPill>
            </div>
          </SolutionCard>

          <SolutionCard className="md:col-span-4" delay={160} title="Điện năng & tiền điện EVN" desc="Thống kê theo giờ, ngày, tháng và tự tính tiền điện theo biểu giá bậc thang.">
            <div className="absolute inset-0 flex items-center justify-center">
              {/* các đường dẫn điện */}
              {[-60, -30, 0, 30, 60].map((y) => (
                <span key={y} className="absolute right-0 left-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" style={{ top: `calc(50% + ${y}px)` }} />
              ))}
              <div className="relative flex h-28 w-28 rotate-[-10deg] items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-br from-[#262a66] to-[#0d0f2e] shadow-[0_0_50px_rgba(124,108,255,0.45)]">
                <svg className="spin-slow absolute h-20 w-20 [animation-duration:6s]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="url(#icon-grad)" strokeWidth="8" strokeDasharray="70 40" strokeLinecap="round" />
                </svg>
                <Zap size={26} className="text-amber-200" />
              </div>
            </div>
          </SolutionCard>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    { label: 'BƯỚC 01 · CẢM BIẾN', icon: Cpu, title: 'ESP32 đọc cảm biến', desc: 'Nhiệt độ, độ ẩm, ánh sáng, gas, chuyển động, điện năng.' },
    { label: 'BƯỚC 02 · GATEWAY', icon: Router, title: 'Raspberry Pi xử lý', desc: 'MQTT broker, logic tự động, gửi email cảnh báo.' },
    { label: 'BƯỚC 03 · ĐÁM MÂY', icon: Cloud, title: 'Firebase đồng bộ', desc: 'Lưu trữ, đồng bộ thời gian thực, xác thực người dùng.' },
    { label: 'BƯỚC 04 · GIAO DIỆN', icon: MonitorSmartphone, title: 'Web trên mọi thiết bị', desc: 'Giám sát và điều khiển trên máy tính lẫn điện thoại.' },
  ]
  const tech = ['ESP32', 'Raspberry Pi 5', 'MQTT', 'Firebase', 'React', 'DHT22', 'MQ-2', 'BH1750', 'PIR', 'INA219']

  return (
    <section id="cach-hoat-dong" className="scroll-mt-20 px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <h2 className="text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl lg:text-[3.6rem]">
            <span className="text-white">Từ cảm biến tới màn hình, </span>
            <span className="text-grad">trong 2 giây</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 100} className="glass-card group flex min-h-[26rem] flex-col p-6 transition duration-500 hover:-translate-y-1 hover:border-white/20">
              <p className="eyebrow">
                [ <Scramble text={s.label} className="text-slate-400" /> ]
              </p>
              <div className="flex flex-1 items-center justify-center">
                <s.icon
                  size={120}
                  strokeWidth={1.4}
                  stroke="url(#icon-grad)"
                  className="drop-shadow-[0_0_28px_rgba(124,108,255,0.55)] transition duration-700 group-hover:scale-110 group-hover:-rotate-6"
                />
              </div>
              <h3 className="text-2xl leading-snug font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 flex flex-col gap-6 lg:flex-row lg:items-center">
          <p className="shrink-0 text-sm text-slate-500 lg:w-56">Xây dựng trên phần cứng và nền tảng mã nguồn mở, quen thuộc.</p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
            <div className="marquee flex w-max gap-12">
              {[...tech, ...tech].map((t, i) => (
                <span key={i} className="text-2xl font-semibold whitespace-nowrap text-slate-600">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function Vision() {
  return (
    <section className="px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-2">
          <span className="eyebrow">[ Tầm nhìn ]</span>
        </Reveal>
        <div className="lg:col-span-10">
          <Reveal>
            <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              <span className="text-white">Ngôi nhà </span>
              <span className="text-grad">biết lắng nghe</span>
            </h2>
          </Reveal>
          <ScrollWords
            className="mt-10 text-2xl leading-snug font-semibold sm:text-4xl sm:leading-[1.3]"
            parts={[
              { text: '“Khi bạn bước vào phòng,' },
              { text: 'đèn và quạt tự bật.', strong: true },
              { text: 'Khi bạn rời đi, chúng tự tắt sau vài phút. Và nếu căn bếp có mùi gas,' },
              { text: 'cả nhà nhận được cảnh báo chỉ sau vài giây', strong: true },
              { text: '– dù đang ở bất cứ đâu.”' },
            ]}
          />
          <Reveal className="mt-10 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2a2470] to-[#0d0f2e] ring-1 ring-white/15">
              <LogoIcon size={26} />
            </span>
            <span>
              <span className="block font-semibold">Nhà Thông Minh</span>
              <span className="text-sm text-slate-500">Đồ án 2 · Hệ thống IoT</span>
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

const FAQS = [
  ['Hệ thống có cần kết nối Internet không?', 'Các ESP32 giao tiếp với Raspberry Pi qua MQTT trong mạng nội bộ. Raspberry Pi cần Internet để đồng bộ dữ liệu lên Firebase và gửi email, nhờ đó bạn xem được nhà mình từ bất cứ đâu.'],
  ['Làm sao để có tài khoản?', 'Quản trị viên cấp tài khoản cho từng gia đình. Một nhà có thể có nhiều thành viên, mỗi người đăng nhập bằng tài khoản riêng và dùng chung thiết bị, cài đặt.'],
  ['Khi phát hiện rò rỉ gas, hệ thống làm gì?', 'Còi báo trong bếp kêu, web hiện cảnh báo đỏ và email được gửi tới mọi thành viên. Để an toàn, đèn và quạt giữ nguyên trạng thái, không bật tắt thiết bị điện. Nếu chưa ai xác nhận, quản trị viên có thể nhắc nhở thêm.'],
  ['Chế độ Tự động và Thủ công khác nhau thế nào?', 'Tự động: cảm biến PIR phát hiện có người sẽ bật đèn và quạt, vắng người sau vài phút sẽ tự tắt. Thủ công: bạn tự bật tắt bằng nút trên web. Chế độ được chọn riêng cho từng phòng.'],
  ['Tiền điện được tính như thế nào?', 'Cảm biến INA219 đo điện năng tiêu thụ của mỗi phòng. Hệ thống cộng dồn theo tháng và tính tiền theo biểu giá điện sinh hoạt bậc thang của EVN, đã gồm VAT.'],
]

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section id="hoi-dap" className="scroll-mt-20 px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-2">
        <Reveal>
          <span className="eyebrow">[ Hỏi đáp ]</span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="text-white">Câu hỏi </span>
            <span className="text-grad">thường gặp</span>
          </h2>
          <p className="mt-5 max-w-md text-slate-400">Những điều bạn cần biết trước khi bắt đầu sử dụng hệ thống.</p>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <Reveal key={q} delay={i * 60} className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02]">
                <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left" aria-expanded={isOpen}>
                  <span className="flex-1 font-semibold">{q}</span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                    <Plus size={15} />
                  </span>
                </button>
                <div className={`grid transition-all duration-500 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <p className="overflow-hidden px-5 text-[15px] leading-relaxed text-slate-400">
                    <span className="block pb-5">{a}</span>
                  </p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */

function FinalCta({ cta }) {
  return (
    <>
      <section className="relative overflow-hidden px-5 pt-20 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,108,255,0.45),rgba(255,184,107,0.1),transparent)]" />
        <div className="relative mx-auto max-w-4xl pb-64 text-center">
          <Reveal>
            <h2 className="text-5xl font-semibold tracking-tight sm:text-7xl">
              <span className="text-white">Sẵn sàng </span>
              <span className="text-grad-warm">về nhà?</span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mx-auto mt-6 max-w-lg text-slate-400">Đăng nhập bằng tài khoản được cấp để bắt đầu giám sát và điều khiển ngôi nhà của bạn.</p>
          </Reveal>
          <Reveal delay={200} className="mt-10 flex justify-center">
            <GlowButton to={cta.to}>{cta.label}</GlowButton>
          </Reveal>
        </div>
      </section>
      <footer className="border-t border-white/10 px-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 py-8 text-sm text-slate-500 sm:flex-row">
          <BrandMark dark size={24} />
          <p className="text-center">Đồ án 2 · Hệ thống giám sát và quản lý nhà thông minh</p>
        </div>
      </footer>
    </>
  )
}
