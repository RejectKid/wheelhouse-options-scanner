import { RotateCcw, SlidersHorizontal } from 'lucide-react'

export type FiltersState = {
  minIv: number
  maxCash: number
  minReturn: number
  noEarnings: boolean
}

type Props = {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
}

export const defaultFilters: FiltersState = { minIv: 40, maxCash: 25000, minReturn: 2.5, noEarnings: false }

export function Filters({ filters, onChange }: Props) {
  const update = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => onChange({ ...filters, [key]: value })
  return (
    <section className="filter-bar" aria-label="Scanner filters">
      <label><span>Universe</span><select disabled aria-label="Universe"><option>US optionable stocks</option></select></label>
      <label><span>Expiry</span><select disabled aria-label="Expiry"><option>21–35 DTE</option></select></label>
      <label><span>Min current IV</span><select value={filters.minIv} onChange={(event) => update('minIv', Number(event.target.value))}><option value="30">30%+</option><option value="40">40%+</option><option value="50">50%+</option><option value="60">60%+</option><option value="70">70%+</option></select></label>
      <label><span>Max strike cash</span><select value={filters.maxCash} onChange={(event) => update('maxCash', Number(event.target.value))}><option value="1500">$1,500</option><option value="5000">$5,000</option><option value="10000">$10,000</option><option value="25000">$25,000</option><option value="50000">$50,000</option></select></label>
      <label><span>Target return</span><select value={filters.minReturn} onChange={(event) => update('minReturn', Number(event.target.value))}><option value="2">2.0%+</option><option value="2.5">2.5%+</option><option value="3">3.0%+</option><option value="4">4.0%+</option></select></label>
      <label className="check-filter"><input type="checkbox" checked={filters.noEarnings} onChange={(event) => update('noEarnings', event.target.checked)} /><span>No earnings</span></label>
      <button className="icon-button filter-button" title="Filters applied"><SlidersHorizontal size={16} /></button>
      <button className="reset-button" onClick={() => onChange(defaultFilters)}><RotateCcw size={14} /> Reset</button>
    </section>
  )
}
