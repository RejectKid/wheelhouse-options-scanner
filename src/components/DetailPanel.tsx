import { AlertTriangle, Bookmark, BookmarkCheck, Check, Info, X } from 'lucide-react'
import type { StockOpportunity } from '../types'
import { annualizedReturn, breakEven, cashRequired, downsideBuffer, formatMoney, formatPercent, opportunityScore, premiumCredit, returnOnCash, spreadPercent } from '../lib/calculations'

type Props = {
  stock: StockOpportunity
  saved: boolean
  onSave: () => void
  onClose: () => void
}

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 250},${72 - ((value - min) / Math.max(max - min, 1)) * 60}`).join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 250 82" role="img" aria-label="30-day price trend">
      <line x1="0" y1="18" x2="250" y2="18" /><line x1="0" y1="43" x2="250" y2="43" /><line x1="0" y1="68" x2="250" y2="68" />
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className="check-row"><span>{label}</span><span><b>{value}</b>{warning ? <AlertTriangle className="warning" size={15} /> : <Check className="check" size={15} />}</span></div>
}

export function DetailPanel({ stock, saved, onSave, onClose }: Props) {
  return (
    <aside className="detail-panel" aria-label={`${stock.symbol} contract detail`}>
      <div className="detail-heading"><div><strong>{stock.symbol}</strong><span>{stock.company}</span></div><button className="save-button" aria-label="Close details" onClick={onClose}><X size={19} /></button></div>
      <section className="quote-block"><div><span>Price</span><strong>{formatMoney(stock.price, 2)}</strong></div><div className="negative"><strong>{formatPercent(stock.dayChange)}</strong><small>Today</small></div></section>
      <section className="chart-block"><div className="section-label">30-day price</div><Sparkline values={stock.sparkline} /></section>
      <section className="detail-section why"><div className="section-label">Why it ranks</div><p>Current IV {stock.ivRank}% and a {formatPercent(returnOnCash(stock))} return at {stock.dte} DTE. The {Math.abs(stock.delta).toFixed(2)} delta strike offers a {formatPercent(downsideBuffer(stock), 1)} break-even buffer.</p><div className="rank-line"><span>Opportunity score</span><strong>{opportunityScore(stock)} / 100</strong></div></section>
      <section className="detail-section"><div className="section-label">Contract economics</div>
        <dl>
          <div><dt>Put expiry</dt><dd>{stock.expiry} ({stock.dte})</dd></div>
          <div><dt>Strike / delta</dt><dd>{formatMoney(stock.strike, 2)} / {stock.delta.toFixed(2)}</dd></div>
          <div><dt>Bid / ask</dt><dd>{formatMoney(stock.bid, 2)} / {formatMoney(stock.ask, 2)}</dd></div>
          <div><dt>Midpoint credit</dt><dd>{formatMoney(premiumCredit(stock))}</dd></div>
          <div><dt>Return on cash</dt><dd className="positive">{formatPercent(returnOnCash(stock))}</dd></div>
          <div><dt>Cash secured</dt><dd>{formatMoney(cashRequired(stock))}</dd></div>
          <div><dt>Break-even</dt><dd>{formatMoney(breakEven(stock), 2)}</dd></div>
          <div><dt>Annualized*</dt><dd>{formatPercent(annualizedReturn(stock), 1)}</dd></div>
        </dl>
      </section>
      <section className="detail-section"><div className="section-label">Risk checks</div>
        <CheckRow label="Earnings before expiry" value={stock.earningsKnown === false ? 'Not available' : stock.earningsBeforeExpiry ? 'Yes' : 'No'} warning={stock.earningsBeforeExpiry || stock.earningsKnown === false} />
        <CheckRow label="Bid/ask spread" value={formatPercent(spreadPercent(stock), 1)} warning={spreadPercent(stock) > 0.12} />
        <CheckRow label="Open interest" value={stock.openInterest.toLocaleString()} />
        <CheckRow label="Contract volume" value={stock.optionVolume.toLocaleString()} />
      </section>
      <div className="detail-actions"><button className={`primary-button ${saved ? 'saved' : ''}`} onClick={onSave}>{saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}{saved ? 'Saved to watchlist' : 'Add to watchlist'}</button><p><Info size={13} /> Midpoint pricing is an estimate, not a fill guarantee.</p></div>
    </aside>
  )
}
