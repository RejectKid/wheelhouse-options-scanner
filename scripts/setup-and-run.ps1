[CmdletBinding()]
param(
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$requiredNodeMajor = 20
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot '.env'
$envExample = Join-Path $projectRoot '.env.example'
$packageLock = Join-Path $projectRoot 'package-lock.json'
$nodeModules = Join-Path $projectRoot 'node_modules'
$installStamp = Join-Path $nodeModules '.package-lock.json'

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Get-NodeMajorVersion {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCommand) { return $null }
    $versionText = (& node --version).TrimStart('v')
    $parsed = [version]$versionText
    return $parsed.Major
}

function Ensure-Node {
    Write-Step 'Checking Node.js'
    $nodeMajor = Get-NodeMajorVersion
    if ($nodeMajor -ge $requiredNodeMajor) {
        Write-Host "Node.js $(node --version) is already installed."
        return
    }

    if ($CheckOnly) {
        throw "Node.js $requiredNodeMajor or newer is required."
    }

    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if (-not $winget) {
        Write-Host 'Node.js is required, but winget is not available.' -ForegroundColor Yellow
        Write-Host 'Install the Node.js LTS release from https://nodejs.org/ and run setup-wheelhouse.cmd again.'
        Start-Process 'https://nodejs.org/'
        throw 'Automatic Node.js installation is unavailable on this computer.'
    }

    Write-Host 'Node.js is missing or too old. Installing the current LTS release...'
    & winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "winget could not install Node.js (exit code $LASTEXITCODE)." }

    Refresh-Path
    $nodeMajor = Get-NodeMajorVersion
    if ($nodeMajor -lt $requiredNodeMajor) {
        throw 'Node.js was installed, but this window cannot see it yet. Close this window and run setup-wheelhouse.cmd again.'
    }
    Write-Host "Installed Node.js $(node --version)."
}

function Ensure-Dependencies {
    Write-Step 'Checking application packages'
    $needsInstall = -not (Test-Path $nodeModules) -or -not (Test-Path $installStamp)
    if (-not $needsInstall) {
        $needsInstall = (Get-Item $packageLock).LastWriteTimeUtc -gt (Get-Item $installStamp).LastWriteTimeUtc
    }

    if (-not $needsInstall) {
        Write-Host 'npm packages are already up to date.'
        return
    }
    if ($CheckOnly) { throw 'npm packages need to be installed or updated.' }

    Write-Host 'Installing npm packages. This may take a minute on the first run...'
    Push-Location $projectRoot
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit code $LASTEXITCODE)." }
    } finally { Pop-Location }
}

function Get-EnvValue([string[]]$Lines, [string]$Name) {
    $line = $Lines | Where-Object { $_ -match "^$([regex]::Escape($Name))=" } | Select-Object -Last 1
    if (-not $line) { return '' }
    return ($line -split '=', 2)[1].Trim()
}

function Set-EnvValue([string[]]$Lines, [string]$Name, [string]$Value) {
    $replacement = "$Name=$Value"
    $found = $false
    $updated = foreach ($line in $Lines) {
        if ($line -match "^$([regex]::Escape($Name))=") {
            $found = $true
            $replacement
        } else { $line }
    }
    if (-not $found) { $updated += $replacement }
    return $updated
}

function Read-SecretText([string]$Prompt) {
    $secureValue = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Ensure-Environment {
    Write-Step 'Checking Alpaca configuration'
    if (-not (Test-Path $envFile)) {
        if ($CheckOnly) { throw 'The local .env file has not been created.' }
        Copy-Item -LiteralPath $envExample -Destination $envFile
        Write-Host 'Created a private .env file. Git is configured to ignore it.'
    }

    $lines = [IO.File]::ReadAllLines($envFile)
    $keyId = Get-EnvValue $lines 'APCA_API_KEY_ID'
    $secretKey = Get-EnvValue $lines 'APCA_API_SECRET_KEY'
    if ($keyId -and $secretKey) {
        Write-Host 'Alpaca credentials are configured. Values were not displayed.'
        return
    }
    if ($CheckOnly) { throw 'The local .env file is missing one or both Alpaca credentials.' }

    Write-Host 'Wheelhouse needs an Alpaca API key pair for market data.'
    Write-Host 'Create or reveal a key in your Alpaca dashboard. Input stays on this computer.'
    $openDashboard = Read-Host 'Open the Alpaca dashboard now? (Y/n)'
    if ([string]::IsNullOrWhiteSpace($openDashboard) -or $openDashboard -match '^[Yy]') {
        Start-Process 'https://app.alpaca.markets/'
    }

    if (-not $keyId) { $keyId = (Read-Host 'Paste APCA_API_KEY_ID').Trim() }
    if (-not $secretKey) { $secretKey = (Read-SecretText 'Paste APCA_API_SECRET_KEY (input is hidden)').Trim() }
    if (-not $keyId -or -not $secretKey) { throw 'Both Alpaca credential values are required.' }
    if ($keyId -match '[\r\n]' -or $secretKey -match '[\r\n]') { throw 'Credential values cannot contain line breaks.' }

    $lines = Set-EnvValue $lines 'APCA_API_KEY_ID' $keyId
    $lines = Set-EnvValue $lines 'APCA_API_SECRET_KEY' $secretKey
    [IO.File]::WriteAllLines($envFile, $lines, [Text.UTF8Encoding]::new($false))
    Write-Host 'Saved the credentials to the ignored local .env file.' -ForegroundColor Green
}

function Start-Wheelhouse {
    if ($CheckOnly) {
        Write-Step 'Setup check passed'
        Write-Host 'Node.js, npm packages, and Alpaca configuration are ready.' -ForegroundColor Green
        return
    }

    Write-Step 'Starting Wheelhouse'
    $url = 'http://127.0.0.1:5173/'
    try {
        $existing = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        if ($existing.StatusCode -eq 200 -and $existing.Content -match 'Wheelhouse') {
            Start-Process $url
            Write-Host 'Wheelhouse was already running, so the existing app was opened.' -ForegroundColor Green
            return
        }
    } catch { }

    $server = Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm run dev' -WorkingDirectory $projectRoot -PassThru
    $ready = $false
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
        if ($server.HasExited) { throw 'The Wheelhouse server exited before it was ready.' }
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) { $ready = $true; break }
        } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ready) { throw 'Wheelhouse did not become ready within 20 seconds. Check the server window for details.' }

    Start-Process $url
    Write-Host 'Wheelhouse is running and has been opened in your browser.' -ForegroundColor Green
    Write-Host 'Keep the server window open. Close it or press Ctrl+C there to stop Wheelhouse.'
}

try {
    Set-Location $projectRoot
    Ensure-Node
    Ensure-Dependencies
    Ensure-Environment
    Start-Wheelhouse
} catch {
    Write-Host "`nSetup error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
