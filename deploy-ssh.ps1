# BloxdHub Deployment using Windows Built-in SSH (no PuTTY needed)
# Works on Windows 10+ with OpenSSH enabled

param(
    [string]$EnvFile = ".env",
    [switch]$DryRun = $false
)

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "BloxdHub SFTP Deployment (SSH)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Load .env file
if (Test-Path $EnvFile) {
    Write-Host "[OK] Loading credentials from .env" -ForegroundColor Green
    Get-Content $EnvFile | Where-Object { $_ -notmatch '^#' -and $_ -ne "" } | ForEach-Object {
        $parts = $_ -split '=', 2
        if ($parts.Length -eq 2) {
            $varName = $parts[0].Trim()
            $varValue = $parts[1].Trim()
            New-Variable -Name $varName -Value $varValue -Force
        }
    }
} else {
    Write-Host "[ERROR] .env not found" -ForegroundColor Red
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

# Check if SSH is available
Write-Host ""
try {
    $sshTest = ssh -V 2>&1
    Write-Host "[OK] SSH available: $sshTest" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] SSH not found. Windows 10+ OpenSSH required." -ForegroundColor Red
    Write-Host "Enable OpenSSH in Settings > Apps > Optional Features" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Uploading..." -ForegroundColor Cyan

$uploadCount = 0
$errorCount = 0

foreach ($file in $distFiles) {
    $fileName = $file.Name
    Write-Host -NoNewline "  $fileName ... "
    
    try {
        # Use scp (secure copy) via SSH
        $remotePath = "${SFTP_USERNAME}@${SFTP_HOST}:${SFTP_REMOTE_PATH}$fileName"
        
        # Disable host key verification for automatic uploads
        $env:GIT_SSH_COMMAND = "ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
        
        # Use scp to copy file
        $output = scp -P $SFTP_PORT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null "$($file.FullName)" "$remotePath" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK" -ForegroundColor Green
            $uploadCount++
        } else {
            Write-Host "FAILED" -ForegroundColor Red
            if ($output) {
                Write-Host "    Error: $output"
            }
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
