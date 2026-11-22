'use client'

import { useState } from 'react'
import { Security, Report, CorporateAction, KlineSeries, ReportPeriod, availableStocks, periodLabels, StockOption, parseDate } from '@/lib/types'
import SecurityHeader from './SecurityHeader'
import KeyMetrics from './KeyMetrics'
import TrendChart from './TrendChart'
import KLineChart from './KLineChart'
import DividendTable from './DividendTable'
import ShareStructureTable from './ShareStructureTable'
import CollapsibleSection from './CollapsibleSection'

interface DashboardProps {
  initialStock: StockOption
  security: Security
  reports: Report[]
  actions: CorporateAction[]
  kline: KlineSeries[]
}

const periods: ReportPeriod[] = ['annual', 'q1', 'half', 'q3']

const yearOptions = [
  { value: 5, label: '近5年' },
  { value: 10, label: '近10年' },
  { value: 0, label: '全部' },
]

export default function Dashboard({ initialStock, security, reports, actions, kline }: DashboardProps) {
  const [activeStock, setActiveStock] = useState<string>(initialStock.id)
  const [activePeriod, setActivePeriod] = useState<ReportPeriod>('annual')
  const [yearsLimit, setYearsLimit] = useState<number>(5)

  return (
    <div className="flex min-h-screen">
      {/* 左侧导航 */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800">股票列表</h2>
          <p className="text-xs text-slate-500 mt-1">点击切换股票</p>
        </div>
        <nav className="px-4 pb-6">
          {availableStocks.map((stock) => (
            <button
              key={stock.id}
              onClick={() => setActiveStock(stock.id)}
              className={`w-full text-left px-4 py-3 rounded-lg mb-2 text-sm transition-colors ${
                activeStock === stock.id
                  ? 'bg-moutai-50 text-moutai-800 border border-moutai-200 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{stock.name}</span>
                <span className="text-xs opacity-70">{stock.code}</span>
              </div>
              {stock.industry && (
                <span className="text-xs opacity-60 block mt-1">{stock.industry}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            当前仅接入贵州茅台数据。
            <br />
            后续添加股票后可直接切换。
          </p>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 min-w-0 bg-slate-50">
        <SecurityHeader security={security} />
        <div className="max-w-7xl mx-auto px-6 pb-12">
          <div className="py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-800">报告期与年份范围</h2>
              <div className="flex flex-wrap gap-2">
                {periods.map((period) => (
                  <button
                    key={period}
                    onClick={() => setActivePeriod(period)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activePeriod === period
                        ? 'bg-moutai-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {periodLabels[period]}
                  </button>
                ))}
                <div className="w-px h-8 bg-slate-300 mx-1 hidden sm:block" />
                {yearOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setYearsLimit(opt.value === 0 ? Infinity : opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      (opt.value === 0 ? yearsLimit === Infinity : yearsLimit === opt.value)
                        ? 'bg-slate-800 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              默认展示{periodLabels['annual']}近5年对比；点击按钮可切换报告期类型或年份范围。
            </p>
          </div>

          <KeyMetrics reports={reports} period={activePeriod} />

          <section className="py-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">趋势图表 · {periodLabels[activePeriod]}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendChart
                reports={reports}
                title="营业总收入"
                metricCodes={['total_operate_income']}
                unit="亿元"
                color="#cd3333"
                period={activePeriod}
                yearsLimit={yearsLimit === Infinity ? undefined : yearsLimit}
              />
              <TrendChart
                reports={reports}
                title="归母净利润"
                metricCodes={['parent_netprofit']}
                unit="亿元"
                color="#2563eb"
                period={activePeriod}
                yearsLimit={yearsLimit === Infinity ? undefined : yearsLimit}
              />
            </div>
          </section>

          <section className="py-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">K 线图</h2>
            <KLineChart kline={kline} />
          </section>

          <CollapsibleSection
            title="分红送转"
            summary={
              <span>
                共 {actions.filter(a => a.event_type === 'dividends').length} 条记录，
                最新一次：{actions.filter(a => a.event_type === 'dividends').sort((a, b) => parseDate(b.effective_date).getTime() - parseDate(a.effective_date).getTime())[0]?.reason || '无'}
              </span>
            }
          >
            <DividendTable actions={actions} />
          </CollapsibleSection>

          <CollapsibleSection
            title="股本变化"
            summary={
              <span>
                共 {actions.filter(a => a.event_type === 'share_structure').length} 条记录，
                当前总股本：{actions.filter(a => a.event_type === 'share_structure').sort((a, b) => parseDate(b.effective_date).getTime() - parseDate(a.effective_date).getTime())[0]?.total_shares || '无'} 股
              </span>
            }
          >
            <ShareStructureTable actions={actions} />
          </CollapsibleSection>

          <footer className="py-12 text-center text-slate-400 text-sm">
            <p>数据来源：svc_value · {security.name} {security._id}</p>
            <p className="mt-1">本地展示，仅供研究</p>
          </footer>
        </div>
      </main>
    </div>
  )
}
