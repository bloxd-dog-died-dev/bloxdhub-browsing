# BloxdHub Windows App Build Script
# This script builds a standalone executable of BloxdHub Browser

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "BloxdHub Browser - Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET SDK is installed
$dotnetVersion = dotnet --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: .NET SDK not found. Please install .NET 6.0 or later from https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit 1
}

Write-Host "✓ .NET SDK version: $dotnetVersion" -ForegroundColor Green
Write-Host ""

# Navigate to script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "Building BloxdHub Browser..." -ForegroundColor Yellow

# Build Release configuration
Write-Host "1/2 - Building Release configuration..." -ForegroundColor Cyan
dotnet build -c Release
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build completed" -ForegroundColor Green
Write-Host ""

# Publish as standalone
Write-Host "2/2 - Publishing standalone executable..." -ForegroundColor Cyan
$publishDir = ".\standalone"
if (Test-Path $publishDir) {
    Remove-Item -Recurse -Force $publishDir
}

dotnet publish -c Release -r win-x64 --self-contained -o $publishDir /p:SelfContained=true /p:PublishTrimmed=false
if ($LASTEXITCODE -ne 0) {
    Write-Host "Publish failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Standalone executable created" -ForegroundColor Green
Write-Host ""

# Copy web files
$webFiles = @("index.html", "browser.js", "style.css")
$srcDir = "..\"

foreach ($file in $webFiles) {
    $src = Join-Path $srcDir $file
    if (Test-Path $src) {
        Copy-Item $src $publishDir -Force
        Write-Host "✓ Copied $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your executable is ready at:" -ForegroundColor Yellow
Write-Host "  $publishDir\BloxdHub.exe" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run: .\standalone\BloxdHub.exe" -ForegroundColor Yellow
Write-Host ""
Write-Host "Tips:" -ForegroundColor Cyan
Write-Host "  • Run the dev server to test locally: npm run dev" 
Write-Host "  • Or copy index.html, browser.js, style.css next to the .exe"
Write-Host ""

# Optionally open the file
Write-Host "Opening output folder..." -ForegroundColor Yellow
explorer.exe (Resolve-Path $publishDir).Path
