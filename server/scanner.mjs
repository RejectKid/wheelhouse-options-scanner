const DAY_MS = 86_400_000

const isoDate = (date) => date.toISOString().slice(0, 10)
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const quoteOf = (snapshot) => snapshot?.latestQuote || snapshot?.latest_quote || {}
const greeksOf = (snapshot) => snapshot?.greeks || {}

const inferAssetType = (asset = {}) => {
  const declaredType = String(asset.type || asset.asset_type || '').toLowerCase()
  if (declaredType.includes('etf') || declaredType.includes('etn')) return 'etf'
  const name = String(asset.name || '')
  const fundIssuer = /^(ARK|Direxion|First Trust|Franklin|Global X|Invesco|iShares|JPMorgan BetaBuilders|Pacer|ProShares|Schwab|SPDR|VanEck|Vanguard|WisdomTree)\b/i
  const fundName = /\b(ETF|ETN|Exchange-Traded Fund|Index Fund|Portfolio Fund)\b/i
  return fundIssuer.test(name) || fundName.test(name) ? 'etf' : 'equity'
}

const parseContractSymbol = (symbol) => {
  const match = symbol.match(/^([A-Z.]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/)
  if (!match) return null
  const [, root, yy, mm, dd, type, strike] = match
  return { root, expiry: `20${yy}-${mm}-${dd}`, type, strike: Number(strike) / 1000 }
}

const stockSnapshot = (symbol, asset, snapshot) => {
  const daily = snapshot?.dailyBar || snapshot?.daily_bar || {}
  const previous = snapshot?.prevDailyBar || snapshot?.previous_daily_bar || {}
  const trade = snapshot?.latestTrade || snapshot?.latest_trade || {}
  const price = finite(trade.p ?? trade.price ?? daily.c ?? daily.close)
  const previousClose = finite(previous.c ?? previous.close)
  if (!price || !previousClose) return null
  return {
    symbol,
    company: asset.name || symbol,
    exchange: asset.exchange || '',
    assetType: inferAssetType(asset),
    price,
    previousClose,
    dayChange: price / previousClose - 1,
    volume: finite(daily.v ?? daily.volume),
  }
}

const sparklineFor = (previousClose, price, symbol) => {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return Array.from({ length: 10 }, (_, index) => {
    const progress = index / 9
    const noise = Math.sin(seed + index * 2.1) * previousClose * 0.006
    return previousClose + (price - previousClose) * progress + noise * Math.sin(progress * Math.PI)
  })
}

export async function scanWheel(client, options = {}) {
  const now = new Date()
  const start = isoDate(new Date(now.getTime() + (options.minDte ?? 21) * DAY_MS))
  const end = isoDate(new Date(now.getTime() + (options.maxDte ?? 35) * DAY_MS))
  const maxCash = options.maxCash ?? 25_000
  const minStockVolume = options.minStockVolume ?? 250_000
  const underlyingLimit = options.underlyingLimit ?? 80

  const [assets, clock] = await Promise.all([client.getOptionableAssets(), client.getClock()])
  const assetMap = new Map(assets.map((asset) => [asset.symbol, asset]))
  const snapshots = await client.getStockSnapshots(assets.map((asset) => asset.symbol))
  const stocks = []
  for (const [symbol, snapshot] of Object.entries(snapshots)) {
    const stock = stockSnapshot(symbol, assetMap.get(symbol), snapshot)
    if (stock) stocks.push(stock)
  }

  const candidates = stocks
    .filter((stock) => stock.dayChange < 0 && stock.volume >= minStockVolume && stock.price >= 2 && stock.price <= maxCash / 70)
    .sort((a, b) => (b.volume * Math.abs(b.dayChange)) - (a.volume * Math.abs(a.dayChange)))
    .slice(0, underlyingLimit)

  const contracts = await client.getContracts(candidates.map((stock) => stock.symbol), start, end)
  const stockMap = new Map(candidates.map((stock) => [stock.symbol, stock]))
  const eligibleContracts = contracts.filter((contract) => {
    const stock = stockMap.get(contract.underlying_symbol)
    const strike = finite(contract.strike_price)
    return stock && contract.tradable && strike >= stock.price * 0.65 && strike <= stock.price && strike * 100 <= maxCash && finite(contract.open_interest) >= 50
  })
  const optionSnapshots = await client.getOptionSnapshots(eligibleContracts.map((contract) => contract.symbol))
  const opportunities = []

  for (const contract of eligibleContracts) {
    const stock = stockMap.get(contract.underlying_symbol)
    const snapshot = optionSnapshots[contract.symbol]
    const quote = quoteOf(snapshot)
    const greeks = greeksOf(snapshot)
    const parsed = parseContractSymbol(contract.symbol)
    const bid = finite(quote.bp ?? quote.bid_price)
    const ask = finite(quote.ap ?? quote.ask_price)
    const delta = finite(greeks.delta, NaN)
    const strike = finite(contract.strike_price ?? parsed?.strike)
    const midpoint = (bid + ask) / 2
    const cashReturn = strike > 0 ? midpoint / strike : 0
    if (!bid || !ask || !Number.isFinite(delta) || delta > -0.15 || delta < -0.4 || cashReturn < 0.02) continue
    const expiry = contract.expiration_date || parsed?.expiry
    const dte = Math.max(1, Math.round((new Date(`${expiry}T16:00:00-04:00`) - now) / DAY_MS))
    opportunities.push({
      symbol: stock.symbol,
      company: stock.company,
      sector: stock.exchange,
      assetType: stock.assetType,
      price: stock.price,
      dayChange: stock.dayChange,
      ivRank: Math.round(finite(snapshot?.impliedVolatility ?? snapshot?.implied_volatility) * 100),
      ivMetric: 'Current IV',
      expiry: new Date(`${expiry}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      dte,
      strike,
      delta,
      bid,
      ask,
      openInterest: finite(contract.open_interest),
      optionVolume: finite(snapshot?.latestTrade?.s ?? snapshot?.latest_trade?.size),
      avgStockVolume: stock.volume,
      earningsBeforeExpiry: false,
      earningsKnown: false,
      sparkline: sparklineFor(stock.previousClose, stock.price, stock.symbol),
      contractSymbol: contract.symbol,
      impliedVolatility: finite(snapshot?.impliedVolatility ?? snapshot?.implied_volatility),
      quoteTimestamp: quote.t ?? quote.timestamp ?? null,
    })
  }

  const bestByUnderlying = new Map()
  for (const item of opportunities) {
    const current = bestByUnderlying.get(item.symbol)
    const itemReturn = ((item.bid + item.ask) / 2) / item.strike
    const currentReturn = current ? ((current.bid + current.ask) / 2) / current.strike : 0
    if (!current || itemReturn > currentReturn) bestByUnderlying.set(item.symbol, item)
  }

  return {
    meta: {
      provider: 'Alpaca',
      stockFeed: client.stockFeed,
      optionFeed: client.optionFeed,
      isMarketOpen: Boolean(clock.is_open),
      asOf: now.toISOString(),
      universeCount: assets.length,
      pricedCount: stocks.length,
      candidateCount: candidates.length,
      contractsChecked: eligibleContracts.length,
      resultCount: bestByUnderlying.size,
      marketIndices: ['SPY', 'QQQ', 'IWM'].map((symbol) => stocks.find((stock) => stock.symbol === symbol)).filter(Boolean).map((stock) => ({ symbol: stock.symbol, price: stock.price, change: stock.dayChange })),
      dteRange: [options.minDte ?? 21, options.maxDte ?? 35],
      note: client.optionFeed === 'indicative' ? 'Indicative options pricing; not executable OPRA quotes.' : 'Live OPRA options quotes.',
    },
    opportunities: [...bestByUnderlying.values()],
  }
}
