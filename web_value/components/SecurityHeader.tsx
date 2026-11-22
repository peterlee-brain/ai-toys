import { Security, formatDate } from '@/lib/types'

export default function SecurityHeader({ security }: { security: Security }) {
  return (
    <header className="bg-gradient-to-r from-moutai-700 to-moutai-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-moutai-200 text-sm font-medium tracking-wider uppercase">
              {security.code} · {security.exchange}
            </p>
            <h1 className="text-4xl font-bold mt-2">{security.name}</h1>
            <p className="text-moutai-100 mt-2">
              {security.industry_name || '未知行业'} · {security.area_name || '未知地区'} · {security.board || '主板'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-moutai-200 text-sm">上市日期</p>
            <p className="text-xl font-semibold">{formatDate(security.listing_date)}</p>
            <p className="text-moutai-200 text-sm mt-2">状态</p>
            <p className="text-xl font-semibold">{security.status === 'listed' ? '上市中' : security.status}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
