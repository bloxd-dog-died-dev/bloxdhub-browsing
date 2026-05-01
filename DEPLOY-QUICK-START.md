# BloxdHub Deployment Quick Reference

## Files Created for You

✅ `.env.example` - Template for environment variables  
✅ `deploy-sftp.ps1` - SFTP deployment script  
✅ `credentials.ps1` - Credentials management tool  
✅ `DEPLOYMENT.md` - Complete deployment guide  
✅ `.gitignore` - Updated to protect credentials  

## Getting Started: 5 Steps

### Step 1: Open PowerShell
```powershell
# Navigate to project directory
cd c:\Users\eliks\bloxdhub-browsing
```

### Step 2: Setup Credentials
```powershell
.\credentials.ps1 -Action setup
```

You'll be prompted to enter:
- SFTP Host: `bloxdhub-brower.cfd`
- SFTP Username: `elijah@bloxdhub-brower.cfd`
- SFTP Password: *(your secure password)*
- Remote Path: `/home/elijah/public_html/bloxdhub/`
- Web URL: `https://bloxdhub-brower.cfd/downloads/BloxdHub.exe`

### Step 3: Validate Setup
```powershell
.\credentials.ps1 -Action validate
```

Should see all green checkmarks:
```
✓ SFTP_HOST
✓ SFTP_USERNAME
✓ SFTP_PASSWORD
✓ SFTP_REMOTE_PATH
✓ All required credentials are present
```

### Step 4: Test Deployment (Dry Run)
```powershell
.\deploy-sftp.ps1 -DryRun
```

This shows what WOULD be uploaded without actually uploading.

### Step 5: Deploy
```powershell
.\deploy-sftp.ps1
```

Wait for completion message:
```
✓ Deployment completed!
```

## What Gets Deployed

Files in `dist/` are uploaded to your server:
- `BloxdHub.exe` - Standalone Windows app
- `index.html` - Web interface
- `browser.js` - JavaScript engine
- `style.css` - Styling
- `README.md` - Documentation

## After Deployment

### Verify Files on Server
```bash
ssh elijah@bloxdhub-brower.cfd
ls -lah /home/elijah/public_html/bloxdhub/
```

### Create Download Link
```bash
# Optional: create downloads folder symlink
cd /home/elijah/public_html
ln -s bloxdhub downloads
```

### Share with Users
Users can download from:
```
https://bloxdhub-brower.cfd/downloads/BloxdHub.exe
```

## Common Commands

```powershell
# View current credentials (passwords masked)
.\credentials.ps1 -Action show

# Test before uploading
.\deploy-sftp.ps1 -DryRun

# Verbose output during upload
.\deploy-sftp.ps1 -Verbose

# Upload just the ZIP file
.\deploy-sftp.ps1 -UploadZip

# Clear credentials
.\credentials.ps1 -Action clear
```

## Important Notes

⚠️ **SECURITY**
- `.env` file contains passwords - NEVER commit to Git
- Already protected by .gitignore
- Store backup copies securely
- Rotate passwords every 90 days

📝 **CREDENTIALS FILE LOCATION**
```
.env  ← Created in project root (not committed)
```

🔒 **FILE PERMISSIONS**
- Automatically set to owner-only (Windows NTFS)
- Cannot be read by other users on same machine

## Troubleshooting

### "Connection refused"
- Check SFTP host is correct
- Verify port 22 is open on server
- Confirm credentials are correct

### "Permission denied"
- Verify remote directory exists
- Check server directory permissions
- Confirm SFTP user can write to directory

### "PuTTY PSCP not found"
- Install from: https://www.chiark.greenend.org.uk/~sgtatham/putty/
- Or use WinSCP: https://winscp.net/

### Upload Timeout
- Check internet connection
- Try smaller files first
- Reduce other network usage

## Next Steps

1. ✅ Run `.\credentials.ps1 -Action setup`
2. ✅ Run `.\credentials.ps1 -Action validate`
3. ✅ Run `.\deploy-sftp.ps1 -DryRun`
4. ✅ Run `.\deploy-sftp.ps1`
5. ✅ Verify on server with SSH
6. ✅ Share download URL with users

## Files You'll Need

| File | Purpose |
|------|---------|
| `dist/BloxdHub.exe` | Standalone application |
| `dist/index.html` | Web interface |
| `dist/browser.js` | JavaScript engine |
| `dist/style.css` | UI styling |
| `.env` | Your credentials (created during setup) |
| `deploy-sftp.ps1` | Deployment script |
| `credentials.ps1` | Credential manager |

## Deployment Checklist

- [ ] Created `.env` file with credentials
- [ ] Validated credentials with `validate` command
- [ ] Tested with `-DryRun` flag
- [ ] Successfully deployed with `deploy-sftp.ps1`
- [ ] SSH'd into server to verify files
- [ ] Shared download URL with users

---

**Ready to deploy? Start with Step 2 above!**
