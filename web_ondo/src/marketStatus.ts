import type { MarketStatus } from './api'

const SESSION_LABEL: Record<string, string> = {
  premarket: '盘前',
  regular: '常规盘',
  postmarket: '盘后',
  overnight: '夜盘',
  closed: '休市',
  offhours: '非交易时段',
}

export function sessionLabel(status: string | undefined) {
  if (!status) return '未知'
  return SESSION_LABEL[status.toLowerCase()] ?? status
}

function formatInBeijing(ms: string | number | undefined) {
  const n = Number(ms)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return new Date(n).toLocaleString('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Shanghai',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function describeMarketStatus(status: MarketStatus | null): string[] {
  if (!status) return ['状态加载中…']
  const lines = [
    `会话 ${sessionLabel(status.market_status)} · ${status.open_state ? '开市' : '未开市'}`,
  ]
  if (status.reason_code || status.reason_msg) {
    lines.push(`原因 ${[status.reason_code, status.reason_msg].filter(Boolean).join(' ')}`)
  }
  // 币安语义：会话进行中时 nextClose=本会话结束，nextOpen=下一会话开盘（可晚于收盘，例如盘前→常规）
  lines.push(`本会话结束 ${formatInBeijing(status.next_close_ms)}`)
  lines.push(`下一会话开盘 ${formatInBeijing(status.next_open_ms)}`)
  lines.push(
    `周末/offhours ${status.offhours_open_state ? '开' : '关'} · 开 ${formatInBeijing(status.offhours_next_open_ms)} · 收 ${formatInBeijing(status.offhours_next_close_ms)}`,
  )
  return lines
}
