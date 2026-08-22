import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import dotenv from 'dotenv'
import { AlpacaClient } from './alpaca.mjs'
import { scanWheel } from './scanner.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env'), override: false })

const app = express()
const client = new AlpacaClient({
  key: process.env.APCA_API_KEY_ID,
  secret: process.env.APCA_API_SECRET_KEY,
  stockFeed: process.env.ALPACA_STOCK_FEED || 'iex',
  optionFeed: process.env.ALPACA_OPTIONS_FEED || 'indicative',
})
const cacheSeconds = Number(process.env.WHEELHOUSE_SCAN_CACHE_SECONDS || 300)
let scanCache = null
let scanPromise = null

app.get('/api/health', async (_request, response) => {
  try {
    const clock = client.connected ? await client.getClock() : null
    response.json({ connected: client.connected, provider: 'Alpaca', stockFeed: client.stockFeed, optionFeed: client.optionFeed, clock })
  } catch (error) {
    response.status(503).json({ connected: false, provider: 'Alpaca', error: error.message })
  }
})

app.get('/api/scan', async (request, response) => {
  try {
    const force = request.query.refresh === 'true'
    if (!force && scanCache && Date.now() - scanCache.createdAt < cacheSeconds * 1000) return response.json(scanCache.data)
    if (!scanPromise) {
      scanPromise = scanWheel(client, {
        minDte: Number(request.query.minDte || 21),
        maxDte: Number(request.query.maxDte || 35),
        maxCash: Number(request.query.maxCash || 25000),
        minStockVolume: Number(request.query.minStockVolume || 250000),
        underlyingLimit: Number(process.env.WHEELHOUSE_UNDERLYING_LIMIT || 80),
      }).then((data) => {
        scanCache = { createdAt: Date.now(), data }
        return data
      }).finally(() => { scanPromise = null })
    }
    response.json(await scanPromise)
  } catch (error) {
    console.error('[scan]', error.message)
    response.status(error.status || 500).json({ error: error.message, provider: 'Alpaca' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')))
  app.use((request, response, next) => {
    if (request.method !== 'GET') return next()
    response.sendFile(path.join(root, 'dist', 'index.html'))
  })
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

const port = Number(process.env.PORT || 5173)
app.listen(port, '127.0.0.1', () => {
  console.log(`Wheelhouse live scanner: http://127.0.0.1:${port}`)
  console.log(`Alpaca: ${client.connected ? 'connected' : 'credentials missing'} · stocks ${client.stockFeed} · options ${client.optionFeed}`)
})
