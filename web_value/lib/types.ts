export interface Security {
  _id: string
  code: string
  name: string
  exchange: string
  status: string
  listing_date: { $date: string }
  industry_name?: string
  area_name?: string
  board?: string
  is_st?: boolean
}

export interface Fact {
  metric_code: string
  source_metric_code: string
  value_text: string
  currency: string
}

export interface Report {
  _id: string
  security_id: string
  statement_type: 'balance_sheet' | 'income_statement' | 'cash_flow_statement' | 'financial_indicator'
  report_period_end: { $date: string }
  report_period?: string
  facts: Fact[]
  observed_at: { $date: string }
  pit_status: string
}

export interface CorporateAction {
  _id: string
  security_id: string
  event_type: 'dividends' | 'share_structure' | 'name_changes'
  effective_date: { $date: string }
  announced_at?: { $date: string }
  cash_per_10?: string
  stock_per_10?: string
  transfer_per_10?: string
  total_shares?: string
  tradable_shares?: string
  reason?: string
  implemented: boolean
}

export interface StockOption {
  id: string
  code: string
  name: string
  industry?: string
}

export const availableStocks: StockOption[] = [
  { id: '600519.XSHG', code: '600519', name: '贵州茅台', industry: '白酒Ⅱ' },
  // 未来在此处添加其他股票即可
]

export function parseDate(d: { $date: string } | string | undefined): Date {
  if (!d) return new Date(0)
  const str = typeof d === 'string' ? d : d.$date
  return new Date(str)
}

export function formatDate(d: { $date: string } | string | undefined): string {
  const date = parseDate(d)
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatNumber(v: string | number | undefined, decimals = 2): string {
  if (v === undefined || v === null || v === '') return '-'
  const n = typeof v === 'string' ? parseFloat(v) : v
  if (isNaN(n)) return String(v)
  return n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function getFactValue(report: Report | undefined, codes: string[]): string | undefined {
  if (!report) return undefined
  const fact = report.facts.find(f => codes.includes(f.metric_code) || codes.includes(f.source_metric_code))
  return fact?.value_text
}

export type ReportPeriod = 'annual' | 'q1' | 'half' | 'q3'

export const periodLabels: Record<ReportPeriod, string> = {
  annual: '年报',
  q1: '一季报',
  half: '半年报',
  q3: '三季报',
}

export function getReportPeriod(r: Report): ReportPeriod | null {
  const month = parseDate(r.report_period_end).getMonth()
  if (month === 11) return 'annual'
  if (month === 2) return 'q1'
  if (month === 5) return 'half'
  if (month === 8) return 'q3'
  return null
}

export function filterByPeriod(reports: Report[], period: ReportPeriod): Report[] {
  return reports.filter(r => getReportPeriod(r) === period)
}

export interface KlinePoint {
  date: { $date: string }
  open: string
  high: string
  low: string
  close: string
  volume: string
  amount?: string
  observed_at?: { $date: string }
}

export interface KlineSeries {
  _id: string
  security_id: string
  year: number
  type: string
  points: KlinePoint[]
}

export function annualReports(reports: Report[]): Report[] {
  return filterByPeriod(reports, 'annual')
}

export function quarterlyReports(reports: Report[]): Report[] {
  return reports.filter(r => getReportPeriod(r) !== 'annual')
}
