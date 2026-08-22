import type { StockOpportunity } from '../types'

export const midpoint = (stock: StockOpportunity) => (stock.bid + stock.ask) / 2
export const cashRequired = (stock: StockOpportunity) => stock.strike * 100
export const premiumCredit = (stock: StockOpportunity) => midpoint(stock) * 100
export const returnOnCash = (stock: StockOpportunity) => premiumCredit(stock) / cashRequired(stock)
export const breakEven = (stock: StockOpportunity) => stock.strike - midpoint(stock)
export const downsideBuffer = (stock: StockOpportunity) => (stock.price - breakEven(stock)) / stock.price
export const annualizedReturn = (stock: StockOpportunity) => returnOnCash(stock) * (365 / stock.dte)
export const spreadPercent = (stock: StockOpportunity) => (stock.ask - stock.bid) / midpoint(stock)

export const assetTypeOf = (stock: StockOpportunity): 'equity' | 'etf' => {
  if (stock.assetType) return stock.assetType
  const fundIssuer = /^(ARK|Direxion|First Trust|Franklin|Global X|Invesco|iShares|JPMorgan BetaBuilders|Pacer|ProShares|Schwab|SPDR|VanEck|Vanguard|WisdomTree)\b/i
  const fundName = /\b(ETF|ETN|Exchange-Traded Fund|Index Fund|Portfolio Fund)\b/i
  return fundIssuer.test(stock.company) || fundName.test(stock.company) ? 'etf' : 'equity'
}

export const opportunityScore = (stock: StockOpportunity) => {
  const returnScore = Math.min(returnOnCash(stock) / 0.025, 1.5) * 32
  const ivScore = Math.min(stock.ivRank / 100, 1) * 24
  const liquidityScore = Math.min(stock.openInterest / 10000, 1) * 18
  const redDayScore = Math.min(Math.abs(Math.min(stock.dayChange, 0)) / 6, 1) * 14
  const spreadPenalty = Math.min(spreadPercent(stock) / 0.15, 1) * 8
  const earningsPenalty = stock.earningsBeforeExpiry ? 12 : 0
  return Math.max(0, Math.round(returnScore + ivScore + liquidityScore + redDayScore - spreadPenalty - earningsPenalty))
}

export const formatMoney = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits }).format(value)

export const formatPercent = (value: number, digits = 2) => `${(value * 100).toFixed(digits)}%`
