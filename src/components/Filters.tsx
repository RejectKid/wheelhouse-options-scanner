import { RotateCcw, SlidersHorizontal } from 'lucide-react'

export type FiltersState = {
  universe: 'all' | 'equity' | 'etf'
  expiry: string
  minIv: number
  maxCash: number
  minReturn: number
  noEarnings: boolean
}

type Props = {
  filters: FiltersState
  expiryOptions: Array<{ value: string; label: string }>
  onChange: (filters: FiltersState) => void
}

export const defaultFilters: FiltersState = { universe: 'all', expiry: 'all', minIv: 40, maxCash: 25000, minReturn: 2.5, noEarnings: false }

export function Filters({ filters, expiryOptions, onChange }: Props) {
  const update = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => onChange({ ...filters, [key]: value })
  const activeFilterCount = (Object.keys(defaultFilters) as Array<keyof FiltersState>).filter((key) => filters[key] !== defaultFilters[key]).length
  return (
    <section className="filter-bar" aria-label="Scanner filters">
      <label><span>Universe</span><select value={filters.universe} onChange={(event) => update('universe', event.target.value as FiltersState['universe'])} aria-label="Universe"><option value="all">All stocks &amp; ETFs</option><option value="equity">Stocks only</option><option value="etf">ETFs only</option></select></label>
      <label><span>Expiry</span><select value={filters.expiry} onChange={(event) => update('expiry', event.target.value)} aria-label="Expiry"><option value="all">All 21–35 DTE</option>{expiryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      <label><span>Min current IV</span><select value={filters.minIv} onChange={(event) => update('minIv', Number(event.target.value))}><option value="30">30%+</option><option value="40">40%+</option><option value="50">50%+</option><option value="60">60%+</option><option value="70">70%+</option></select></label>
      <label><span>Max strike cash</span><select value={filters.maxCash} onChange={(event) => update('maxCash', Number(event.target.value))}><option value="1500">$1,500</option><option value="5000">$5,000</option><option value="10000">$10,000</option><option value="25000">$25,000</option><option value="50000">$50,000</option></select></label>
      <label><span>Target return</span><select value={filters.minReturn} onChange={(event) => update('minReturn', Number(event.target.value))}><option value="2">2.0%+</option><option value="2.5">2.5%+</option><option value="3">3.0%+</option><option value="4">4.0%+</option></select></label>
      <label className="check-filter"><input type="checkbox" checked={filters.noEarnings} onChange={(event) => update('noEarnings', event.target.checked)} /><span>No earnings</span></label>
      <span className={`filter-count ${activeFilterCount ? 'active' : ''}`} title={`${activeFilterCount} non-default filters`}><SlidersHorizontal size={15} /><b>{activeFilterCount}</b></span>
      <button className="reset-button" onClick={() => onChange(defaultFilters)} disabled={activeFilterCount === 0}><RotateCcw size={14} /> Reset</button>
    </section>
  )
}
