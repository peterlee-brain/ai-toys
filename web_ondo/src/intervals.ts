import type { Period } from 'klinecharts'

export const INTERVALS = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '12h',
  '1d',
  '1w',
  '1mo',
] as const

export type Interval = (typeof INTERVALS)[number]

export function toPeriod(interval: Interval): Period {
  switch (interval) {
    case '1m':
      return { span: 1, type: 'minute' }
    case '3m':
      return { span: 3, type: 'minute' }
    case '5m':
      return { span: 5, type: 'minute' }
    case '15m':
      return { span: 15, type: 'minute' }
    case '30m':
      return { span: 30, type: 'minute' }
    case '1h':
      return { span: 1, type: 'hour' }
    case '2h':
      return { span: 2, type: 'hour' }
    case '4h':
      return { span: 4, type: 'hour' }
    case '6h':
      return { span: 6, type: 'hour' }
    case '12h':
      return { span: 12, type: 'hour' }
    case '1d':
      return { span: 1, type: 'day' }
    case '1w':
      return { span: 1, type: 'week' }
    case '1mo':
      return { span: 1, type: 'month' }
  }
}
