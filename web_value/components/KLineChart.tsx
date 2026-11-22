'use client'

import { useEffect, useRef, useState, useId } from 'react'
import { KlineSeries, parseDate } from '@/lib/types'

interface KLineChartProps {
  kline: KlineSeries[]
}

export default function KLineChart({ kline }: KLineChartProps) {
  const id = useId()
  const chartId = `kline-${id.replace(/:/g, '')}`
  const chartRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  const points = (kline || [])
    .flatMap(series => series.points || [])
    .filter(p => p.open && p.high && p.low && p.close)
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
    .map((p) => ({
      timestamp: parseDate(p.date).getTime(),
      open: parseFloat(p.open),
      high: parseFloat(p.high),
      low: parseFloat(p.low),
      close: parseFloat(p.close),
      volume: parseFloat(p.volume || '0'),
    }))

  useEffect(() => {
    let isMounted = true
    let resizeObserver: ResizeObserver | null = null

    const initChart = async () => {
      if (chartRef.current || points.length === 0) return

      const container = document.getElementById(chartId)
      if (!container) return
      container.innerHTML = ''

      try {
        const kc = await import('klinecharts')
        if (!isMounted) return

        const chart = kc.init(chartId, {
          styles: {
            candle: {
              bar: {
                upColor: '#cd3333',
                downColor: '#2563eb',
                noChangeColor: '#94a3b8',
              },
            },
          },
        })
        if (!chart) {
          setError('K 线图初始化失败')
          return
        }

        chart.applyNewData(points)
        chart.createIndicator('VOL', false, { id: 'vol-pane' })

        resizeObserver = new ResizeObserver(() => chart.resize())
        resizeObserver.observe(container)

        chartRef.current = chart
      } catch (err) {
        console.error('KLineChart init error:', err)
        setError(err instanceof Error ? err.message : 'K 线图加载失败')
      }
    }

    initChart()

    return () => {
      isMounted = false
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (chartRef.current) {
        try {
          chartRef.current.dispose()
        } catch (e) {
          // ignore
        }
        chartRef.current = null
      }
    }
  }, [points, chartId])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">K 线图</h3>
        <span className="text-sm text-slate-500">共 {points.length} 个交易日</span>
      </div>
      <div
        id={chartId}
        className="w-full rounded border border-slate-100"
        style={{ height: '420px' }}
      />
      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
      <p className="text-xs text-slate-400 mt-4 text-right">数据来源：svc_value · 日线</p>
    </div>
  )
}
