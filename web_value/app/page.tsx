import Dashboard from '@/components/Dashboard'
import { loadSecurity, loadReports, loadCorporateActions, loadKlineData, availableStocks } from '@/lib/data'

export default function HomePage() {
  const security = loadSecurity()
  const reports = loadReports()
  const actions = loadCorporateActions()
  const kline = loadKlineData()
  const initialStock = availableStocks[0]

  return (
    <Dashboard
      initialStock={initialStock}
      security={security}
      reports={reports}
      actions={actions}
      kline={kline}
    />
  )
}
