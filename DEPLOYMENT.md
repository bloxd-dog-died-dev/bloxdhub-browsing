# BloxdHub Deployment Guide

## Overview

This guide covers deploying BloxdHub to your SFTP server and making it available for download to users.

## Prerequisites

- Windows machine with PowerShell 5.0+
- SFTP server access (host, username, password, port)
- PuTTY PSCP installed (for SFTP uploads) or WinSCP/FileZilla
- BloxdHub distribution package built locally

## Quick Start (3 Steps)

### Step 1: Setup Credentials

```powershell
.\credentials.ps1 -Action setup
```

This will:
- Prompt you for SFTP credentials
- Create a `.env` file with secure configuration
- Set restricted file permissions (Windows only)

### Step 2: Validate Credentials

```powershell
.\credentials.ps1 -Action validate
```

Checks that all required credentials are present.

### Step 3: Deploy

```powershell
.\deploy-sftp.ps1
```

This will:
- Read credentials from `.env`
- Upload dist/ files to your SFTP server
- Show progress and upload summary

## Detailed Setup

### 1. Generate Secure Password

For your SFTP account, use a strong password with mixed characters:

```powershell
# Using PowerShell to generate a password
$password = -join (1..24 | ForEach-Object { [char](Get-Random -Input (33..126)) })
Write-Host $password
```

Or use a password manager to generate one.

### 2. Configure .env File

Run the credentials manager:

```powershell
.\credentials.ps1 -Action setup
```

