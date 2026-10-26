<#
  P12 Retro — full Windows build: plug-in (VST3 + Standalone), P-12 native host,
  P-12 Electron desktop app, then the Inno Setup installer.

  Requirements: Visual Studio 2022 (Desktop C++), CMake 3.24+, Git, Node.js 22.12+,
                Inno Setup 6 (iscc on PATH or in Program Files).
  Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File scripts\build-windows.ps1
  Options: -Version 1.0.0  -SkipDesktop  -SkipTests
#>
param(
  [string]$Version = "1.0.0",
  [switch]$SkipDesktop,
  [switch]$SkipTests,
  [string]$Vst2SdkPath = $env:P12_VST2_SDK_PATH,
  [switch]$EnableVst2
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$stage = Join-Path $root "installer\stage"
function Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }

# Pass the same hosting capability to both the standalone/plugin and desktop host.
$vst2Args = @('-DP12_ENABLE_VST2=OFF', '-DP12_VST2_SDK_PATH=')
if ($EnableVst2 -or $Vst2SdkPath) {
  if (-not $Vst2SdkPath -or -not (Test-Path -LiteralPath (Join-Path $Vst2SdkPath 'pluginterfaces/vst2.x/aeffect.h'))) {
    throw 'VST2 requested: supply -Vst2SdkPath or P12_VST2_SDK_PATH pointing to your VST2 SDK.'
  }
  $Vst2SdkPath = (Resolve-Path -LiteralPath $Vst2SdkPath).Path
  $vst2Args = @('-DP12_ENABLE_VST2=ON', "-DP12_VST2_SDK_PATH=$Vst2SdkPath")
} else {
  Write-Warning 'VST2 hosting is disabled: no VST2 SDK was supplied.'
}

# Check the packaging tool before spending time compiling C++.
if (-not $SkipDesktop) {
  Step "Desktop packaging preflight"
  node -e "const [major,minor]=process.versions.node.split('.').map(Number); if(major<22 || (major===22 && minor<12)) { console.error('Node.js 22.12+ required; found '+process.version); process.exit(1); }"
  if ($LASTEXITCODE -ne 0) { throw "Unsupported Node.js runtime" }
  Push-Location "$root\app"
  try {
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "Desktop dependency installation failed" }
    npx --no-install electron-builder --version
    if ($LASTEXITCODE -ne 0) { throw "Desktop packaging tool could not load" }
  } finally { Pop-Location }
}

# --- WebView2 SDK (JUCE links it statically for the plug-in UI) -------------
Step "WebView2 SDK"
$pkg = Get-Package -Name Microsoft.Web.WebView2 -ErrorAction SilentlyContinue
if (-not $pkg) {
  if (-not (Get-PackageSource -Name nugetRepository -ErrorAction SilentlyContinue)) {
    Register-PackageSource -ProviderName NuGet -Name nugetRepository -Location https://www.nuget.org/api/v2 -Force | Out-Null
  }
  Install-Package Microsoft.Web.WebView2 -Scope CurrentUser -RequiredVersion 1.0.1901.177 -Source nugetRepository -Force | Out-Null
}

# --- Plug-in ------------------------------------------------------------------
Step "P12 Retro VST3 + Standalone"
cmake -S "$root\plugin" -B "$root\plugin\build" -G "Visual Studio 17 2022" -A x64 @vst2Args
if ($LASTEXITCODE -ne 0) { throw "Plug-in CMake configuration failed" }
cmake --build "$root\plugin\build" --config Release --target P12Retro_VST3 P12Retro_Standalone --parallel
if ($LASTEXITCODE -ne 0) { throw "Plug-in compilation failed" }
$art = "$root\plugin\build\P12Retro_artefacts\Release"

# --- Native host + Electron desktop app ---------------------------------------
if (-not $SkipDesktop) {
  Step "P-12 native host"
  cmake -S "$root\app\native-host" -B "$root\app\native-host\build" -G "Visual Studio 17 2022" -A x64 @vst2Args
  if ($LASTEXITCODE -ne 0) { throw "Native host CMake configuration failed" }
  cmake --build "$root\app\native-host\build" --config Release --target p12-vst-host --parallel
  if ($LASTEXITCODE -ne 0) { throw "Native host compilation failed" }
  New-Item -ItemType Directory -Force "$root\app\native" | Out-Null
  Copy-Item "$root\app\native-host\build\bin\p12-vst-host.exe" "$root\app\native\p12-vst-host.exe" -Force

  if (-not $SkipTests) {
    Step "P-12 source tests"
    Push-Location "$root\app"
    try {
    foreach ($t in "tests-full15-integrated.cjs","tests-rossum-encoder-unchanged.cjs","tests-native-host-realtime-source.cjs","tests-safety-layer-source.cjs","tests-save-playback-snapshot.cjs") {
      node $t; if ($LASTEXITCODE -ne 0) { throw "Test failed: $t" }
    }
    } finally { Pop-Location }
  }

  Step "P-12 Electron desktop app"
  Push-Location "$root\app"
  try {
    npx --no-install electron-builder --win dir --x64 --publish never --config.directories.output=dist-unpacked
    if ($LASTEXITCODE -ne 0) { throw "Desktop packaging failed" }
  } finally { Pop-Location }
}

# --- Stage + installer ------------------------------------------------------------
Step "Stage files"
Remove-Item -Recurse -Force $stage -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force "$stage\VST3","$stage\Standalone","$stage\redist" | Out-Null
Copy-Item -Recurse "$art\VST3\P12 Retro.vst3" "$stage\VST3\"
Copy-Item "$art\Standalone\P12 Retro.exe" "$stage\Standalone\"
if (-not $SkipDesktop) { Copy-Item -Recurse "$root\app\dist-unpacked\win-unpacked" "$stage\Desktop" }
try {
  Invoke-WebRequest "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -OutFile "$stage\redist\MicrosoftEdgeWebview2Setup.exe"
} catch { Write-Warning "WebView2 bootstrapper not downloaded; installer will only show a hint if WebView2 is missing." }

Step "Inno Setup"
function Find-Iscc {
  $c = (Get-Command iscc -ErrorAction SilentlyContinue).Source
  if ($c) { return $c }
  foreach ($p in @("${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
                   "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
                   "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe")) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  return $null
}
$iscc = Find-Iscc
if (-not $iscc -and (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "Inno Setup not found - installing it with winget..." -ForegroundColor Yellow
  winget install --id JRSoftware.InnoSetup -e --accept-package-agreements --accept-source-agreements | Out-Host
  $iscc = Find-Iscc
}
if (-not $iscc) {
  throw "Inno Setup 6 is not installed. Install it (winget install JRSoftware.InnoSetup, or https://jrsoftware.org/isdl.php) and run this script again. Everything else is already built."
}
& $iscc "/DAppVersion=$Version" "$root\installer\P12Retro.iss"
if ($LASTEXITCODE -ne 0) { throw "ISCC failed" }
Write-Host "`nInstaller: $root\installer\Output\p12-retro-$Version-setup.exe" -ForegroundColor Green
