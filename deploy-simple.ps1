# BloxdHub SFTP Deployment Script - Simplified for PowerShell 5.0
# Deploys BloxdHub to remote SFTP server using PuTTY pscp

param(
    [string]$EnvFile = ".env",
    [switch]$DryRun = $false
)

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "BloxdHub SFTP Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
if (Test-Path $EnvFile) {
    Write-Host "[OK] Loading credentials from $EnvFile" -ForegroundColor Green
    Get-Content $EnvFile | Where-Object { $_ -notmatch '^#' -and $_ -ne "" } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            $varName = $parts[0].Trim()
            $varValue = $parts[1].Trim()
            New-Variable -Name $varName -Value $varValue -Force
        }
    }
} else {
    Write-Host "[ERROR] $EnvFile not found" -ForegroundColor Red
    exit 1
}

# Verify credentials
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  Host:     $SFTP_HOST"
Write-Host "  Username: $SFTP_USERNAME"
Write-Host "  Port:     $SFTP_PORT"
Write-Host "  Path:     $SFTP_REMOTE_PATH"
Write-Host ""

# Check distribution files
$distDir = Join-Path (Get-Location) "dist"
if (-not (Test-Path $distDir)) {
    Write-Host "[ERROR] dist folder not found" -ForegroundColor Red
    exit 1
}

$distFiles = Get-ChildItem $distDir -File
Write-Host "Files to deploy:" -ForegroundColor Cyan
$totalSize = 0
foreach ($file in $distFiles) {
    $sizeKB = [math]::Round($file.Length / 1KB, 2)
    Write-Host "  - $($file.Name) ($sizeKB KB)"
    $totalSize += $file.Length
}
Write-Host ""
Write-Host "Total: $(([math]::Round($totalSize / 1MB, 2))) MB" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host ""
    Write-Host "[INFO] DRY RUN - No files will be uploaded" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Uploading..." -ForegroundColor Cyan

# Check for PuTTY pscp
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
if (-not (Test-Path $pscpPath)) {
    Write-Host "[ERROR] PuTTY PSCP not found at: $pscpPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install PuTTY from: https://www.chiark.greenend.org.uk/~sgtatham/putty/" -ForegroundColor Yellow
    exit 1
}

$uploadCount = 0
$errorCount = 0

foreach ($file in $distFiles) {
    $fileName = $file.Name
    Write-Host -NoNewline "  $fileName ... "
    
    try {
        # Use pscp with password
        $output = & $pscpPath -P $SFTP_PORT -l $SFTP_USERNAME -pw $SFTP_PASSWORD "$($file.FullName)" "${SFTP_USERNAME}@${SFTP_HOST}:${SFTP_REMOTE_PATH}" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK" -ForegroundColor Green
            $uploadCount++
        } else {
            Write-Host "FAILED" -ForegroundColor Red
            Write-Host "    Error: $output"
            $errorCount++
        }
    }
    catch {
        Write-Host "ERROR" -ForegroundColor Red
        Write-Host "    $_"
        $errorCount++
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Upload Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Uploaded: $uploadCount files" -ForegroundColor Green
Write-Host "  Failed:   $errorCount files" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "Download URL:" -ForegroundColor Green
    Write-Host "  $WEB_URL"
    Write-Host ""
    Write-Host "[OK] Deployment completed successfully!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Some files failed to upload" -ForegroundColor Red
}

exit $(if ($errorCount -gt 0) { 1 } else { 0 })
