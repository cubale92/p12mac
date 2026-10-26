# Run this PowerShell script as Administrator.
$ErrorActionPreference = 'Stop'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "winget is not available. Install App Installer from Microsoft Store, or install these manually:" -ForegroundColor Red
    Write-Host "  - Git for Windows"
    Write-Host "  - CMake 3.24+"
    Write-Host "  - Visual Studio 2022 Build Tools with Desktop development with C++"
    exit 1
}

Write-Host "Installing Git..." -ForegroundColor Cyan
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements

Write-Host "Installing CMake..." -ForegroundColor Cyan
winget install --id Kitware.CMake -e --accept-source-agreements --accept-package-agreements

Write-Host "Installing Visual Studio 2022 Build Tools + C++ workload..." -ForegroundColor Cyan
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-source-agreements --accept-package-agreements --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"

Write-Host ""
Write-Host "Installation commands finished. Reboot Windows if requested, then run CHECK_BUILD_TOOLS.ps1." -ForegroundColor Green
