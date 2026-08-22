import { useDeferredValue, useMemo, useState } from 'react'
import { AlertTriangle, Database, RefreshCw, Search, X } from 'lucide-react'
import { DetailPanel } from './components/DetailPanel'
import { defaultFilters, Filters, type FiltersState } from './components/Filters'
import { MarketRegime } from './components/MarketRegime'
import { OpportunityTable } from './components/OpportunityTable'
import { Sidebar } from './components/Sidebar'
import { opportunities as sampleOpportunities } from './data/opportunities'
import { useLiveScanner } from './hooks/useLiveScanner'
import { assetTypeOf, cashRequired, midpoint, opportunityScore, returnOnCash } from './lib/calculations'
import type { SortKey, SortState } from './types'

const getSaved = () => {
  try { return new Set<string>(JSON.parse(localStorage.getItem('wheelhouse-watchlist') ?? '[]')) }
  catch { return new Set<string>() }
}

function App() {
  const [activeView, setActiveView] = useState('Scanner')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState<FiltersState>(defaultFilters)
  const [sort, setSort] = useState<SortState>({ key: 'score', direction: 'desc' })
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>('RIVN')
  const [saved, setSaved] = useState<Set<string>>(getSaved)
  const { data: liveData, loading, error, refresh } = useLiveScanner()
  const opportunities = liveData?.opportunities ?? sampleOpportunities

  const expiryOptions = useMemo(() => {
    const expiries = new Map<string, number>()
    for (const stock of opportunities) expiries.set(stock.expiry, stock.dte)
    return [...expiries.entries()].sort((a, b) => a[1] - b[1]).map(([value, dte]) => ({ value, label: `${value.replace(/, \d{4}$/, '')} · ${dte} DTE` }))
  }, [opportunities])

  const toggleSaved = (symbol: string) => {
    setSaved((current) => {
      const next = new Set(current)
      if (next.has(symbol)) next.delete(symbol); else next.add(symbol)
      localStorage.setItem('wheelhouse-watchlist', JSON.stringify([...next]))
      return next
    })
  }

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    const results = opportunities.filter((stock) => {
      const matchesSearch = !needle || `${stock.symbol} ${stock.company} ${stock.sector}`.toLowerCase().includes(needle)
      const matchesUniverse = filters.universe === 'all' || assetTypeOf(stock) === filters.universe
      const matchesExpiry = filters.expiry === 'all' || stock.expiry === filters.expiry
      const matchesFilters = matchesUniverse && matchesExpiry && stock.ivRank >= filters.minIv && cashRequired(stock) <= filters.maxCash && returnOnCash(stock) * 100 >= filters.minReturn && (!filters.noEarnings || !stock.earningsBeforeExpiry)
      const matchesView = activeView !== 'Watchlist' || saved.has(stock.symbol)
      return matchesSearch && matchesFilters && matchesView
    })
    const value = (stock: (typeof opportunities)[number]) => sort.key === 'score' ? opportunityScore(stock) : sort.key === 'return' ? returnOnCash(stock) : sort.key === 'cash' ? cashRequired(stock) : sort.key === 'price' ? stock.price : sort.key === 'dte' ? stock.dte : sort.key === 'strike' ? stock.strike : sort.key === 'midpoint' ? midpoint(stock) : sort.key === 'ivRank' ? stock.ivRank : stock.symbol
    return [...results].sort((a, b) => {
      const left = value(a)
      const right = value(b)
      const comparison = typeof left === 'string' && typeof right === 'string' ? left.localeCompare(right) : Number(left) - Number(right)
      return (sort.direction === 'asc' ? comparison : -comparison) || a.symbol.localeCompare(b.symbol)
    })
  }, [activeView, deferredQuery, filters, opportunities, saved, sort])

  const changeSort = (key: SortKey) => setSort((current) => current.key === key ? { key, direction: current.direction === 'desc' ? 'asc' : 'desc' } : { key, direction: key === 'symbol' ? 'asc' : 'desc' })

  const selected = opportunities.find((stock) => stock.symbol === selectedSymbol) ?? null
  const displayView = activeView === 'Watchlist' ? 'Watchlist' : 'Scanner'

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} savedCount={saved.size} onChange={setActiveView} live={Boolean(liveData)} feed={liveData?.meta.optionFeed} />
      <main>
        <header className="topbar">
          <div><h1>{displayView === 'Watchlist' ? 'Saved opportunities' : 'CSP opportunity scanner'}</h1><p>{displayView === 'Watchlist' ? 'Your short list, with economics recalculated from the latest demo snapshot.' : 'Find 4-week cash-secured puts targeting 2.5% return on down days.'}</p></div>
          <label className="search"><Search size={18} /><span className="sr-only">Search ticker or company</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker or company" />{query ? <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button> : null}</label>
          <div className="freshness"><span>{liveData ? `${liveData.meta.provider} market snapshot` : 'Loading market data'}</span><strong>{liveData ? `${new Date(liveData.meta.asOf).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${liveData.meta.optionFeed}` : 'Connecting…'}</strong></div>
          <button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spinning' : ''} />{loading ? 'Scanning' : 'Refresh'}</button>
        </header>
        <div className="content">
          <MarketRegime indices={liveData?.meta.marketIndices ?? []} />
          {error ? <div className="data-alert"><AlertTriangle size={16} /><span><strong>Live scan unavailable.</strong> {error}. Showing the sample dataset.</span></div> : null}
          {liveData ? <div className="coverage-strip"><span><strong>{liveData.meta.universeCount.toLocaleString()}</strong> optionable stocks tracked</span><span><strong>{liveData.meta.pricedCount.toLocaleString()}</strong> priced</span><span><strong>{liveData.meta.candidateCount}</strong> red-day candidates scanned</span><span><strong>{liveData.meta.contractsChecked.toLocaleString()}</strong> contracts checked</span><span className="coverage-note">{liveData.meta.note}</span></div> : null}
          <Filters filters={filters} expiryOptions={expiryOptions} onChange={setFilters} />
          <section className={`workspace ${selected ? 'with-detail' : ''}`}>
            <div className="results-panel">
              <div className="results-meta"><div><strong>{loading && !liveData ? 'Scanning the market…' : `${filtered.length} of ${opportunities.length} opportunities`}</strong><span>{loading && !liveData ? 'Loading optionable assets, equity snapshots and 21–35 DTE puts' : `Sorted by ${sort.key === 'ivRank' ? 'current IV' : sort.key === 'dte' ? 'expiry' : sort.key} · ${sort.direction === 'desc' ? 'high to low' : 'low to high'}`}</span></div><span className="data-source"><Database size={14} /> {liveData ? `Alpaca ${liveData.meta.optionFeed}` : 'Sample fallback'}</span></div>
              <OpportunityTable rows={filtered} selected={selectedSymbol} saved={saved} sort={sort} onSort={changeSort} onSelect={setSelectedSymbol} onSave={toggleSaved} />
            </div>
            {selected ? <DetailPanel stock={selected} saved={saved.has(selected.symbol)} onSave={() => toggleSaved(selected.symbol)} onClose={() => setSelectedSymbol(null)} /> : null}
          </section>
          <footer><span>Wheelhouse is an educational screening tool—not investment advice. Options involve assignment and loss risk.</span><span>*Annualized return is a simple extrapolation, not an expected return.</span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
