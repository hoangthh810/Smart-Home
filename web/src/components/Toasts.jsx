import { CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { useLive } from '../store/live'

const STYLES = {
  info: { icon: Info, cls: 'border-blue-200 bg-blue-50 text-blue-800' },
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { icon: XCircle, cls: 'border-red-200 bg-red-50 text-red-800' },
}

export default function Toasts() {
  const toasts = useLive((s) => s.toasts)
  const remove = useLive((s) => s.removeToast)

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto">
      {toasts.map((t) => {
        const { icon: Icon, cls } = STYLES[t.type] ?? STYLES.info
        return (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg ${cls}`}>
            <Icon size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1 break-words">{t.message}</p>
            <button onClick={() => remove(t.id)} className="cursor-pointer opacity-60 hover:opacity-100" aria-label="Đóng">
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
