import { Report, ReportPeriod, getFactValue, formatNumber, filterByPeriod, periodLabels, parseDate } from '@/lib/types'

interface MetricDef {
  label: string
  codes: string[]
  statementType: 'income_statement' | 'balance_sheet' | 'financial_indicator'
  unit: string
  decimals: number
  scale?: number
}

const metrics: MetricDef[] = [
  { label: '营业总收入', codes: ['total_operate_income'], statementType: 'income_statement', unit: '亿元', decimals: 2, scale: 100000000 },
  { label: '归母净利润', codes: ['parent_netprofit'], statementType: 'income_statement', unit: '亿元', decimals: 2, scale: 100000000 },
  { label: '总资产', codes: ['total_assets'], statementType: 'balance_sheet', unit: '亿元', decimals: 2, scale: 100000000 },
  { label: '净资产', codes: ['total_parent_equity'], statementType: 'balance_sheet', unit: '亿元', decimals: 2, scale: 100000000 },
  { label: '基本每股收益', codes: ['basic_eps'], statementType: 'income_statement', unit: '元', decimals: 2 },
  { label: '加权平均 ROE', codes: ['roejq'], statementType: 'financial_indicator', unit: '%', decimals: 2 },
]

export default function KeyMetrics({ reports, period }: { reports: Report[]; period: ReportPeriod }) {
  const latestByType: Record<string, Report | undefined> = {}
  for (const m of metrics) {
    if (!latestByType[m.statementType]) {
      latestByType[m.statementType] = filterByPeriod(reports, period)
        .filter(r => r.statement_type === m.statementType)
        .sort((a, b) => parseDate(b.report_period_end).getTime() - parseDate(a.report_period_end).getTime())[0]
    }
  }

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">最新{periodLabels[period]}关键指标</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const report = latestByType[m.statementType]
          const raw = getFactValue(report, m.codes)
          let display = '-'
          if (raw) {
            const n = parseFloat(raw)
            if (!isNaN(n)) {
              const scaled = m.scale ? n / m.scale : n
              display = formatNumber(scaled, m.decimals) + ' ' + m.unit
            }
          }
          return (
            <div key={m.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <p className="text-slate-500 text-sm">{m.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{display}</p>
              {report && (
                <p className="text-xs text-slate-400 mt-2">
                  {parseDate(report.report_period_end).getFullYear()}年{periodLabels[period]}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
