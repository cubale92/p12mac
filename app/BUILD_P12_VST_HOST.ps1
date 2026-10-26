param(
    [ValidateSet('', 'VST3', 'VST2VST3')]
    [string]$Mode = '',
    [string]$Vst2SdkPath = ''
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$log = Join-Path $PSScriptRoot 'P12_NATIVE_BUILD.log'

try { Stop-Transcript | Out-Null } catch {}
try { Start-Transcript -Path $log -Force | Out-Null } catch {}

# Never prompt here: this script is invoked synchronously by the installer builder.
# A ReadKey/Read-Host would leave BUILD_P12_WINDOWS_EXE.cmd waiting indefinitely.
function Finish-And-Wait([int]$Code) {
    try { Stop-Transcript | Out-Null } catch {}
    exit $Code
}

function Fail([string]$Message, [int]$Code = 1) {
    Write-Host ''
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host 'BUILD FAILED' -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
    Write-Host '============================================================' -ForegroundColor Red
    Write-Host "Build log: $log" -ForegroundColor Yellow
    Finish-And-Wait $Code
}

function Resolve-Vst2SdkRoot([string]$Candidate) {
    if ([string]::IsNullOrWhiteSpace($Candidate)) { return $null }
    $Candidate = [Environment]::ExpandEnvironmentVariables($Candidate.Trim().Trim('"'))
    if (-not (Test-Path -LiteralPath $Candidate -PathType Container)) { return $null }

    # Expected JUCE layout: <sdk-root>\pluginterfaces\vst2.x\aeffect.h
    $directHeader = Join-Path $Candidate 'pluginterfaces\vst2.x\aeffect.h'
    if (Test-Path -LiteralPath $directHeader -PathType Leaf) {
        return (Resolve-Path -LiteralPath $Candidate).Path
    }

    # If the user selected a parent folder, find the SDK root automatically.
    $header = Get-ChildItem -LiteralPath $Candidate -Filter 'aeffect.h' -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '[\\/]pluginterfaces[\\/]vst2\.x[\\/]aeffect\.h$' } |
        Select-Object -First 1
    if ($header) {
        $vst2x = Split-Path -Parent $header.FullName
        $pluginterfaces = Split-Path -Parent $vst2x
        return (Split-Path -Parent $pluginterfaces)
    }
    return $null
}

function Select-Vst2SdkFolder {
    try {
        Add-Type -AssemblyName System.Windows.Forms
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
        $dialog.Description = 'Select your legally obtained VST2 SDK root (it must contain pluginterfaces\vst2.x\aeffect.h)'
        $dialog.ShowNewFolderButton = $false
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
            return $dialog.SelectedPath
        }
    } catch {
        Write-Host "Folder picker unavailable: $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
    return ''
}

function Verify-BuiltHost([string]$ExePath, [bool]$RequireVst2) {
    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $ExePath
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true
        $psi.RedirectStandardInput = $true
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $p = New-Object System.Diagnostics.Process
        $p.StartInfo = $psi
        if (-not $p.Start()) { return @{ ok = $false; message = 'Could not start the built host for verification.' } }
        $request = '{"id":"p12-build-verify","command":"status","payload":{}}'
        $p.StandardInput.WriteLine($request)
        $p.StandardInput.Close()
        # Peek() on a redirected pipe blocks indefinitely when the host is
        # alive but silent; a clock deadline around Peek() cannot fix that.
        $readTask = $p.StandardOutput.ReadLineAsync()
        $timely = $readTask.Wait(15000)
        $line = if ($timely) { $readTask.Result } else { $null }
        try { if (-not $p.HasExited) { $p.Kill() } } catch {}
        if ([string]::IsNullOrWhiteSpace($line)) { return @{ ok = $false; message = 'Host produced no status reply within 15 seconds.' } }
        $status = $line | ConvertFrom-Json
        if (-not $status.ok) { return @{ ok = $false; message = "Host status failed: $($status.message)" } }
        if (-not $status.vst3) { return @{ ok = $false; message = 'The built host did not report VST3 support.' } }
        if ($RequireVst2 -and -not $status.vst2) { return @{ ok = $false; message = 'The built host still reports vst2=false.' } }
        $vst2Text = if ($status.vst2) { 'true' } else { 'false' }
        return @{ ok = $true; message = "Verified host $($status.hostVersion): VST2=$vst2Text, VST3=true" } 
    } catch {
        return @{ ok = $false; message = "Verification exception: $($_.Exception.Message)" }
    }
}

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  P-12 Native VST Host - Windows x64 Builder' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "Folder: $PSScriptRoot"
Write-Host "Log:    $log"
Write-Host ''

