// Các hiệu ứng dùng cho landing page và trang đăng nhập
import { useEffect, useRef, useState } from 'react'

/**
 * Gọi `onProgress(p)` (p từ 0 -> 1) mỗi khung hình khi cuộn, KHÔNG gây render lại React.
 * mode 'sticky': 0 khi đỉnh phần tử chạm đầu màn hình, 1 khi đáy chạm cuối màn hình.
 * mode 'enter' : 0 khi phần tử vừa vào màn hình, 1 khi lên gần giữa màn hình.
 */
export function useScrollFrame(ref, onProgress, mode = 'sticky') {
  const cb = useRef(onProgress)
  cb.current = onProgress

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const p = mode === 'sticky' ? -r.top / Math.max(1, r.height - vh) : (vh - r.top - 120) / (vh * 0.6)
      cb.current(Math.min(1, Math.max(0, p)))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, mode])
}

/** Theo dõi phần tử đã vào màn hình chưa */
export function useInView(ref, threshold = 0.2) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, threshold])
  return inView
}

/** Hiện dần (mờ -> rõ) khi cuộn tới */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const visible = useInView(ref, 0.15)
  return (
    <Tag ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  )
}

/** Tiêu đề hiện từng từ (nhoè -> rõ) khi tải trang */
export function BlurWords({ text, className = '', delay = 0, step = 70 }) {
  return text.split(' ').map((w, i) => (
    <span key={i} className={`blur-in inline-block ${className}`} style={{ animationDelay: `${delay + i * step}ms` }}>
      {w}&nbsp;
    </span>
  ))
}

/** Chữ "xáo trộn" ký tự rồi hiện dần ra nội dung thật (hiệu ứng nhãn [ ... ]) */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%*_'
export function Scramble({ text, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, 0.5)
  const [out, setOut] = useState(text)

  useEffect(() => {
    if (!inView) return
    let frame = 0
    const total = text.length * 2 + 10
    const id = setInterval(() => {
      frame++
      const revealed = Math.floor((frame / total) * text.length)
      setOut(
        text
          .split('')
          .map((c, i) => (i < revealed || c === ' ' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join(''),
      )
      if (frame >= total) {
        clearInterval(id)
        setOut(text)
      }
    }, 35)
    return () => clearInterval(id)
  }, [inView, text])

  return (
    <span ref={ref} className={className}>
      {out}
    </span>
  )
}

/**
 * Đoạn văn chuyển từ xám sang trắng theo từng từ khi cuộn.
 * `parts`: [{ text, strong }] – phần strong sẽ sáng hơn khi hiện.
 */
export function ScrollWords({ parts, className = '' }) {
  const ref = useRef(null)
  const words = parts.flatMap((p) => p.text.split(' ').filter(Boolean).map((w) => ({ w, strong: p.strong })))
  const [lit, setLit] = useState(0)
  // chỉ render lại khi số từ được "thắp sáng" thay đổi
  useScrollFrame(ref, (p) => setLit((prev) => {
    const next = Math.round(p * words.length)
    return next === prev ? prev : next
  }), 'enter')

  return (
    <p ref={ref} className={className}>
      {words.map(({ w, strong }, i) => (
        <span key={i} className={`transition-colors duration-300 ${i < lit ? (strong ? 'text-white' : 'text-slate-400') : 'text-slate-700'}`}>
          {w}{' '}
        </span>
      ))}
    </p>
  )
}
