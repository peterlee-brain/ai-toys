import { CorporateAction, formatDate, formatNumber, parseDate } from '@/lib/types'

export default function DividendTable({ actions }: { actions: CorporateAction[] }) {
  const dividends = actions
    .filter(a => a.event_type === 'dividends')
    .sort((a, b) => parseDate(b.effective_date).getTime() - parseDate(a.effective_date).getTime())

  return (
    <div className="p-6 pt-0">
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">除权除息日</th>
                <th className="px-4 py-3 text-left font-medium">股权登记日</th>
                <th className="px-4 py-3 text-right font-medium">每10股现金（元）</th>
                <th className="px-4 py-3 text-right font-medium">每10股送股</th>
                <th className="px-4 py-3 text-right font-medium">每10股转增</th>
                <th className="px-4 py-3 text-left font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dividends.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{formatDate(d.effective_date)}</td>
                  <td className="px-4 py-3">{formatDate(d.announced_at)}</td>
                  <td className="px-4 py-3 text-right font-medium text-moutai-700">
                    {formatNumber(d.cash_per_10, 2)}
                  </td>
                  <td className="px-4 py-3 text-right">{formatNumber(d.stock_per_10, 2)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(d.transfer_per_10, 2)}</td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-xs" title={d.reason || ''}>
                    {d.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
