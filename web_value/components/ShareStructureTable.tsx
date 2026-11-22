import { CorporateAction, formatDate, formatNumber, parseDate } from '@/lib/types'

export default function ShareStructureTable({ actions }: { actions: CorporateAction[] }) {
  const structures = actions
    .filter(a => a.event_type === 'share_structure')
    .sort((a, b) => parseDate(b.effective_date).getTime() - parseDate(a.effective_date).getTime())

  return (
    <div className="p-6 pt-0">
      <div className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">生效日期</th>
                <th className="px-4 py-3 text-right font-medium">总股本（亿股）</th>
                <th className="px-4 py-3 text-right font-medium">流通股（亿股）</th>
                <th className="px-4 py-3 text-right font-medium">流通占比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {structures.map((s, idx) => {
                const total = parseFloat(s.total_shares || '0') / 100000000
                const tradable = parseFloat(s.tradable_shares || '0') / 100000000
                const ratio = total > 0 ? (tradable / total) * 100 : 0
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">{formatDate(s.effective_date)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(total, 4)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(tradable, 4)}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(ratio, 2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