if ([string]::IsNullOrWhiteSpace($Mode)) {
    Write-Host 'Choose build mode:' -ForegroundColor Yellow
    Write-Host '  1 = VST3 only (use this now; no VST2 SDK required)'
    Write-Host '  2 = VST2 + VST3 (requires a legally obtained VST2 SDK)'
    Write-Host ''
    $choice = Read-Host 'Select 1 or 2 [default: 1]'
    if ($choice -eq '2') { $Mode = 'VST2VST3' } else { $Mode = 'VST3' }
}

$requireVst2 = ($Mode -eq 'VST2VST3')
if ($requireVst2) {
    Write-Host 'Build mode: VST2 + VST3' -ForegroundColor Green
} else {
    Write-Host 'Build mode: VST3 only' -ForegroundColor Green
}
Write-Host ''

$cmake = Get-Command cmake.exe -ErrorAction SilentlyContinue
if (-not $cmake) { Fail 'CMake was not found. Install/reopen the Windows C++ build tools, then run this builder again.' 10 }
$git = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $git) { Fail 'Git was not found. Install Git, then run this builder again.' 11 }

$vswhereCandidates = @(
    @(
        "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe",
        "$env:ProgramFiles\Microsoft Visual Studio\Installer\vswhere.exe"
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
)
if ($vswhereCandidates.Count -eq 0) { Fail 'vswhere.exe was not found. Visual Studio 2022 Build Tools are probably not installed.' 12 }
$vswhere = [string]($vswhereCandidates | Select-Object -First 1)
$vsroot = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($vsroot)) {
    Fail 'Visual Studio 2022 C++ Build Tools were not found. Install Desktop development with C++.' 13
}

Write-Host "Visual Studio: $vsroot" -ForegroundColor Green
& $cmake.Source --version
& $git.Source --version
Write-Host ''

$sdkRoot = $null
$savedPathFile = Join-Path $PSScriptRoot 'VST2_SDK_PATH.txt'

if ($requireVst2) {
    # Resolve the VST2 SDK path from: explicit parameter -> environment -> saved path -> folder picker.
    $candidates = New-Object System.Collections.Generic.List[string]
    if (-not [string]::IsNullOrWhiteSpace($Vst2SdkPath)) { $candidates.Add($Vst2SdkPath) }
    if (-not [string]::IsNullOrWhiteSpace($env:P12_VST2_SDK_PATH)) { $candidates.Add($env:P12_VST2_SDK_PATH) }
    if (Test-Path -LiteralPath $savedPathFile -PathType Leaf) {
        $saved = (Get-Content -LiteralPath $savedPathFile -Raw).Trim()
        if ($saved) { $candidates.Add($saved) }
    }

    foreach ($candidate in $candidates) {
        $sdkRoot = Resolve-Vst2SdkRoot $candidate
        if ($sdkRoot) { break }
    }

    if (-not $sdkRoot) {
        Write-Host 'VST2 SDK path is not configured.' -ForegroundColor Yellow
        Write-Host 'A folder picker will open. Select the SDK root or a parent folder containing:' -ForegroundColor Yellow
        Write-Host '  pluginterfaces\vst2.x\aeffect.h' -ForegroundColor Yellow
        $picked = Select-Vst2SdkFolder
        $sdkRoot = Resolve-Vst2SdkRoot $picked
    }

    if (-not $sdkRoot) {
        Fail 'No valid VST2 SDK was selected. Run again and choose mode 1 for VST3-only, or provide a valid VST2 SDK for mode 2.' 15
    }

    Set-Content -LiteralPath $savedPathFile -Value $sdkRoot -Encoding ASCII
    Write-Host "VST2 SDK:     $sdkRoot" -ForegroundColor Green
    Write-Host ''
}

