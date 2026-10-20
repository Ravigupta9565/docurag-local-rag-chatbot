import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

export default function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
        }

        const borderColors = {
          success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200',
          error: 'border-rose-500/40 bg-rose-950/80 text-rose-200',
          warning: 'border-amber-500/40 bg-amber-950/80 text-amber-200',
          info: 'border-sky-500/40 bg-sky-950/80 text-sky-200'
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 ${borderColors[t.type || 'info']}`}
          >
            {icons[t.type || 'info']}
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {t.message}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-white transition-colors p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
