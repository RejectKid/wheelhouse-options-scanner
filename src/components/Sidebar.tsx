import { Binoculars, Bookmark, BriefcaseBusiness, Settings } from 'lucide-react'

type Props = {
  activeView: string
  savedCount: number
  onChange: (view: string) => void
  live?: boolean
  feed?: string
}

const items = [
  { label: 'Scanner', icon: Binoculars },
  { label: 'Watchlist', icon: Bookmark },
  { label: 'Positions', icon: BriefcaseBusiness },
  { label: 'Settings', icon: Settings },
]

export function Sidebar({ activeView, savedCount, onChange, live = false, feed = 'demo' }: Props) {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">W</span><span>Wheelhouse</span></div>
      <nav aria-label="Main navigation">
        {items.map(({ label, icon: Icon }) => (
          <button className={`nav-item ${activeView === label ? 'active' : ''}`} onClick={() => onChange(label)} key={label}>
            <Icon size={18} strokeWidth={1.8} />
            <span>{label}</span>
            {label === 'Watchlist' && savedCount > 0 ? <span className="nav-count">{savedCount}</span> : null}
          </button>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div><span className={`status-dot ${live ? '' : 'offline'}`} /> {live ? 'Alpaca connected' : 'Data unavailable'}</div>
        <small>{feed.toUpperCase()} feed</small>
      </div>
    </aside>
  )
}