$src = Join-Path $PSScriptRoot 'native-host'
if ($requireVst2) {
    $build = Join-Path $src 'build\win64-vst2-vst3'
} else {
    $build = Join-Path $src 'build\win64-vst3'
}
if (-not (Test-Path -LiteralPath (Join-Path $src 'CMakeLists.txt'))) {
    Fail 'native-host\CMakeLists.txt is missing. Extract the entire ZIP before running the builder.' 14
}

if ($requireVst2) {
    Write-Host '[1/4] Configuring VST2 + VST3 host...' -ForegroundColor Cyan
    & $cmake.Source -S $src -B $build -G 'Visual Studio 17 2022' -A x64 '-DP12_ENABLE_VST2=ON' "-DP12_VST2_SDK_PATH=$sdkRoot"
} else {
    Write-Host '[1/4] Configuring VST3-only host...' -ForegroundColor Cyan
    & $cmake.Source -S $src -B $build -G 'Visual Studio 17 2022' -A x64 '-DP12_ENABLE_VST2=OFF'
}
if ($LASTEXITCODE -ne 0) { Fail "CMake configure failed with exit code $LASTEXITCODE. Read P12_NATIVE_BUILD.log and send it to ChatGPT." 20 }

Write-Host ''
Write-Host '[2/4] Building Release x64...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-vst-host -- /m
if ($LASTEXITCODE -ne 0) { Fail "Compilation failed with exit code $LASTEXITCODE. Read P12_NATIVE_BUILD.log and send it to ChatGPT." 21 }

Write-Host ''
Write-Host '[2b/4] Running native mixer regression tests...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-native-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'Native sampler unit-test compilation failed.' 25 }
$nativeTest = Get-ChildItem -LiteralPath $build -Filter 'p12-native-tests.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $nativeTest) { Fail 'Compiled native mixer tests were not found.' 26 }
& $nativeTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Native mixer regression tests failed.' 27 }
Write-Host 'Native mixer unit tests PASSED.' -ForegroundColor Green

# The scheduled-event regression test catches off-by-one/block boundary
# problems that can create timing jitter or wrongly clipped triggers.
& $cmake.Source --build $build --config Release --target p12-scheduled-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'Native scheduled-event test compilation failed.' 28 }
$scheduledTest = Get-ChildItem -LiteralPath $build -Filter 'p12-scheduled-tests.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $scheduledTest) { Fail 'Compiled scheduled-event tests were not found.' 29 }
& $scheduledTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Scheduled-event regression test failed.' 30 }
Write-Host 'Native scheduled-event tests PASSED.' -ForegroundColor Green

Write-Host '[2d/4] Running playback-only SP character regression...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-sp-character-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'SP character regression target failed to build.' 32 }
$spCharacterTest = Get-ChildItem -LiteralPath $build -Filter 'p12-sp-character-tests.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $spCharacterTest) { Fail 'Compiled SP character test was not found.' 33 }
& $spCharacterTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Playback-only SP character regression failed.' 34 }
Write-Host 'Playback-only SP character regression PASSED.' -ForegroundColor Green

Write-Host '[2e/4] Running native pad-control audio regressions...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-pad-controls-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'Native pad-control tests failed to build.' 35 }
$padControlTest = Get-ChildItem -LiteralPath $build -Filter 'p12-pad-controls-tests.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $padControlTest) { Fail 'Compiled pad-control test was not found.' 36 }
& $padControlTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Native pad-control audio regression failed.' 37 }
Write-Host 'Native pad-control audio regressions PASSED.' -ForegroundColor Green

