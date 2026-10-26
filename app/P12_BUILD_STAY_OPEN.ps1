$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath $PSScriptRoot
$log = Join-Path $PSScriptRoot 'P12_FULL15_BUILD.log'
"P-12 FULL15 build: $(Get-Date -Format o)" | Set-Content -LiteralPath $log
"Folder: $PSScriptRoot" | Add-Content -LiteralPath $log
try {
    # Tee keeps progress visible and records early cmd / native / JS errors.
    & $env:ComSpec /d /c 'call BUILD_FULL15_ORIGINAL_GUI_INNER.cmd' 2>&1 |
        Tee-Object -FilePath $log -Append
    $code = $LASTEXITCODE
    "Builder exit code: $code" | Tee-Object -FilePath $log -Append
} catch {
    $_ | Out-String | Tee-Object -FilePath $log -Append
}
Write-Host "Output saved to: $log"
