export type MarketIndex = {
  symbol: string
  price: number
  change: number
}

export type StockOpportunity = {
  symbol: string
  company: string
  sector: string
  price: number
  dayChange: number
  ivRank: number
  expiry: string
  dte: number
  strike: number
  delta: number
  bid: number
  ask: number
  openInterest: number
  optionVolume: number
  avgStockVolume: number
  earningsBeforeExpiry: boolean
  earningsKnown?: boolean
  sparkline: number[]
  contractSymbol?: string
  impliedVolatility?: number
  quoteTimestamp?: string | null
  ivMetric?: string
}

export type LiveScanMeta = {
  provider: string
  stockFeed: string
  optionFeed: string
  isMarketOpen: boolean
  asOf: string
  universeCount: number
  pricedCount: number
  candidateCount: number
  contractsChecked: number
  resultCount: number
  note: string
  marketIndices: MarketIndex[]
}

export type SortKey = 'score' | 'ivRank' | 'return' | 'dayChange' | 'cash' | 'liquidity'