Write-Host '[2f/4] Running native insert audio regressions...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-insert-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'Native insert tests failed to build.' 38 }
$insertTest = Get-ChildItem -LiteralPath $build -Filter 'p12-insert-tests.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $insertTest) { Fail 'Compiled insert test was not found.' 39 }
& $insertTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Native insert audio regression failed.' 40 }
Write-Host 'Native insert audio regressions PASSED.' -ForegroundColor Green

Write-Host '[2g/4] Running native SSL bus and spectrum regressions...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-bus-spectrum-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'Native bus/spectrum tests failed to build.' 41 }
$busTest = Get-ChildItem -LiteralPath $build -Filter 'p12-bus-spectrum-tests.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $busTest) { Fail 'Compiled bus/spectrum test was not found.' 42 }
& $busTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Native bus/spectrum audio regression failed.' 43 }
Write-Host 'Native SSL bus and spectrum regressions PASSED.' -ForegroundColor Green

Write-Host '[2h/4] Running live timing and plugin resource regressions...' -ForegroundColor Cyan
& $cmake.Source --build $build --config Release --target p12-live-resources-tests -- /m
if ($LASTEXITCODE -ne 0) { Fail 'Live timing/resource tests failed to build.' 44 }
$liveTest = Get-ChildItem -LiteralPath $build -Filter 'p12-live-resources-tests.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $liveTest) { Fail 'Compiled live timing/resource test was not found.' 45 }
& $liveTest.FullName
if ($LASTEXITCODE -ne 0) { Fail 'Live timing/resource regression failed.' 46 }

Write-Host '[3/4] Locating executable...'  -ForegroundColor Cyan
$exe = Get-ChildItem -LiteralPath $build -Filter 'p12-vst-host.exe' -File -Recurse -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
if (-not $exe) { Fail 'Build completed but p12-vst-host.exe was not found below the selected native-host build folder.' 22 }

$nativeDir = Join-Path $PSScriptRoot 'native'
New-Item -ItemType Directory -Force -Path $nativeDir | Out-Null
$dest = Join-Path $nativeDir 'p12-vst-host.exe'
if (Test-Path -LiteralPath $dest) {
    $backup = Join-Path $nativeDir 'p12-vst-host.previous.backup.exe'
    Copy-Item -LiteralPath $dest -Destination $backup -Force
    Write-Host "Backed up previous host: $backup" -ForegroundColor DarkGray
}
Copy-Item -LiteralPath $exe.FullName -Destination $dest -Force
if (-not (Test-Path -LiteralPath $dest)) { Fail 'The executable was built but could not be copied into native\.' 23 }

Write-Host ''
if ($requireVst2) {
    Write-Host '[4/4] Verifying VST2 + VST3 capability...' -ForegroundColor Cyan
} else {
    Write-Host '[4/4] Verifying VST3 capability...' -ForegroundColor Cyan
}
$verify = Verify-BuiltHost $dest $requireVst2
if (-not $verify.ok) { Fail $verify.message 24 }
Write-Host $verify.message -ForegroundColor Green

Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
if ($requireVst2) {
    Write-Host 'SUCCESS - VST2 + VST3 HOST BUILT' -ForegroundColor Green
} else {
    Write-Host 'SUCCESS - VST3 HOST BUILT' -ForegroundColor Green
}
Write-Host "Created: $dest" -ForegroundColor Green
if ($requireVst2) {
    Write-Host 'Verified: vst2=true, vst3=true' -ForegroundColor Green
} else {
    Write-Host 'Verified: vst3=true (VST2 intentionally disabled)' -ForegroundColor Green
}
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Next: npm start, then check P-12 SYSTEM / VST diagnostics.'
Finish-And-Wait 0
