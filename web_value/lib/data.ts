import fs from 'fs'
import path from 'path'
import { Security, Report, CorporateAction, KlineSeries, StockOption } from './types'

export * from './types'

function readJson<T>(filename: string): T[] {
  const filePath = path.join(process.cwd(), 'data', filename)
  const raw = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T[]
}

export function loadSecurity(): Security {
  return readJson<Security>('security.json')[0]
}

export function loadReports(): Report[] {
  return readJson<Report>('reports.json')
}

export function loadCorporateActions(): CorporateAction[] {
  return readJson<CorporateAction>('actions.json')
}

export function loadKlineData(): KlineSeries[] {
  return readJson<KlineSeries>('kline.json')
}

export function loadStockData(stockId: string): { security: Security; reports: Report[]; actions: CorporateAction[]; kline: KlineSeries[] } | null {
  if (stockId !== '600519.XSHG') return null
  return {
    security: loadSecurity(),
    reports: loadReports(),
    actions: loadCorporateActions(),
    kline: loadKlineData(),
  }
}
