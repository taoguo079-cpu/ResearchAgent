[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$venvRoot = Join-Path $repoRoot '.venv'
$pythonPath = Join-Path $venvRoot 'Scripts\python.exe'
$webRoot = Join-Path $repoRoot 'web'
$requirements = Join-Path $repoRoot 'requirements.txt'
$packageFile = Join-Path $webRoot 'package.json'
$lockFile = Join-Path $webRoot 'package-lock.json'
$envFile = Join-Path $repoRoot '.env'
$envExample = Join-Path $repoRoot '.env.example'

function Find-SystemPython {
    # Prefer the project's recommended version, then another supported Python.
    foreach ($candidate in @(
        @{ Name = 'py.exe'; Arguments = @('-3.12') },
        @{ Name = 'python.exe'; Arguments = @() },
        @{ Name = 'py.exe'; Arguments = @('-3') }
    )) {
        $command = Get-Command $candidate.Name -ErrorAction SilentlyContinue
        if (-not $command) { continue }
        $pythonArguments = $candidate.Arguments
        try {
            & $command.Source @pythonArguments -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>$null
            if ($LASTEXITCODE -eq 0) {
                return @{ Path = $command.Source; Arguments = $pythonArguments }
            }
        } catch {
            # A missing launcher version or Windows Store alias is not usable.
        }
    }
    throw 'Python 3.11 or newer was not found. Install Python 3.12 with the Python launcher or add python.exe to PATH, then run this launcher again.'
}

try {
    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $npmCommand -or -not $nodeCommand) {
        throw 'Node.js/npm was not found. Install Node.js 20.9 or newer, then run this launcher again.'
    }
    $nodeVersion = & $nodeCommand.Source --version
    if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+)\.(\d+)\.') {
        throw 'Could not determine the Node.js version.'
    }
    if ([int]$Matches[1] -lt 20 -or ([int]$Matches[1] -eq 20 -and [int]$Matches[2] -lt 9)) {
        throw 'This frontend requires Node.js 20.9 or newer. Update Node.js, then run this launcher again.'
    }
    foreach ($file in @($requirements, $packageFile, $lockFile)) {
        if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Dependency manifest not found: $file" }
    }
    if (-not (Test-Path -LiteralPath $envFile) -and -not (Test-Path -LiteralPath $envExample -PathType Leaf)) {
        throw "Environment template not found: $envExample"
    }

    if (-not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
        $systemPython = Find-SystemPython
        $pythonArguments = $systemPython.Arguments
        Write-Host "Creating Python virtual environment: $venvRoot" -ForegroundColor Cyan
        & $systemPython.Path @pythonArguments -m venv $venvRoot
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $pythonPath -PathType Leaf)) {
            throw 'Virtual environment creation failed. Run this launcher again to retry.'
        }
    }
    & $pythonPath -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'
    if ($LASTEXITCODE -ne 0) {
        throw 'The local .venv is unusable or uses Python older than 3.11. Recreate it with Python 3.12, then run this launcher again.'
    }

    $requirementsHash = (Get-FileHash -LiteralPath $requirements -Algorithm SHA256).Hash
    $pythonStamp = Join-Path $venvRoot '.research-agent-requirements.sha256'
    $installedPythonHash = if (Test-Path -LiteralPath $pythonStamp -PathType Leaf) { (Get-Content -LiteralPath $pythonStamp -Raw).Trim() } else { '' }
    if ($installedPythonHash -ne $requirementsHash) {
        Remove-Item -LiteralPath $pythonStamp -ErrorAction SilentlyContinue
        Write-Host 'Installing Python dependencies. First-time setup requires an internet connection...' -ForegroundColor Cyan
        # An interrupted venv creation can leave python.exe without pip.
        & $pythonPath -m ensurepip --upgrade
        if ($LASTEXITCODE -ne 0) { throw 'Could not prepare pip. Run this launcher again to retry.' }
        & $pythonPath -m pip install -r $requirements
        if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed. Run this launcher again to retry.' }
        Set-Content -LiteralPath $pythonStamp -Value $requirementsHash -Encoding ASCII
    } else {
        Write-Host 'Python dependencies are ready; skipping installation.'
    }

    $frontendHash = "{0}:{1}" -f (Get-FileHash -LiteralPath $packageFile -Algorithm SHA256).Hash, (Get-FileHash -LiteralPath $lockFile -Algorithm SHA256).Hash
    $frontendStamp = Join-Path $webRoot 'node_modules\.research-agent-dependencies.sha256'
    $nextCommand = Join-Path $webRoot 'node_modules\.bin\next.cmd'
    $installedFrontendHash = if (Test-Path -LiteralPath $frontendStamp -PathType Leaf) { (Get-Content -LiteralPath $frontendStamp -Raw).Trim() } else { '' }
    if ($installedFrontendHash -ne $frontendHash -or -not (Test-Path -LiteralPath $nextCommand -PathType Leaf)) {
        Remove-Item -LiteralPath $frontendStamp -ErrorAction SilentlyContinue
        Write-Host 'Installing frontend dependencies (npm ci)...' -ForegroundColor Cyan
        & $npmCommand.Source --prefix $webRoot ci --include=dev
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed. Run this launcher again to retry.' }
        if (-not (Test-Path -LiteralPath $nextCommand -PathType Leaf)) { throw 'Frontend installation did not create next.cmd. Run this launcher again to retry.' }
        Set-Content -LiteralPath $frontendStamp -Value $frontendHash -Encoding ASCII
    } else {
        Write-Host 'Frontend dependencies are ready; skipping installation.'
    }

    if (-not (Test-Path -LiteralPath $envFile)) {
        Copy-Item -LiteralPath $envExample -Destination $envFile
        Write-Host 'Created .env from .env.example. Configure your API key in the app after startup.'
    }
    Write-Host 'Research Agent dependencies are ready.' -ForegroundColor Green
} catch {
    Write-Host "Setup failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
