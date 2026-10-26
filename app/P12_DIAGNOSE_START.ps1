$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dir = Join-Path $PSScriptRoot ("P12_STARTUP_REPORT_" + $stamp)
New-Item -ItemType Directory -Path $dir -Force | Out-Null
$log = Join-Path $dir 'STARTUP_CONSOLE.log'
"P-12 startup diagnostics: $(Get-Date -Format o)" | Set-Content -LiteralPath $log
"Folder: $PSScriptRoot" | Add-Content -LiteralPath $log
"Windows: $([Environment]::OSVersion.VersionString)" | Add-Content -LiteralPath $log
"ELECTRON_RUN_AS_NODE was set: $([bool]$env:ELECTRON_RUN_AS_NODE)" | Add-Content -LiteralPath $log
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$localElectron = Join-Path $PSScriptRoot 'node_modules\electron\dist\electron.exe'
$unpacked = Get-ChildItem -Path (Join-Path $PSScriptRoot 'dist-*\win-unpacked\P-12 v1.0.exe') -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
try {
    if (Test-Path -LiteralPath $localElectron) {
        'Launching local Electron normally (no smoke-test flag).' | Tee-Object -FilePath $log -Append
        & $localElectron . 2>&1 | Tee-Object -FilePath $log -Append
        "Electron exit code: $LASTEXITCODE" | Tee-Object -FilePath $log -Append
    } elseif ($unpacked) {
        "Launching unpacked app: $($unpacked.FullName)" | Tee-Object -FilePath $log -Append
        & $unpacked.FullName 2>&1 | Tee-Object -FilePath $log -Append
        "App exit code: $LASTEXITCODE" | Tee-Object -FilePath $log -Append
    } else {
        'No local Electron or unpacked application found. Build first using BUILD_FULL15_ORIGINAL_GUI.cmd.' |
            Tee-Object -FilePath $log -Append
    }
} catch { $_ | Out-String | Tee-Object -FilePath $log -Append }
# Collect logs only. Recovery snapshots, projects and audio samples are excluded.
$names = @('P12_ELECTRON.log','P12_DIAGNOSTICS.log','P12_AUDIO_DEBUG.log','P12_START.log','P12_FULL15_BUILD.log','P12_NATIVE_BUILD.log')
$locations = @($PSScriptRoot,(Join-Path $env:APPDATA 'p12-desktop'),(Join-Path $env:APPDATA 'P-12 v1.0'))
$i = 0
foreach ($location in $locations) {
    foreach ($name in $names) {
        $source = Join-Path $location $name
        if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination (Join-Path $dir ("location$i-"+$name)) -Force }
    }
    $i++
}
try {
    Get-WinEvent -FilterHashtable @{LogName='Application';StartTime=(Get-Date).AddMinutes(-30)} -ErrorAction Stop |
        Where-Object { $_.Message -match '(?i)p12|p-12|electron' } | Select-Object -First 20 TimeCreated,Id,ProviderName,Message |
        Format-List | Out-String -Width 240 | Set-Content -LiteralPath (Join-Path $dir 'WINDOWS_APPLICATION_ERRORS.txt')
} catch { "Windows error log: $($_.Exception.Message)" | Add-Content -LiteralPath $log }
$zip = Join-Path $PSScriptRoot 'P12_STARTUP_REPORT.zip'
Compress-Archive -Path (Join-Path $dir '*') -DestinationPath $zip -Force
Write-Host "Send this report: $zip"
Write-Host 'If P-12 stays open, close it normally to finish collecting the report.'
