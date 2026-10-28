// Biểu tượng hero: ô kính chứa logo + các cảm biến bay quanh quỹ đạo.
// Chỉ animate transform/opacity để mượt.
import { Fan, Flame, Lightbulb, Thermometer, UserCheck, Zap } from 'lucide-react'
import { LogoIcon } from './BrandMark'

const OUTER = [
  { icon: Thermometer, angle: 20, cls: 'text-rose-300' },
  { icon: Lightbulb, angle: 140, cls: 'text-amber-200' },
  { icon: Zap, angle: 260, cls: 'text-violet-200' },
]
const INNER = [
  { icon: Flame, angle: 80, cls: 'text-orange-300' },
  { icon: Fan, angle: 200, cls: 'text-sky-300' },
  { icon: UserCheck, angle: 320, cls: 'text-emerald-300' },
]

function Orbit({ items, radius, reverse }) {
  return (
    <div className={`absolute inset-0 ${reverse ? 'spin-rev' : 'spin-slow'}`}>
      {items.map(({ icon: Icon, angle, cls }) => (
        <div
          key={angle}
          className="absolute"
          style={{
            left: `${50 + radius * Math.cos((angle * Math.PI) / 180)}%`,
            top: `${50 + radius * Math.sin((angle * Math.PI) / 180)}%`,
          }}
        >
          {/* quay ngược để icon luôn đứng thẳng */}
          <div className={reverse ? 'spin-slow' : 'spin-rev'}>
            <span className="-ml-6 -mt-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#13153a]/90 shadow-lg shadow-black/40">
              <Icon size={20} className={cls} />
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Dàn đều 6 cảm biến trên một quỹ đạo (dùng khi không có quỹ đạo trong)
const ALL = [...OUTER, ...INNER].map((it, i) => ({ ...it, angle: i * 60 + 15 }))

/** center: hiện ô kính logo ở giữa; inner: hiện quỹ đạo trong (nếu tắt, 6 cảm biến dồn ra quỹ đạo ngoài) */
export default function HeroEmblem({ className = '', center = true, inner = true }) {
  return (
    <div className={className} aria-hidden>
     <div className="relative aspect-square w-full">
      {/* quầng sáng tĩnh */}
      <div className="absolute inset-[18%] rounded-full bg-[radial-gradient(closest-side,rgba(124,108,255,0.5),rgba(255,184,107,0.12),transparent)]" />

      {/* đường quỹ đạo */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 400" fill="none">
        <circle cx="200" cy="200" r="190" stroke="rgba(255,255,255,0.08)" />
        {inner && <circle cx="200" cy="200" r="138" stroke="rgba(185,176,255,0.14)" strokeDasharray="4 8" />}
      </svg>

      <Orbit items={inner ? OUTER : ALL} radius={47.5} />
      {inner && <Orbit items={INNER} radius={34.5} reverse />}

      {/* ô kính chứa logo */}
      {center && (
      <div className="float-y absolute inset-[31%]">
        <div className="relative h-full w-full rounded-[2rem] bg-gradient-to-br from-violet-300/70 via-white/10 to-amber-300/60 p-px shadow-[0_30px_80px_-10px_rgba(90,70,255,0.55)]">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[calc(2rem-1px)] bg-gradient-to-br from-[#23267a] via-[#11134a] to-[#080a24]">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
            <LogoIcon size={84} />
          </div>
        </div>
      </div>
      )}
     </div>
    </div>
  )
}
