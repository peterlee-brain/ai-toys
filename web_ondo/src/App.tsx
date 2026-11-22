import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getBinanceKlines,
  getMarketStatus,
  getOkxKlines,
  getOkxQuote,
  listAssets,
  toChartBars,
  type ChartBar,
  type MarketStatus,
  type OkxQuote,
  type OndoAsset,
} from './api'
import { INTERVALS, toPeriod, type Interval } from './intervals'
import { KlinePanel } from './KlinePanel'
import { describeMarketStatus, sessionLabel } from './marketStatus'

const DEFAULT_SYMBOL = 'PFEon'
const POLL_MS = 1_000
const QUOTE_POLL_MS = 2_000
const AMOUNT_PRESETS = ['20', '50', '100', '500'] as const

type QuoteSlot = {
  quote: OkxQuote | null
  err: string | null
}

const emptySlot = (): QuoteSlot => ({ quote: null, err: null })

function sellTokenAmountFromUsdt(usdt: string, klineClose: number | null): string | null {
  const n = Number(usdt)
  if (!Number.isFinite(n) || n <= 0) return null
  if (klineClose == null || !Number.isFinite(klineClose) || klineClose <= 0) return null
  const token = n / klineClose
  if (!Number.isFinite(token) || token <= 0) return null
  const s = token.toFixed(8)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

function QuoteCard({
  title,
  hint,
  slot,
  side,
  klineClose,
}: {
  title: string
  hint: string
  slot: QuoteSlot
  side: 'buy' | 'sell'
  klineClose: number | null
}) {
  const { quote, err } = slot
  return (
    <div className="quote-card">
      <div className="quote-card-head">
        <strong>{title}</strong>
        <span>{hint}</span>
      </div>
      {err ? (
        <p className="quote-err">{err}</p>
      ) : quote ? (
        <ul>
          <li>
            {side === 'buy' ? '买' : '卖'} · mode {quote.mode || '—'} · {quote.from_symbol}{' '}
            {quote.from_amount} → {quote.to_symbol} {quote.to_amount}
          </li>
          <li>
            询价价 {quote.implied_price || '—'} USDT · OKX标价{' '}
            {side === 'buy' ? quote.to_unit_price || '—' : quote.from_unit_price || '—'}
          </li>
          <li>
            K 线最新收 {klineClose ?? '—'}
            {quote.implied_price && klineClose
              ? ` · 差 ${(Number(quote.implied_price) - klineClose).toFixed(4)}`
              : ''}
          </li>
          <li>冲击 {quote.price_impact_percent || '—'}% · hops {(quote.hops || []).join(' → ') || '—'}</li>
        </ul>
      ) : (
        <p>询价加载中…</p>
      )}
    </div>
  )
}

function settleSlot(res: PromiseSettledResult<OkxQuote>): QuoteSlot {
  if (res.status === 'fulfilled') return { quote: res.value, err: null }
  return {
    quote: null,
    err: res.reason instanceof Error ? res.reason.message : String(res.reason),
  }
}

export default function App() {
  const [assets, setAssets] = useState<OndoAsset[]>([])
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL)
  const [interval, setInterval] = useState<Interval>('1m')
  const [status, setStatus] = useState<MarketStatus | null>(null)
  const [bnBars, setBnBars] = useState<ChartBar[]>([])
  const [okxBars, setOkxBars] = useState<ChartBar[]>([])
  const [dexBuy, setDexBuy] = useState<QuoteSlot>(emptySlot)
  const [intentBuy, setIntentBuy] = useState<QuoteSlot>(emptySlot)
  const [dexSell, setDexSell] = useState<QuoteSlot>(emptySlot)
  const [intentSell, setIntentSell] = useState<QuoteSlot>(emptySlot)
  const [quoteAmount, setQuoteAmount] = useState('20')
  const [quoteAmountDraft, setQuoteAmountDraft] = useState('20')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const quoteInFlight = useRef(false)
  const klineCloseRef = useRef<number | null>(null)

  const selected = useMemo(
    () => assets.find((a) => a.symbol === symbol) ?? assets[0],
    [assets, symbol],
  )

  const klineClose = okxBars.length ? okxBars[okxBars.length - 1].close : null
  klineCloseRef.current = klineClose

  const loadMeta = useCallback(async () => {
    const [assetRes, market] = await Promise.all([listAssets('56'), getMarketStatus()])
    const list = assetRes.assets ?? []
    setAssets(list)
    setStatus(market)
    if (!list.some((a) => a.symbol === symbol) && list.length) {
      const preferred = list.find((a) => a.symbol === DEFAULT_SYMBOL)
      setSymbol(preferred?.symbol ?? list[0].symbol)
    }
  }, [symbol])

  const loadKlines = useCallback(async (asset: OndoAsset, iv: Interval) => {
    setLoading(true)
    setError(null)
    try {
      const [bn, okx, market] = await Promise.all([
        getBinanceKlines(asset.contract, iv, 300, asset.chain_id),
        getOkxKlines(asset.contract, iv, 300, asset.chain_id),
        getMarketStatus().catch(() => null),
      ])
      setBnBars(toChartBars(bn.bars))
      setOkxBars(toChartBars(okx.bars))
      if (market) setStatus(market)
      setUpdatedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadQuotes = useCallback(async (asset: OndoAsset, amount: string) => {
    const trimmed = amount.trim()
    if (!trimmed || Number(trimmed) <= 0) {
      const msg = '数量需为正数'
      const bad = { quote: null, err: msg }
      setDexBuy(bad)
      setIntentBuy(bad)
      setDexSell(bad)
      setIntentSell(bad)
      return
    }
    if (quoteInFlight.current) return
    quoteInFlight.current = true

    const base = { chainId: asset.chain_id }
    try {
      // 1) 先买：拿 to_amount 作为卖向代币数量（薄标的常无 K 线，不能靠收价换算）
      const buyResults = await Promise.allSettled([
        getOkxQuote(asset.contract, { ...base, amount: trimmed, side: 'buy', mode: 'dex' }),
        getOkxQuote(asset.contract, { ...base, amount: trimmed, side: 'buy', mode: 'intent' }),
      ])
      const buyDex = settleSlot(buyResults[0])
      const buyIntent = settleSlot(buyResults[1])
      setDexBuy(buyDex)
      setIntentBuy(buyIntent)

      const sellAmt =
        buyIntent.quote?.to_amount ||
        buyDex.quote?.to_amount ||
        sellTokenAmountFromUsdt(trimmed, klineCloseRef.current)

      if (!sellAmt) {
        const msg = '买向无报价且无 K 线，无法换算卖向数量'
        setDexSell({ quote: null, err: msg })
        setIntentSell({ quote: null, err: msg })
        return
      }

      // 2) 再卖：用买到的代币数量做对向询价
      const sellResults = await Promise.allSettled([
        getOkxQuote(asset.contract, { ...base, amount: sellAmt, side: 'sell', mode: 'dex' }),
        getOkxQuote(asset.contract, { ...base, amount: sellAmt, side: 'sell', mode: 'intent' }),
      ])
      setDexSell(settleSlot(sellResults[0]))
      setIntentSell(settleSlot(sellResults[1]))
    } finally {
      quoteInFlight.current = false
    }
  }, [])

  useEffect(() => {
    loadMeta().catch((err) => setError(err instanceof Error ? err.message : String(err)))
  }, [loadMeta])

  useEffect(() => {
    if (!selected) return
    void loadKlines(selected, interval)
    const timer = window.setInterval(() => {
      void loadKlines(selected, interval)
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [selected, interval, loadKlines])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = quoteAmountDraft.trim()
      if (next && next !== quoteAmount) setQuoteAmount(next)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [quoteAmountDraft, quoteAmount])

  useEffect(() => {
    if (!selected) return
    void loadQuotes(selected, quoteAmount)
    const timer = window.setInterval(() => {
      void loadQuotes(selected, quoteAmount)
    }, QUOTE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [selected, quoteAmount, loadQuotes, klineClose != null])

  const period = toPeriod(interval)
  const statusTone = status?.open_state ? 'open' : 'closed'
  const statusLines = describeMarketStatus(status)
  const sellAmtPreview =
    intentBuy.quote?.to_amount ||
    dexBuy.quote?.to_amount ||
    sellTokenAmountFromUsdt(quoteAmount, klineClose)
  const tokenSym = selected?.symbol || 'token'

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <h1>web_ondo</h1>
          <p>Binance RWA × OKX · svc_ondo</p>
        </div>
        <div className="controls">
          <label>
            标的
            <select value={selected?.symbol ?? symbol} onChange={(e) => setSymbol(e.target.value)}>
              {assets.map((a) => (
                <option key={`${a.chain_id}:${a.contract}`} value={a.symbol}>
                  {a.symbol} ({a.ticker}) · {a.chain_id}
                </option>
              ))}
            </select>
          </label>
          <label>
            周期
            <select value={interval} onChange={(e) => setInterval(e.target.value as Interval)}>
              {INTERVALS.map((iv) => (
                <option key={iv} value={iv}>
                  {iv}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="meta">
          <span>{loading ? '刷新中…' : `更新 ${updatedAt || '—'}`}</span>
          {error ? <span className="err">{error}</span> : null}
        </div>
      </header>

      <main className="workspace">
        <section className="grid">
          <KlinePanel
            title="Binance"
            subtitle="volume 上游常为 0"
            symbol={selected?.symbol ?? '—'}
            period={period}
            bars={bnBars}
            emptyHint="无币安数据"
            headerExtra={
              <div className={`market-box tone-${statusTone}`}>
                <div className="market-pill">
                  <strong>{sessionLabel(status?.market_status)}</strong>
                  <span>{status?.open_state ? '开市' : '未开市'} · 北京时间</span>
                </div>
                <ul>
                  {statusLines.slice(1).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            }
          />
          <KlinePanel
            title="OKX"
            subtitle="含逐 bar 成交量"
            symbol={selected?.symbol ?? '—'}
            period={period}
            bars={okxBars}
            emptyHint="无 OKX 数据"
            headerExtra={
              <div className="market-box tone-open">
                <div className="market-pill">
                  <strong>二级盘口对照</strong>
                  <span>与左侧同尺寸</span>
                </div>
                <ul>
                  <li>K 线最新收 {klineClose ?? '—'}</li>
                  <li>询价见下方 Classic / Intent × 买/卖</li>
                </ul>
              </div>
            }
          />
        </section>

        <section className="quote-panel">
          <div className="market-pill">
            <strong>DEX × Intent 询价</strong>
            <span>BSC · 买/卖同时 · 每 2s · Intent ≥15U</span>
          </div>

          <div className="quote-controls">
            <label>
              名义金额（USDT）
              <input
                type="number"
                min="0"
                step="any"
                value={quoteAmountDraft}
                onChange={(e) => setQuoteAmountDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQuoteAmount(quoteAmountDraft.trim())
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => selected && void loadQuotes(selected, quoteAmountDraft.trim() || quoteAmount)}
            >
              询价
            </button>
            <span className="quote-sell-hint">
              卖向约 {sellAmtPreview ?? '—'} {tokenSym}
              {intentBuy.quote?.to_amount || dexBuy.quote?.to_amount
                ? '（按买向 to_amount）'
                : klineClose != null
                  ? `（按收 ${klineClose}）`
                  : ''}
            </span>
          </div>

          <div className="quote-presets">
            {AMOUNT_PRESETS.map((amt) => (
              <button
                key={amt}
                type="button"
                className={quoteAmountDraft === amt ? 'active' : undefined}
                onClick={() => {
                  setQuoteAmountDraft(amt)
                  setQuoteAmount(amt)
                }}
              >
                {amt}U
              </button>
            ))}
          </div>

          <div className="quote-grid">
            <QuoteCard
              title="Classic 买"
              hint="USDT→代币 · mode=dex"
              slot={dexBuy}
              side="buy"
              klineClose={klineClose}
            />
            <QuoteCard
              title="Intent 买"
              hint="USDT→代币 · mode=intent"
              slot={intentBuy}
              side="buy"
              klineClose={klineClose}
            />
            <QuoteCard
              title="Classic 卖"
              hint={`${tokenSym}→USDT · mode=dex`}
              slot={dexSell}
              side="sell"
              klineClose={klineClose}
            />
            <QuoteCard
              title="Intent 卖"
              hint={`${tokenSym}→USDT · mode=intent`}
              slot={intentSell}
              side="sell"
              klineClose={klineClose}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
