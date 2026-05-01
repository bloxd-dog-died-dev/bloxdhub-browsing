# BloxdHub FTP Deployment Script
# This script uploads the distribution files to an FTP server

param(
    [Parameter(Mandatory = $true)]
    [string]$FtpHost,
    
    [Parameter(Mandatory = $true)]
    [string]$FtpUser,
    
    [Parameter(Mandatory = $true)]
    [string]$FtpPassword,
    
    [string]$FtpPath = "/",
    
    [switch]$SkipBackup = $false
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "BloxdHub FTP Deployment Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$distDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$distDir = Join-Path $distDir "dist"
$ftpUri = "ftp://$FtpHost$FtpPath"

Write-Host "FTP Host: $FtpHost" -ForegroundColor Yellow
Write-Host "FTP Path: $FtpPath" -ForegroundColor Yellow
Write-Host "Local Dir: $distDir" -ForegroundColor Yellow
Write-Host ""

# Check if dist folder exists
if (-not (Test-Path $distDir)) {
    Write-Host "ERROR: dist folder not found at $distDir" -ForegroundColor Red
    Write-Host "Run build script first to create dist folder" -ForegroundColor Red
    exit 1
}

# Get files to upload
$files = @(
    "BloxdHub.exe",
    "index.html",
    "browser.js",
    "style.css"
)

Write-Host "Files to upload:" -ForegroundColor Cyan
$files | ForEach-Object { Write-Host "  • $_" }
Write-Host ""

# Create FTP credentials
$secPassword = ConvertTo-SecureString $FtpPassword -AsPlainText -Force
$ftpCredentials = New-Object System.Management.Automation.PSCredential($FtpUser, $secPassword)

# Upload each file
$uploadCount = 0
$errorCount = 0

foreach ($file in $files) {
    $localFile = Join-Path $distDir $file
    
    if (-not (Test-Path $localFile)) {
        Write-Host "⚠ Skipping $file (not found)" -ForegroundColor Yellow
        continue
    }
    
    $ftpFile = "$ftpUri$file"
    
    try {
        Write-Host "Uploading $file..." -ForegroundColor Cyan
        
        $request = [System.Net.FtpWebRequest]::Create($ftpFile)
        $request.Credentials = $ftpCredentials
        $request.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
        $request.UseBinary = $true
        $request.KeepAlive = $false
        
        $fileStream = [System.IO.File]::OpenRead($localFile)
        $uploadStream = $request.GetRequestStream()
        $fileStream.CopyTo($uploadStream)
        $uploadStream.Close()
        $fileStream.Close()
        
        $response = $request.GetResponse()
        $response.Close()
        
        Write-Host "✓ $file uploaded successfully" -ForegroundColor Green
        $uploadCount++
    }
    catch {
        Write-Host "✗ Failed to upload $file : $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Upload Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "Uploaded: $uploadCount files" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Errors: $errorCount files" -ForegroundColor Red
}
Write-Host ""
Write-Host "FTP URL: $ftpUri" -ForegroundColor Yellow
Write-Host "Users can download: $ftpUri/BloxdHub.exe" -ForegroundColor Yellow
