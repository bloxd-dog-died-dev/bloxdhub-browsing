# BloxdHub SFTP Deployment Script
# Deploys BloxdHub to a remote SFTP server

param(
    [Parameter(Mandatory = $false)]
    [string]$EnvFile = ".env",
    
    [string]$SftpHost,
    [string]$SftpPort = "22",
    [string]$SftpUsername,
    [string]$SftpPassword,
    [string]$SftpPath = "/home/elijah/public_html/bloxdhub/",
    
    [switch]$DryRun = $false,
    [switch]$Verbose = $false,
    [switch]$BackupFirst = $true,
    [switch]$UploadDist = $true,
    [switch]$UploadZip = $false
)

function Write-Status {
    param([string]$Message, [string]$Status = "Info")
    $colors = @{
        "Success" = "Green"
        "Error"   = "Red"
        "Warning" = "Yellow"
        "Info"    = "Cyan"
        "Verbose" = "Gray"
    }
    $color = $colors[$Status] ?? "White"
    Write-Host "[$Status] $Message" -ForegroundColor $color
}

Write-Host ""
Write-Host "╔════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BloxdHub SFTP Deployment Script   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load .env file if it exists
if (Test-Path $EnvFile) {
    Write-Status "Loading environment from $EnvFile" "Info"
    $envContent = Get-Content $EnvFile | Where-Object { $_ -notmatch '^\s*#' -and $_ -notmatch '^\s*$' }
    
    foreach ($line in $envContent) {
        $parts = $line -split '=', 2
        if ($parts.Length -eq 2) {
            $varName = $parts[0].Trim()
            $varValue = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($varName, $varValue, "Process")
        }
    }
}

# Override with command-line parameters if provided
if ($SftpHost) { $SftpHost = $SftpHost } else { $SftpHost = $env:SFTP_HOST }
if ($SftpUsername) { $SftpUsername = $SftpUsername } else { $SftpUsername = $env:SFTP_USERNAME }
if ($SftpPassword) { $SftpPassword = $SftpPassword } else { $SftpPassword = $env:SFTP_PASSWORD }
if ($SftpPath -eq "/home/elijah/public_html/bloxdhub/") { $SftpPath = $env:SFTP_REMOTE_PATH ?? $SftpPath }

# Validate required parameters
if (-not $SftpHost -or -not $SftpUsername -or -not $SftpPassword) {
    Write-Status "Missing SFTP credentials. Provide via:" "Error"
    Write-Host "  1. .env file"
    Write-Host "  2. Command-line parameters"
    Write-Host "  3. Environment variables"
    exit 1
}

Write-Host ""
Write-Status "Configuration" "Info"
Write-Host "  Host:     $SftpHost"
Write-Host "  Username: $SftpUsername"
Write-Host "  Port:     $SftpPort"
Write-Host "  Path:     $SftpPath"
Write-Host "  Dry Run:  $DryRun"
Write-Host ""

# Determine files to upload
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $scriptDir "dist"
$zipFile = Join-Path $scriptDir "BloxdHub-latest.zip"

$filesToUpload = @()
if ($UploadDist) {
    if (Test-Path $distDir) {
        $distFiles = Get-ChildItem $distDir -File | Select-Object -ExpandProperty FullName
        $filesToUpload += $distFiles
    } else {
        Write-Status "dist folder not found!" "Warning"
    }
}

if ($UploadZip) {
    if (Test-Path $zipFile) {
        $filesToUpload += $zipFile
    } else {
        Write-Status "ZIP file not found!" "Warning"
    }
}

if ($filesToUpload.Count -eq 0) {
    Write-Status "No files to upload" "Warning"
    exit 1
}

Write-Host ""
Write-Status "Files to upload: $($filesToUpload.Count)" "Info"
$filesToUpload | ForEach-Object {
    $file = Split-Path -Leaf $_
    $size = (Get-Item $_).Length / 1KB
    Write-Host "  • $file ($([math]::Round($size, 2)) KB)"
}
Write-Host ""

if ($DryRun) {
    Write-Status "DRY RUN - No files will actually be uploaded" "Warning"
    Write-Host ""
    exit 0
}

# Use PuTTY's pscp for SFTP upload (if available)
$pscpPath = "C:\Program Files\PuTTY\pscp.exe"
if (Test-Path $pscpPath) {
    Write-Status "Using PuTTY PSCP for SFTP" "Verbose"
    
    $uploadCount = 0
    $errorCount = 0
    
    foreach ($file in $filesToUpload) {
        $fileName = Split-Path -Leaf $file
        
        try {
            Write-Host "Uploading $fileName..." -NoNewline
            
            # Create batch file for PSCP (to handle password)
            $batchFile = Join-Path $env:TEMP "sftp_batch_$([System.Guid]::NewGuid()).txt"
            "open $SftpUsername@$SftpHost" | Out-File $batchFile -Encoding ASCII
            "" | Out-File $batchFile -Append -Encoding ASCII
            
            # Use pscp with private key or password
            & $pscpPath -P $SftpPort -l $SftpUsername -pw $SftpPassword "$file" "${SftpUsername}@${SftpHost}:${SftpPath}" 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ✓" -ForegroundColor Green
                $uploadCount++
            } else {
                Write-Host " ✗" -ForegroundColor Red
                $errorCount++
            }
            
            Remove-Item $batchFile -Force -ErrorAction SilentlyContinue
        }
        catch {
            Write-Status "Error uploading $fileName : $_" "Error"
            $errorCount++
        }
    }
    
    Write-Host ""
    Write-Host "╔════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║         Upload Summary             ║" -ForegroundColor Green
    Write-Host "╚════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Uploaded:  $uploadCount files" -ForegroundColor Green
    Write-Host "  Failed:    $errorCount files" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
    Write-Host ""
    Write-Host "Access your files at: $env:WEB_URL" -ForegroundColor Yellow
    Write-Host ""
    
    if ($errorCount -gt 0) { exit 1 }
} else {
    Write-Status "PuTTY PSCP not found. Installing..." "Warning"
    Write-Host "  Download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/"
    Write-Host ""
    Write-Status "Alternative: Use WinSCP or FileZilla for SFTP uploads" "Info"
    exit 1
}

Write-Status "Deployment completed!" "Success"
exit 0
