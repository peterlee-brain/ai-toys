export type OndoAsset = {
  symbol: string
  ticker: string
  chain_id: string
  contract: string
  multiplier?: string
  synced_at_ms?: string
}

export type CandleBar = {
  open_time_ms: string | number
  close_time_ms?: string | number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export type KlineSeries = {
  source: string
  chain_id: string
  contract: string
  interval: string
  bars: CandleBar[]
}

export type MarketStatus = {
  market_status: string
  open_state: boolean
  reason_code?: string
  reason_msg?: string
  next_open_ms?: string | number
  next_close_ms?: string | number
  offhours_open_state?: boolean
  offhours_next_open_ms?: string | number
  offhours_next_close_ms?: string | number
  synced_at_ms?: string | number
  raw_json?: string
}

export type ChartBar = {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type QuoteMode = 'dex' | 'intent' | 'auto'

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

async function getJSON<T>(path: string, query: Record<string, string | number | undefined>): Promise<T> {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') continue
    qs.set(key, String(value))
  }
  const url = `${API_BASE}${path}?${qs.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export function listAssets(chainId = '56') {
  return getJSON<{ assets: OndoAsset[] }>('/v1/ondo/assets', { chain_id: chainId })
}

export function getMarketStatus() {
  return getJSON<MarketStatus>('/v1/ondo/market/status', {})
}

export function getBinanceKlines(contract: string, interval: string, limit = 300, chainId = '56') {
  return getJSON<KlineSeries>('/v1/ondo/klines/binance', {
    chain_id: chainId,
    contract,
    interval,
    limit,
  })
}

export function getOkxKlines(contract: string, interval: string, limit = 300, chainId = '56') {
  return getJSON<KlineSeries>('/v1/ondo/klines/okx', {
    chain_id: chainId,
    contract,
    interval,
    limit,
  })
}

export function getOkxQuote(
  contract: string,
  opts?: {
    chainId?: string
    amount?: string
    side?: 'buy' | 'sell'
    mode?: QuoteMode
  },
) {
  return getJSON<OkxQuote>('/v1/ondo/quote/okx', {
    chain_id: opts?.chainId ?? '56',
    contract,
    amount: opts?.amount ?? '20',
    side: opts?.side ?? 'buy',
    mode: opts?.mode ?? 'dex',
  })
}

export type OkxQuote = {
  chain_id: string
  side: string
  mode?: string
  quote_id?: string
  from_symbol: string
  to_symbol: string
  from_contract: string
  to_contract: string
  from_amount: string
  to_amount: string
  from_unit_price?: string
  to_unit_price?: string
  implied_price?: string
  price_impact_percent?: string
  estimate_gas_fee?: string
  trade_fee?: string
  hops?: string[]
  quoted_at_ms?: string | number
}

export function toChartBars(bars: CandleBar[] | undefined): ChartBar[] {
  if (!bars?.length) return []
  return bars
    .map((bar) => ({
      timestamp: Number(bar.open_time_ms),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: Number(bar.volume || 0),
    }))
    .filter((bar) => Number.isFinite(bar.timestamp) && Number.isFinite(bar.open))
    .sort((a, b) => a.timestamp - b.timestamp)
}
