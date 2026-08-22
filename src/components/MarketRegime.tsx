import { CalendarCheck2 } from 'lucide-react'
import { formatPercent } from '../lib/calculations'
import type { MarketIndex } from '../types'

export function MarketRegime({ indices }: { indices: MarketIndex[] }) {
  const marketIndices = indices.length ? indices : [
    { symbol: 'SPY', price: 0, change: 0 }, { symbol: 'QQQ', price: 0, change: 0 }, { symbol: 'IWM', price: 0, change: 0 },
  ]
  const isRedDay = marketIndices.filter((index) => index.change < 0).length >= 2
  return (
    <section className="market-regime" aria-label="Market regime">
      <div className="regime-title">
        <span>Market regime</span>
        <strong className={isRedDay ? 'negative' : 'positive'}>{isRedDay ? 'Red day' : 'Green day'}</strong>
      </div>
      {marketIndices.map((index) => (
        <div className="index-quote" key={index.symbol}>
          <div><span>{index.symbol}</span><b className={index.change < 0 ? 'negative' : 'positive'}>{formatPercent(index.change)}</b></div>
          <small>{index.price.toFixed(2)}</small>
        </div>
      ))}
      <div className="entry-window">
        <span className="entry-icon"><CalendarCheck2 size={20} /></span>
        <div><strong>{isRedDay ? 'Entry window open' : 'Wait for setup'}</strong><small>{isRedDay ? 'Broad weakness supports put entries' : 'Your red-day rule is not met'}</small></div>
      </div>
    </section>
  )
}