You'll be prompted for:
- **SFTP Host**: Your server hostname (e.g., bloxdhub-brower.cfd)
- **SFTP Username**: Your account (e.g., elijah@bloxdhub-brower.cfd)
- **SFTP Password**: Your account password
- **SFTP Remote Path**: Where to upload files (e.g., /home/elijah/public_html/bloxdhub/)
- **Web URL**: Where users download from (e.g., https://bloxdhub-brower.cfd/downloads/BloxdHub.exe)

**Important**: The `.env` file contains sensitive credentials. Never commit it to Git!

### 3. Test SFTP Connection

Before deploying, test your credentials:

```powershell
.\credentials.ps1 -Action validate
.\deploy-sftp.ps1 -DryRun
```

The `-DryRun` flag shows what would be uploaded without actually uploading.

### 4. Deploy Files

```powershell
# Deploy dist/ folder
.\deploy-sftp.ps1

# Or deploy ZIP file
.\deploy-sftp.ps1 -UploadZip

# Deploy both
.\deploy-sftp.ps1 -UploadDist -UploadZip
```

## Deployment Script Options

### deploy-sftp.ps1 Parameters

```powershell
.\deploy-sftp.ps1 `
    -EnvFile ".env" `
    -DryRun $false `
    -Verbose $false `
    -BackupFirst $true `
    -UploadDist $true `
    -UploadZip $false
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `-EnvFile` | string | `.env` | Location of credentials file |
| `-DryRun` | switch | false | Show what would be uploaded without uploading |
| `-Verbose` | switch | false | Show detailed operation logs |
| `-BackupFirst` | switch | true | Create backup before uploading |
| `-UploadDist` | switch | true | Upload contents of dist/ folder |
| `-UploadZip` | switch | false | Upload BloxdHub-latest.zip file |

### Credentials Manager Commands

```powershell
# Setup credentials interactively
.\credentials.ps1 -Action setup

# View current configuration (with masked passwords)
.\credentials.ps1 -Action show

# Validate all required credentials are present
.\credentials.ps1 -Action validate

# Clear credentials file
.\credentials.ps1 -Action clear
```

## Directory Structure

Your remote server should have this structure:

```
/home/elijah/
├── public_html/
│   ├── bloxdhub/
│   │   ├── BloxdHub.exe
│   │   ├── index.html
│   │   ├── browser.js
│   │   ├── style.css
│   │   ├── README.md
│   │   └── CHANGELOG.md
│   └── downloads/  (optional, symlink to bloxdhub/)
└── backups/
    └── bloxdhub/
        └── backup-2024-01-15.tar.gz
```

## Verifying Deployment

After deployment:

1. **SSH into your server**:
   ```bash
   ssh elijah@bloxdhub-brower.cfd
   ```

2. **Check files were uploaded**:
   ```bash
   ls -lah /home/elijah/public_html/bloxdhub/
   ```

3. **Verify file integrity**:
   ```bash
   # Check file sizes match local copies
   du -sh /home/elijah/public_html/bloxdhub/BloxdHub.exe
   ```

4. **Create download link** (optional):
   ```bash
   cd /home/elijah/public_html
   ln -s bloxdhub downloads  # Create symlink
   ```

## Troubleshooting

### "PuTTY PSCP not found"

Install PuTTY from: https://www.chiark.greenend.org.uk/~sgtatham/putty/

Or use alternative SFTP clients:
- **WinSCP**: https://winscp.net/
- **FileZilla**: https://filezilla-project.org/
- **VS Code SFTP Extension**: https://marketplace.visualstudio.com/items?itemName=liximomo.sftp

### "Connection refused"

1. Verify SFTP host and port are correct
2. Check credentials are correct
3. Verify server firewall allows port 22 (SSH/SFTP)
4. Confirm SFTP server is running

### "Permission denied"

1. Ensure remote directory exists: `/home/elijah/public_html/bloxdhub/`
2. Check permissions: `chmod 755 /home/elijah/public_html/bloxdhub/`
3. Verify SFTP user can write to directory

### "Timeout during upload"

1. Try uploading smaller files first
2. Check internet connection stability
3. Reduce network traffic
4. Increase timeout in script (modify deploy-sftp.ps1)

## Security Best Practices

1. **Never commit `.env` to Git**: Add to `.gitignore`
   ```
   .env
   .env.local
   .env.*.local
   *.env
   credentials.ps1
   ```

2. **Use strong passwords**: Mix uppercase, lowercase, numbers, symbols

3. **Rotate credentials periodically**: Update password every 90 days

4. **Use SSH keys when possible**: More secure than passwords
   ```powershell
   # SSH key setup in credentials.ps1
   USE_SSH_KEY=true
   SSH_KEY_PATH=~/.ssh/bloxdhub_rsa
   ```

5. **Restrict file permissions**: Windows NTFS permissions restrict `.env` to owner only

6. **Backup credentials securely**: Store backup in encrypted location

## Automated Deployment

### Daily Backup Script

```powershell
# backup-daily.ps1
$backupDir = ".\backups\$(Get-Date -Format 'yyyy-MM-dd')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item ".\dist\*" $backupDir -Recurse -Force
Write-Host "Backup created in $backupDir"
```

### Scheduled Deployment

Create Windows Scheduled Task:

```powershell
# Create scheduled task for weekly deployment
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-File C:\path\to\deploy-sftp.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 02:00AM
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "BloxdHub-Deploy" -Description "Weekly BloxdHub deployment"
```

## Environment Variables

The `.env` file supports these variables:

```
# SFTP Configuration
SFTP_HOST=bloxdhub-brower.cfd
SFTP_PORT=22
SFTP_USERNAME=elijah@bloxdhub-brower.cfd
SFTP_PASSWORD=your_password
SFTP_REMOTE_PATH=/home/elijah/public_html/bloxdhub/

# Web Configuration
WEB_URL=https://bloxdhub-brower.cfd/downloads/BloxdHub.exe
WEB_ROOT=/home/elijah/public_html/

# Deployment Options
DEPLOY_METHOD=sftp
CREATE_BACKUP=true
BACKUP_DIR=/home/elijah/backups/bloxdhub/
ENABLE_VERSION_TRACKING=true

# SSH Key Authentication (alternative to password)
USE_SSH_KEY=false
SSH_KEY_PATH=~/.ssh/bloxdhub_rsa
SSH_KEY_PASSPHRASE=

# Notifications
NOTIFY_EMAIL=elijah@example.com
SLACK_WEBHOOK=
DISCORD_WEBHOOK=
```

## Distribution Methods

### Direct Executable Share
Users just need `BloxdHub.exe` from the `dist` folder:
```bash
# Copy to users:
dist/BloxdHub.exe
```

Users can run it directly - no installation required!

### Web Download
Host files on your server:
```
https://bloxdhub-brower.cfd/downloads/BloxdHub.exe
https://bloxdhub-brower.cfd/downloads/BloxdHub-latest.zip
```

### GitHub Releases
```bash
# Create a Release on GitHub
# Attach BloxdHub-latest.zip as asset
# Users download from: github.com/yourrepo/releases
```

## Installation for End Users

### Option 1: Direct Executable
```
1. Download BloxdHub.exe
2. Double-click to run
3. Done!
```

### Option 2: From ZIP
```
1. Download BloxdHub-latest.zip
2. Extract all files to a folder
3. Run BloxdHub.exe
```

### Option 3: From URL
```
1. Visit: https://bloxdhub-brower.cfd/downloads/
2. Click "Download BloxdHub"
3. Run the downloaded executable
```

## Next Steps

1. **Run credentials setup**: `.\credentials.ps1 -Action setup`
2. **Test connection**: `.\deploy-sftp.ps1 -DryRun`
3. **Deploy files**: `.\deploy-sftp.ps1`
4. **Verify on server**: SSH in and check `/home/elijah/public_html/bloxdhub/`
5. **Share download link** with users

## Support

For issues or questions:
- Check deployment logs in deployment output
- Verify SFTP credentials with server administrator
- Test SFTP connection manually using FileZilla or WinSCP
- Review PowerShell script output for error details

---

**Last Updated**: $(Get-Date -Format 'yyyy-MM-dd')  
**Version**: 2.0 (SFTP with credentials management)
