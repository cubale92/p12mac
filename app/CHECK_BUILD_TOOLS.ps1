$ErrorActionPreference = 'Continue'
Write-Host "P-12 native VST host build prerequisites" -ForegroundColor Cyan
Write-Host ""

function Check-Command($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "[OK] $name -> $($cmd.Source)" -ForegroundColor Green
        return $true
    }
    Write-Host "[MISSING] $name" -ForegroundColor Yellow
    return $false
}

$cmake = Check-Command 'cmake'
$git = Check-Command 'git'

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
$vsOk = $false
if (Test-Path $vswhere) {
    $vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($vs) {
        Write-Host "[OK] Visual Studio C++ tools -> $vs" -ForegroundColor Green
        $vsOk = $true
    }
}
if (-not $vsOk) {
    Write-Host "[MISSING] Visual Studio 2022 C++ Build Tools / Desktop development with C++" -ForegroundColor Yellow
}

Write-Host ""
if ($cmake -and $git -and $vsOk) {
    Write-Host "Everything required for the VST3 build is installed." -ForegroundColor Green
    Write-Host "Double-click BUILD_P12_VST_HOST.cmd" -ForegroundColor Green
    exit 0
}

Write-Host "Missing prerequisites. Run INSTALL_BUILD_TOOLS.ps1 as Administrator, or install them manually." -ForegroundColor Yellow
exit 1
