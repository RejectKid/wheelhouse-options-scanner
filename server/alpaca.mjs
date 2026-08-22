const DATA_URL = 'https://data.alpaca.markets'
const PAPER_URL = 'https://paper-api.alpaca.markets'

const chunks = (items, size) => {
  const result = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

const mapLimit = async (items, limit, mapper) => {
  const output = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      output[index] = await mapper(items[index], index)
    }
  })
  await Promise.all(workers)
  return output
}

export class AlpacaClient {
  constructor({ key, secret, stockFeed = 'iex', optionFeed = 'indicative' }) {
    this.key = key
    this.secret = secret
    this.stockFeed = stockFeed
    this.optionFeed = optionFeed
  }

  get connected() { return Boolean(this.key && this.secret) }

  async request(base, pathname, params = {}) {
    if (!this.connected) throw new Error('Alpaca credentials are not configured')
    const url = new URL(pathname, base)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    try {
      const response = await fetch(url, {
        headers: { 'APCA-API-KEY-ID': this.key, 'APCA-API-SECRET-KEY': this.secret },
        signal: controller.signal,
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        const error = new Error(body.message || `Alpaca request failed (${response.status})`)
        error.status = response.status
        throw error
      }
      return body
    } finally { clearTimeout(timeout) }
  }

  getClock() { return this.request(PAPER_URL, '/v2/clock') }

  async getOptionableAssets() {
    const assets = await this.request(PAPER_URL, '/v2/assets', { status: 'active', asset_class: 'us_equity', attributes: 'has_options' })
    return assets.filter((asset) => asset.tradable && asset.status === 'active' && asset.attributes?.includes('has_options'))
  }

  async getStockSnapshots(symbols) {
    const batches = chunks(symbols, 200)
    const results = await mapLimit(batches, 6, (batch) => this.request(DATA_URL, '/v2/stocks/snapshots', {
      symbols: batch.join(','), feed: this.stockFeed,
    }))
    return Object.assign({}, ...results)
  }

  async getContracts(symbols, start, end) {
    const batches = chunks(symbols, 50)
    const all = []
    for (const batch of batches) {
      let pageToken
      do {
        const page = await this.request(PAPER_URL, '/v2/options/contracts', {
          underlying_symbols: batch.join(','),
          expiration_date_gte: start,
          expiration_date_lte: end,
          type: 'put',
          status: 'active',
          limit: 10000,
          page_token: pageToken,
        })
        all.push(...(page.option_contracts || []))
        pageToken = page.next_page_token
      } while (pageToken)
    }
    return all
  }

  async getOptionSnapshots(symbols) {
    const batches = chunks(symbols, 100)
    const results = await mapLimit(batches, 6, (batch) => this.request(DATA_URL, '/v1beta1/options/snapshots', {
      symbols: batch.join(','), feed: this.optionFeed, limit: 1000,
    }))
    return Object.assign({}, ...results.map((result) => result.snapshots || result))
  }
}

export { chunks }
