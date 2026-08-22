import { Bookmark, BookmarkCheck, ChevronDown, ChevronUp, SearchX } from 'lucide-react'
import type { SortKey, SortState, StockOpportunity } from '../types'
import { cashRequired, formatMoney, formatPercent, midpoint, opportunityScore, returnOnCash } from '../lib/calculations'

type Props = {
  rows: StockOpportunity[]
  selected: string | null
  saved: Set<string>
  sort: SortState
  onSort: (key: SortKey) => void
  onSelect: (symbol: string) => void
  onSave: (symbol: string) => void
}

function SortHeader({ label, value, sort, onSort }: { label: string; value: SortKey; sort: SortState; onSort: (key: SortKey) => void }) {
  const active = sort.key === value
  const direction = active ? sort.direction : 'desc'
  const Icon = direction === 'asc' ? ChevronUp : ChevronDown
  return <th aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button className={`sort-button ${active ? 'sorted' : ''}`} onClick={() => onSort(value)} aria-label={`Sort by ${label} ${active && direction === 'desc' ? 'ascending' : 'descending'}`}>{label}<Icon size={12} /></button></th>
}

export function OpportunityTable({ rows, selected, saved, sort, onSort, onSelect, onSave }: Props) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <SortHeader label="Symbol / company" value="symbol" sort={sort} onSort={onSort} />
          <SortHeader label="Price / day" value="price" sort={sort} onSort={onSort} />
          <SortHeader label="IV %" value="ivRank" sort={sort} onSort={onSort} />
          <SortHeader label="Put expiry / DTE" value="dte" sort={sort} onSort={onSort} />
          <SortHeader label="Strike / delta" value="strike" sort={sort} onSort={onSort} />
          <SortHeader label="Bid / ask" value="midpoint" sort={sort} onSort={onSort} />
          <SortHeader label="Return" value="return" sort={sort} onSort={onSort} />
          <SortHeader label="Cash" value="cash" sort={sort} onSort={onSort} />
          <SortHeader label="Score" value="score" sort={sort} onSort={onSort} />
          <th><span className="sr-only">Save</span></th>
        </tr></thead>
        <tbody>
          {rows.map((stock) => {
            const qualified = returnOnCash(stock) >= 0.025
            const score = opportunityScore(stock)
            return (
              <tr className={selected === stock.symbol ? 'selected' : ''} onClick={() => onSelect(stock.symbol)} key={stock.symbol} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect(stock.symbol)}>
                <td><strong>{stock.symbol}</strong><small>{stock.company}</small></td>
                <td><strong>{formatMoney(stock.price, 2)}</strong><small className={stock.dayChange < 0 ? 'negative' : 'positive'}>{formatPercent(stock.dayChange)}</small></td>
                <td><strong>{stock.ivRank}%</strong><small>{stock.ivMetric || 'Current IV'}</small></td>
                <td><strong>{stock.expiry.replace(/, \d{4}$/, '')}</strong><small>{stock.dte} DTE</small></td>
                <td><strong>{formatMoney(stock.strike)}</strong><small>{stock.delta.toFixed(2)} Δ</small></td>
                <td><strong>{formatMoney(stock.bid, 2)} / {formatMoney(stock.ask, 2)}</strong><small>{formatMoney(midpoint(stock) * 100)} credit</small></td>
                <td><strong className={qualified ? 'positive' : ''}>{formatPercent(returnOnCash(stock))}</strong><small>{qualified ? 'Meets target' : 'Below target'}</small></td>
                <td><strong>{formatMoney(cashRequired(stock))}</strong><small>{stock.openInterest.toLocaleString()} OI</small></td>
                <td><span className={`score ${score >= 70 ? 'strong' : ''}`}>{score}</span></td>
                <td><button className="save-button" aria-label={`${saved.has(stock.symbol) ? 'Remove' : 'Add'} ${stock.symbol} ${saved.has(stock.symbol) ? 'from' : 'to'} watchlist`} onClick={(event) => { event.stopPropagation(); onSave(stock.symbol) }}>{saved.has(stock.symbol) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 ? <div className="empty"><SearchX size={24} /><strong>No contracts match</strong><span>Try relaxing IV rank, return, cash, or earnings filters.</span></div> : null}
    </div>
  )
}
