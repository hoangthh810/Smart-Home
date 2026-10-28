import { useId } from 'react'

// Logo: mái nhà + sóng tín hiệu, tô gradient tím -> cam
export function LogoIcon({ size = 32 }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id={`${id}-g`} x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c7bfff" />
          <stop offset="0.55" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#ffb86b" />
        </linearGradient>
      </defs>
      <path d="M4.5 14.2 16 4.5l11.5 9.7V25a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 25V14.2Z" stroke={`url(#${id}-g)`} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M10.8 16.6a7.4 7.4 0 0 1 10.4 0" stroke={`url(#${id}-g)`} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M13.3 19.4a3.8 3.8 0 0 1 5.4 0" stroke={`url(#${id}-g)`} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="22.6" r="1.7" fill={`url(#${id}-g)`} />
    </svg>
  )
}

export default function BrandMark({ dark = false, size = 30 }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoIcon size={size} />
      <span className={`font-display text-[17px] font-semibold tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
        Nhà Thông Minh
      </span>
    </span>
  )
}
