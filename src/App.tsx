import { useDeferredValue, useMemo, useState } from 'react'
import { AlertTriangle, Database, RefreshCw, Search } from 'lucide-react'
import { DetailPanel } from './components/DetailPanel'
import { defaultFilters, Filters, type FiltersState } from './components/Filters'
import { MarketRegime } from './components/MarketRegime'
import { OpportunityTable } from './components/OpportunityTable'
import { Sidebar } from './components/Sidebar'
import { opportunities as sampleOpportunities } from './data/opportunities'
import { useLiveScanner } from './hooks/useLiveScanner'
import { cashRequired, opportunityScore, returnOnCash } from './lib/calculations'
import type { SortKey } from './types'

const getSaved = () => {
  try { return new Set<string>(JSON.parse(localStorage.getItem('wheelhouse-watchlist') ?? '[]')) }
  catch { return new Set<string>() }
}

function App() {
  const [activeView, setActiveView] = useState('Scanner')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState<FiltersState>(defaultFilters)
  const [sort, setSort] = useState<SortKey>('score')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>('RIVN')
  const [saved, setSaved] = useState<Set<string>>(getSaved)
  const { data: liveData, loading, error, refresh } = useLiveScanner()
  const opportunities = liveData?.opportunities ?? sampleOpportunities

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
      const matchesFilters = stock.ivRank >= filters.minIv && cashRequired(stock) <= filters.maxCash && returnOnCash(stock) * 100 >= filters.minReturn && (!filters.noEarnings || !stock.earningsBeforeExpiry)
      const matchesView = activeView !== 'Watchlist' || saved.has(stock.symbol)
      return matchesSearch && matchesFilters && matchesView
    })
    const value = (stock: (typeof opportunities)[number]) => sort === 'score' ? opportunityScore(stock) : sort === 'return' ? returnOnCash(stock) : sort === 'cash' ? -cashRequired(stock) : sort === 'dayChange' ? -stock.dayChange : sort === 'liquidity' ? stock.openInterest : stock.ivRank
    return [...results].sort((a, b) => value(b) - value(a))
  }, [activeView, deferredQuery, filters, opportunities, saved, sort])

  const selected = opportunities.find((stock) => stock.symbol === selectedSymbol) ?? null
  const displayView = activeView === 'Watchlist' ? 'Watchlist' : 'Scanner'

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} savedCount={saved.size} onChange={setActiveView} live={Boolean(liveData)} feed={liveData?.meta.optionFeed} />
      <main>
        <header className="topbar">
          <div><h1>{displayView === 'Watchlist' ? 'Saved opportunities' : 'CSP opportunity scanner'}</h1><p>{displayView === 'Watchlist' ? 'Your short list, with economics recalculated from the latest demo snapshot.' : 'Find 4-week cash-secured puts targeting 2.5% return on down days.'}</p></div>
          <label className="search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker or company" /></label>
          <div className="freshness"><span>{liveData ? `${liveData.meta.provider} market snapshot` : 'Loading market data'}</span><strong>{liveData ? `${new Date(liveData.meta.asOf).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${liveData.meta.optionFeed}` : 'Connecting…'}</strong></div>
          <button className="refresh-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spinning' : ''} />{loading ? 'Scanning' : 'Refresh'}</button>
        </header>
        <div className="content">
          <MarketRegime indices={liveData?.meta.marketIndices ?? []} />
          {error ? <div className="data-alert"><AlertTriangle size={16} /><span><strong>Live scan unavailable.</strong> {error}. Showing the sample dataset.</span></div> : null}
          {liveData ? <div className="coverage-strip"><span><strong>{liveData.meta.universeCount.toLocaleString()}</strong> optionable stocks tracked</span><span><strong>{liveData.meta.pricedCount.toLocaleString()}</strong> priced</span><span><strong>{liveData.meta.candidateCount}</strong> red-day candidates scanned</span><span><strong>{liveData.meta.contractsChecked.toLocaleString()}</strong> contracts checked</span><span className="coverage-note">{liveData.meta.note}</span></div> : null}
          <Filters filters={filters} onChange={setFilters} />
          <section className={`workspace ${selected ? 'with-detail' : ''}`}>
            <div className="results-panel">
              <div className="results-meta"><div><strong>{loading && !liveData ? 'Scanning the market…' : `${filtered.length} opportunities`}</strong><span>{loading && !liveData ? 'Loading optionable assets, equity snapshots and 21–35 DTE puts' : 'Ranked by return, current IV, liquidity, red-day move and event risk'}</span></div><span className="data-source"><Database size={14} /> {liveData ? `Alpaca ${liveData.meta.optionFeed}` : 'Sample fallback'}</span></div>
              <OpportunityTable rows={filtered} selected={selectedSymbol} saved={saved} sort={sort} onSort={setSort} onSelect={setSelectedSymbol} onSave={toggleSaved} />
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
