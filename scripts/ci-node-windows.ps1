# Use an isolated, pinned Node runtime instead of the runner's preinstalled Node.
$ErrorActionPreference = 'Stop'
$nodeVersion = '22.23.4'
$toolsRoot = Join-Path (Split-Path -Parent $PSScriptRoot) '.ci-tools'
$archiveName = "node-v$nodeVersion-win-x64.zip"
$archive = Join-Path $toolsRoot $archiveName
$baseUrl = "https://nodejs.org/dist/v$nodeVersion"
New-Item -ItemType Directory -Force $toolsRoot | Out-Null
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -UseBasicParsing "$baseUrl/$archiveName" -OutFile $archive
$checksums = (Invoke-WebRequest -UseBasicParsing "$baseUrl/SHASUMS256.txt").Content
$line = @($checksums -split "`n" | Where-Object { $_.Trim().EndsWith("  $archiveName") })
if ($line.Count -ne 1) { throw "No unique checksum for $archiveName" }
$expectedHash = ($line[0].Trim() -split '\s+')[0]
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
  throw 'Node archive checksum mismatch'
}
Expand-Archive -LiteralPath $archive -DestinationPath $toolsRoot -Force
$nodeDirectory = Join-Path $toolsRoot "node-v$nodeVersion-win-x64"
$env:PATH = "$nodeDirectory;$env:PATH"
$actualVersion = & (Join-Path $nodeDirectory 'node.exe') --version
if ($LASTEXITCODE -ne 0 -or $actualVersion -ne "v$nodeVersion") { throw 'Pinned Node verification failed' }
Write-Host "Using Node $actualVersion from $nodeDirectory"
