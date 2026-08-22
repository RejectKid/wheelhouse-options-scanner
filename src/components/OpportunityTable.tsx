import { Bookmark, BookmarkCheck, ChevronDown, SearchX } from 'lucide-react'
import type { SortKey, StockOpportunity } from '../types'
import { cashRequired, formatMoney, formatPercent, midpoint, opportunityScore, returnOnCash } from '../lib/calculations'

type Props = {
  rows: StockOpportunity[]
  selected: string | null
  saved: Set<string>
  sort: SortKey
  onSort: (key: SortKey) => void
  onSelect: (symbol: string) => void
  onSave: (symbol: string) => void
}

function SortHeader({ label, value, current, onSort }: { label: string; value: SortKey; current: SortKey; onSort: (key: SortKey) => void }) {
  return <button className={`sort-button ${current === value ? 'sorted' : ''}`} onClick={() => onSort(value)}>{label}<ChevronDown size={12} /></button>
}

export function OpportunityTable({ rows, selected, saved, sort, onSort, onSelect, onSave }: Props) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>
          <th>Symbol / company</th>
          <th><SortHeader label="Price / day" value="dayChange" current={sort} onSort={onSort} /></th>
          <th><SortHeader label="IV %" value="ivRank" current={sort} onSort={onSort} /></th>
          <th>Put expiry / DTE</th>
          <th>Strike / delta</th>
          <th>Bid / ask</th>
          <th><SortHeader label="Return" value="return" current={sort} onSort={onSort} /></th>
          <th><SortHeader label="Cash" value="cash" current={sort} onSort={onSort} /></th>
          <th><SortHeader label="Score" value="score" current={sort} onSort={onSort} /></th>
          <th><span className="sr-only">Save</span></th>
        </tr></thead>
        <tbody>
          {rows.map((stock) => {
            const qualified = returnOnCash(stock) >= 0.025
            return (
              <tr className={selected === stock.symbol ? 'selected' : ''} onClick={() => onSelect(stock.symbol)} key={stock.symbol} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onSelect(stock.symbol)}>
                <td><strong>{stock.symbol}</strong><small>{stock.company}</small></td>
                <td><strong>{formatMoney(stock.price, 2)}</strong><small className={stock.dayChange < 0 ? 'negative' : 'positive'}>{formatPercent(stock.dayChange)}</small></td>
                <td><strong>{stock.ivRank}%</strong><small>{stock.ivMetric || 'Current IV'}</small></td>
                <td><strong>{stock.expiry.replace(', 2026', '')}</strong><small>{stock.dte} DTE</small></td>
                <td><strong>{formatMoney(stock.strike)}</strong><small>{stock.delta.toFixed(2)} Δ</small></td>
                <td><strong>{formatMoney(stock.bid, 2)} / {formatMoney(stock.ask, 2)}</strong><small>{formatMoney(midpoint(stock) * 100)} credit</small></td>
                <td><strong className={qualified ? 'positive' : ''}>{formatPercent(returnOnCash(stock))}</strong><small>{qualified ? 'Meets target' : 'Below target'}</small></td>
                <td><strong>{formatMoney(cashRequired(stock))}</strong><small>{stock.openInterest.toLocaleString()} OI</small></td>
                <td><span className={`score ${opportunityScore(stock) >= 70 ? 'strong' : ''}`}>{opportunityScore(stock)}</span></td>
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
