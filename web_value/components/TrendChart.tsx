'use client'

import { useRef, useEffect } from 'react'
import { Report, ReportPeriod, parseDate, getFactValue, formatNumber, filterByPeriod, periodLabels } from '@/lib/types'

interface TrendChartProps {
  reports: Report[]
  title: string
  metricCodes: string[]
  unit: string
  color: string
  period: ReportPeriod
  yearsLimit?: number
}

export default function TrendChart({ reports, title, metricCodes, unit, color, period, yearsLimit }: TrendChartProps) {
  const filtered = reports
    .filter(r => r.statement_type === 'income_statement')
    .filter(r => filterByPeriod([r], period).length > 0)
    .sort((a, b) => parseDate(b.report_period_end).getTime() - parseDate(a.report_period_end).getTime())
    .slice(0, yearsLimit ?? Infinity)
    .sort((a, b) => parseDate(a.report_period_end).getTime() - parseDate(b.report_period_end).getTime())

  const points = filtered.map(r => {
    const raw = getFactValue(r, metricCodes)
    const value = raw ? parseFloat(raw) / 100000000 : 0
    return {
      label: parseDate(r.report_period_end).getFullYear().toString(),
      value,
    }
  }).filter(p => p.value > 0)

  if (points.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{title} · {periodLabels[period]}</h3>
        <p className="text-slate-500">无可用{periodLabels[period]}数据</p>
      </div>
    )
  }

  const max = Math.max(...points.map(p => p.value))
  const height = 160
  const barWidth = 48
  const gap = 16
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollLeft = el.scrollWidth
    }
  }, [points.length, period])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title} · {periodLabels[period]}</h3>
      <div ref={scrollRef} className="overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div
          className="flex items-end gap-4 min-w-full"
          style={{ width: `${points.length * (barWidth + gap)}px`, minWidth: '100%' }}
        >
          {points.map((p, idx) => {
            const h = max > 0 ? (p.value / max) * height : 0
            return (
              <div key={idx} className="flex flex-col items-center gap-2" style={{ width: barWidth, flexShrink: 0 }}>
                <div
                  className="w-full rounded-t"
                  style={{ height: `${h}px`, backgroundColor: color, minHeight: '4px' }}
                />
                <div className="text-xs text-slate-500 text-center">{p.label}</div>
                <div className="text-xs font-medium text-slate-700 text-center">{formatNumber(p.value, 1)}</div>
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-4 text-right">单位：{unit} · 左右滑动查看全部</p>
    </div>
  )
}
