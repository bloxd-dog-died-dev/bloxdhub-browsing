# Advanced BloxdHub FTP Deployment Script
# Supports multiple upload methods and configurations

param(
    [Parameter(Mandatory = $true, ParameterSetName = "FtpCreds")]
    [string]$FtpHost,
    
    [Parameter(ParameterSetName = "FtpCreds")]
    [string]$FtpUser = "anonymous",
    
    [Parameter(ParameterSetName = "FtpCreds")]
    [string]$FtpPassword = "anonymous@example.com",
    
    [Parameter(ParameterSetName = "FtpConfig")]
    [string]$ConfigFile,
    
    [string]$FtpPath = "/",
    
    [string]$Port = "21",
    
    [switch]$UploadZip = $false,
    
    [switch]$CreateBackup = $false,
    
    [string]$BackupPath = "/backups/",
    
    [switch]$Verbose = $false,
    
    [switch]$DryRun = $false
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
Write-Host "║  BloxdHub Advanced FTP Deployment  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Load config if provided
if ($ConfigFile) {
    if (-not (Test-Path $ConfigFile)) {
        Write-Status "Config file not found: $ConfigFile" "Error"
        exit 1
    }
    . $ConfigFile
    $FtpHost = $env:FTP_HOST
    $FtpUser = $env:FTP_USER
    $FtpPassword = $env:FTP_PASSWORD
    $FtpPath = $env:FTP_PATH
}

if (-not $FtpHost) {
    Write-Status "FtpHost is required" "Error"
    exit 1
}

# Determine source files
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $scriptDir "dist"
$zipFile = Join-Path $scriptDir "BloxdHub-latest.zip"

if ($UploadZip) {
    if (-not (Test-Path $zipFile)) {
        Write-Status "ZIP file not found. Creating..." "Warning"
        Compress-Archive -Path "$distDir\*" -DestinationPath $zipFile -Force
    }
    $filesToUpload = @($zipFile)
    Write-Status "Will upload ZIP package" "Info"
} else {
    $filesToUpload = @(
        "BloxdHub.exe",
        "index.html",
        "browser.js",
        "style.css",
        "README.md"
    )
}

Write-Host ""
Write-Status "Configuration:" "Info"
Write-Host "  Host:      $FtpHost"
Write-Host "  User:      $FtpUser"
Write-Host "  Port:      $Port"
Write-Host "  Path:      $FtpPath"
Write-Host "  Dry Run:   $DryRun"

if ($Verbose) {
    Write-Status "Verbose mode enabled" "Verbose"
}

Write-Host ""

# Create FTP credentials
$secPassword = ConvertTo-SecureString $FtpPassword -AsPlainText -Force
$ftpCreds = New-Object System.Management.Automation.PSCredential($FtpUser, $secPassword)

# Build FTP URI
$ftpUri = "ftp://$FtpHost`:$Port$FtpPath"

# Upload statistics
$stats = @{
    Total    = 0
    Success  = 0
    Failed   = 0
    Skipped  = 0
    Duration = 0
}

$startTime = Get-Date

# Upload files
Write-Status "Starting upload..." "Info"
Write-Host ""

foreach ($file in $filesToUpload) {
    $localPath = if ($UploadZip) { $file } else { Join-Path $distDir $file }
    
    if (-not (Test-Path $localPath)) {
        Write-Status "Skipping $file (not found)" "Warning"
        $stats.Skipped++
        continue
    }
    
    $stats.Total++
    $fileName = Split-Path -Leaf $localPath
    $remotePath = "$ftpUri$fileName"
    
    if ($Verbose) {
        Write-Host "  Source: $localPath"
        Write-Host "  Target: $remotePath"
    }
    
    if ($DryRun) {
        Write-Status "[$fileName] Would upload (dry run)" "Verbose"
        $stats.Success++
        continue
    }
    
    try {
        Write-Host "Uploading $fileName..." -NoNewline
        
        $request = [System.Net.FtpWebRequest]::Create($remotePath)
        $request.Credentials = $ftpCreds
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.UseBinary = $true
        $request.KeepAlive = $false
        $request.Timeout = 30000
        
        $fileStream = [System.IO.File]::OpenRead($localPath)
        $uploadStream = $request.GetRequestStream()
        $fileStream.CopyTo($uploadStream)
        $uploadStream.Close()
        $fileStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
        
        Write-Host " ✓" -ForegroundColor Green
        $stats.Success++
    }
    catch {
        Write-Host " ✗" -ForegroundColor Red
        if ($Verbose) {
            Write-Status "Error: $_" "Verbose"
        }
        $stats.Failed++
    }
}

$stats.Duration = ((Get-Date) - $startTime).TotalSeconds

Write-Host ""
Write-Host "╔════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         Upload Summary             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Total Files:   $($stats.Total)"
Write-Host "  Successful:    $($stats.Success)" -ForegroundColor Green
Write-Host "  Failed:        $($stats.Failed)" -ForegroundColor $(if ($stats.Failed -gt 0) { "Red" } else { "Green" })
Write-Host "  Skipped:       $($stats.Skipped)"
Write-Host "  Duration:      $([math]::Round($stats.Duration, 2))s"
Write-Host ""
Write-Host "Download URL: $ftpUri" -ForegroundColor Yellow
Write-Host ""

if ($stats.Failed -gt 0) {
    exit 1
} else {
    Write-Status "Deployment completed successfully!" "Success"
    exit 0
}
