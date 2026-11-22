'use client'

import { useState } from 'react'

interface CollapsibleSectionProps {
  title: string
  summary: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({ title, summary, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="py-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex flex-col items-start gap-1">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <div className="text-sm text-slate-500">{summary}</div>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-sm">{open ? '收起' : '展开全部'}</span>
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div
          className={`transition-all duration-300 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
        >
          {children}
        </div>
      </div>
    </section>
  )
}
