[CmdletBinding()]
param(
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_.-]*$')]
  [string]$EnvironmentName = 'research-agent',
  [string]$CondaExe,
  [switch]$InstallDependencies,
  [switch]$NoBrowser,
  [switch]$SetupOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

# Prefer an explicit installation, then the current shell and common locations.
if (-not $CondaExe) {
  $candidates = @($env:CONDA_EXE)
  foreach ($name in @('conda.exe', 'conda.bat')) {
    $command = Get-Command $name -ErrorAction SilentlyContinue
    if ($command) { $candidates += $command.Source }
  }
  foreach ($base in @($env:USERPROFILE, $env:LOCALAPPDATA, $env:ProgramData)) {
    if ($base) {
      foreach ($distribution in @('anaconda3', 'miniconda3', 'miniforge3')) {
        $candidates += Join-Path $base "$distribution\Scripts\conda.exe"
      }
    }
  }
  $CondaExe = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
}
if (-not $CondaExe -or -not (Test-Path -LiteralPath $CondaExe -PathType Leaf)) {
  throw 'Conda was not found. Install Anaconda/Miniconda, or pass -CondaExe with its full conda.exe path.'
}
$CondaExe = (Resolve-Path -LiteralPath $CondaExe).Path
if ($EnvironmentName -in @('base', 'root')) {
  throw 'Choose a dedicated environment name instead of base/root.'
}
$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $npmCommand -or -not $nodeCommand) {
  throw 'Node.js/npm was not found. Install Node.js before running this script.'
}
$npmDirectory = Split-Path -Parent $npmCommand.Source
$nodeDirectory = Split-Path -Parent $nodeCommand.Source

$environmentJson = & $CondaExe env list --json
if ($LASTEXITCODE -ne 0) { throw 'Could not list Conda environments.' }
$environments = ($environmentJson -join "`n") | ConvertFrom-Json
$environmentPath = $environments.envs | Where-Object {
  $_ -ne $environments.root_prefix -and (Split-Path -Leaf $_) -eq $EnvironmentName
} | Select-Object -First 1
if (-not $environmentPath) {
  Write-Host "Creating Conda environment '$EnvironmentName' with Python 3.12..."
  & $CondaExe create --name $EnvironmentName python=3.12 pip --yes
  if ($LASTEXITCODE -ne 0) { throw 'Conda environment creation failed.' }
}

# Use Conda's own activation hook so DLL paths and activation scripts are applied.
# This initializes only this PowerShell process; no conda init/profile edit is needed.
$previousArgumentPassing = $global:PSNativeCommandArgumentPassing
try {
  # Older Conda modules pass empty _CE_* arguments. Module functions read the
  # global preference, so temporarily use Windows PowerShell argument handling.
  $global:PSNativeCommandArgumentPassing = 'Legacy'
  $hook = & $CondaExe shell.powershell hook
  if ($LASTEXITCODE -ne 0) { throw 'Could not initialize Conda for PowerShell.' }
  Invoke-Expression ($hook -join "`n")
  $activationTarget = if ($environmentPath) { $environmentPath } else { $EnvironmentName }
  conda activate $activationTarget
  if ($LASTEXITCODE -ne 0 -or -not $env:CONDA_PREFIX -or
      (Split-Path -Leaf $env:CONDA_PREFIX) -ne $EnvironmentName) {
    throw "Could not activate Conda environment '$EnvironmentName'."
  }
} finally {
  $global:PSNativeCommandArgumentPassing = $previousArgumentPassing
}
# Some environments replace PATH during activation. Keep the frontend runtime
# discovered above available to npm and to the shared launcher.
$env:PATH = "$npmDirectory;$nodeDirectory;$env:PATH"
$env:PYTHON_EXE = Join-Path $env:CONDA_PREFIX 'python.exe'
if (-not (Test-Path -LiteralPath $env:PYTHON_EXE -PathType Leaf)) {
  throw "Python was not found in '$EnvironmentName'. Create this environment with Python 3.12."
}
& $env:PYTHON_EXE -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'
if ($LASTEXITCODE -ne 0) { throw 'This project requires Python 3.11 or newer; Python 3.12 is used for new environments.' }

$requirements = Join-Path $repoRoot 'requirements.txt'
$requirementsHash = (Get-FileHash -LiteralPath $requirements -Algorithm SHA256).Hash
$stamp = Join-Path $env:CONDA_PREFIX '.research-agent-requirements.sha256'
$installedHash = if (Test-Path -LiteralPath $stamp) { (Get-Content -LiteralPath $stamp -Raw).Trim() } else { '' }
if ($InstallDependencies -or $installedHash -ne $requirementsHash) {
  Write-Host "Installing Python dependencies into '$EnvironmentName'..."
  & $env:PYTHON_EXE -m pip install -r $requirements
  if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed. Run this script again to retry.' }
  Set-Content -LiteralPath $stamp -Value $requirementsHash -Encoding ASCII
}

$webRoot = Join-Path $repoRoot 'web'
if ($InstallDependencies -or -not (Test-Path -LiteralPath (Join-Path $webRoot 'node_modules/.bin/next.cmd'))) {
  & npm.cmd --prefix $webRoot ci
  if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed. Run this script again to retry.' }
}
$envFile = Join-Path $repoRoot '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
  Copy-Item -LiteralPath (Join-Path $repoRoot '.env.example') -Destination $envFile
}

Write-Host "Conda Python: $env:PYTHON_EXE" -ForegroundColor Green
if ($SetupOnly) { return }
& (Join-Path $PSScriptRoot 'start_agent.ps1') -NoBrowser:$NoBrowser
