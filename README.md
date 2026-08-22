# Wheelhouse Options Scanner

Wheelhouse screens the US optionable-stock universe for cash-secured put opportunities suited to an options wheel workflow.

## Features

- Discovers the full optionable US equity universe through Alpaca
- Bulk equity snapshots and broad-market red/green regime checks
- Staged 21–35 DTE put scanning that respects API rate limits
- Filters for current IV, collateral, target return, delta, liquidity, and earnings risk
- Contract economics, break-even, downside buffer, and opportunity scoring
- Responsive React dashboard with a persistent local watchlist
- Explicit feed labeling so indicative prices are not confused with executable OPRA quotes

## What you need

- Windows, macOS, or Linux
- [Node.js](https://nodejs.org/) 20 or newer (the LTS download is recommended)
- A free [Alpaca](https://alpaca.markets/) account and API keys
- Git, or the repository downloaded as a ZIP

Alpaca provides separate key pairs for its paper and live environments. Either can access market data. Wheelhouse only reads market data and does not contain order-placement code.

## One-click setup (Windows)

After downloading and extracting the repository, double-click **`setup-wheelhouse.cmd`**.

The launcher checks for Node.js 20+, installs the Node.js LTS release with Windows Package Manager when necessary, skips npm installation when packages are already current, creates the private `.env`, prompts for missing Alpaca credentials with the secret hidden, starts Wheelhouse, and opens it in the default browser.

Windows may show a permission prompt while installing Node.js. The Alpaca values are saved only in the local `.env`, which Git ignores. On later runs, double-click the same file; completed setup steps are skipped.

## Guided Windows setup

1. Install the Node.js LTS version from the link above. Accept the default installer options.
2. On GitHub, open this repository, select **Code → Download ZIP**, and extract the ZIP to a permanent folder such as `Documents\Wheelhouse`.
3. Open the extracted folder in File Explorer. Click the address bar, type `powershell`, and press Enter. This opens PowerShell in the correct folder.
4. Install the application packages:

   ```powershell
   npm install
   ```

5. Create your private settings file:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

6. In Alpaca, create or reveal an API key pair. Put those values into `.env`:

   ```dotenv
   APCA_API_KEY_ID=replace_with_your_key_id
   APCA_API_SECRET_KEY=replace_with_your_secret_key
   ALPACA_STOCK_FEED=iex
   ALPACA_OPTIONS_FEED=indicative
   ```

7. Save the file in Notepad, close it, and start Wheelhouse:

   ```powershell
   npm run dev
   ```

8. Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your browser. Leave the PowerShell window open while using Wheelhouse. Press `Ctrl+C` in that window when you want to stop it.

On future days, open PowerShell in the Wheelhouse folder and run only `npm run dev`. Press **Refresh** in the dashboard shortly before screening.

## Command-line setup

```powershell
git clone https://github.com/RejectKid/wheelhouse-options-scanner.git
cd wheelhouse-options-scanner
npm ci
Copy-Item .env.example .env
# Edit .env and add APCA_API_KEY_ID and APCA_API_SECRET_KEY
npm run dev
```

The React client and local API server run together at `http://127.0.0.1:5173/`. The server loads `.env`, keeps credentials out of the browser bundle, calls Alpaca, and caches scans briefly to stay within free-tier rate limits.

For a production build:

```powershell
npm run build
$env:NODE_ENV='production'
npm start
```

Never commit `.env`. It is already excluded by `.gitignore`. Rotate the Alpaca key immediately if it is accidentally exposed.

## Data accuracy

Alpaca Basic supplies real-time IEX equity data and indicative options pricing. Indicative option quotes are useful for screening but are not executable OPRA quotes. Confirm the final contract, bid/ask, and limit price in your broker before trading. Set `ALPACA_OPTIONS_FEED=opra` only when the connected Alpaca account has that entitlement.

The dashboard currently displays current implied volatility. A true 52-week IV rank requires a sufficiently long stored IV history and is intentionally not inferred from one snapshot.

The scanner discovers the full optionable Alpaca equity universe, prices the available underlyings in bulk, and inspects the strongest red-day/liquidity candidates in staged batches. This avoids pretending that thousands of option chains can be refreshed simultaneously on a free account.

## Troubleshooting

- **`npm` is not recognized:** install Node.js LTS, close PowerShell, and open it again.
- **Alpaca credentials are missing:** confirm the file is named exactly `.env`, not `.env.txt`, and that both key values are present without quotes.
- **SIP or OPRA subscription error:** use `ALPACA_STOCK_FEED=iex` and `ALPACA_OPTIONS_FEED=indicative` on the free plan.
- **Port 5173 is already in use:** close the older Wheelhouse PowerShell window or stop that process with `Ctrl+C`, then retry.
- **The scan shows old or no prices:** markets may be closed. Check the snapshot time and press **Refresh** during market hours.
- **The first scan takes longer:** the server is loading thousands of optionable assets and then checking the most relevant contracts. Later scans may use the short cache.

## Commands

```powershell
npm run dev    # Development server and dashboard
npm run build  # Type-check and create a production bundle
npm start      # Serve the production bundle when NODE_ENV=production
```

Wheelhouse is an educational screening tool, not investment advice. Options involve assignment and loss risk.
