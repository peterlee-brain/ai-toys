import { useEffect, useRef, type ReactNode } from 'react'
import { dispose, init, type Chart, type Period } from 'klinecharts'
import type { ChartBar } from './api'

type Props = {
  title: string
  subtitle?: string
  symbol: string
  period: Period
  bars: ChartBar[]
  emptyHint?: string
  headerExtra?: ReactNode
}

function barsFingerprint(bars: ChartBar[]) {
  if (!bars.length) return '0'
  const last = bars[bars.length - 1]
  return `${bars.length}:${last.timestamp}:${last.close}:${last.volume}`
}

export function KlinePanel({ title, subtitle, symbol, period, bars, emptyHint, headerExtra }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const barsRef = useRef(bars)
  const pushBarRef = useRef<((bar: ChartBar) => void) | null>(null)
  const lastFpRef = useRef('')
  barsRef.current = bars

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = init(el, {
      locale: 'zh-CN',
      timezone: 'UTC',
      styles: 'dark',
    })
    if (!chart) return
    chartRef.current = chart

    chart.setSymbol({ ticker: symbol || '—', pricePrecision: 4, volumePrecision: 6 })
    chart.setPeriod(period)
    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(barsRef.current)
      },
      subscribeBar: ({ callback }) => {
        pushBarRef.current = callback
      },
      unsubscribeBar: () => {
        pushBarRef.current = null
      },
    })

    const ro = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        try {
          chart.resize()
        } catch {
          /* ignore dispose race */
        }
      })
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      dispose(el)
      chartRef.current = null
      pushBarRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    chartRef.current?.setSymbol({ ticker: symbol || '—', pricePrecision: 4, volumePrecision: 6 })
  }, [symbol])

  useEffect(() => {
    chartRef.current?.setPeriod(period)
  }, [period])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const fp = barsFingerprint(bars)
    if (fp === lastFpRef.current) return
    lastFpRef.current = fp
    chart.resetData()
  }, [bars])

  return (
    <section className="panel">
      <header className="panel-head">
        <div className="panel-title">
          <div className="panel-title-row">
            <h2>{title}</h2>
            <span className="bar-count">{bars.length ? `${bars.length} bars` : emptyHint || 'no data'}</span>
          </div>
          {subtitle ? <p>{subtitle}</p> : null}
          {headerExtra}
        </div>
      </header>
      <div ref={containerRef} className="chart" />
    </section>
  )
}
