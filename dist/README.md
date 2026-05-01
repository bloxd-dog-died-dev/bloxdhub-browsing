# BloxdHub Distribution Package

This folder contains the standalone BloxdHub Browser application ready for distribution and deployment.

## Contents

- **BloxdHub.exe** - Standalone Windows executable (fully self-contained)
- **index.html** - Web interface
- **browser.js** - Application logic and search integration
- **style.css** - UI styling (Bing-inspired design)

## Quick Start

### For End Users

Simply run `BloxdHub.exe` - no installation required!

**Requirements:**
- Windows 10 or later
- That's it! (All dependencies are bundled)

### For Developers

To modify or rebuild:
1. Edit `index.html`, `browser.js`, or `style.css`
2. Replace these files in this dist folder
3. Rebuild the C# app: `cd ../CSharpApp && .\build.ps1`
4. Copy output to dist folder

## Features

✓ Multi-tab browsing with back/forward navigation
✓ Address bar with search integration
✓ Search results powered by DuckDuckGo, Google, Bing
✓ Localhost support (localhost:8000, 127.0.0.1:3000, etc.)
✓ Built-in DevTools (Press F12)
✓ Bing-inspired modern UI
✓ Quick links and bookmarks
✓ Easter eggs and keyboard shortcuts

## Usage Examples

1. **Search**: Type a query and hit Enter
2. **Visit website**: Type `google.com` or `localhost:8000`
3. **Localhost development**: Type `localhost:3000` to test your app
4. **Multiple tabs**: Click "+" to open new tabs

## Deployment

### Option 1: Direct Download
Simply distribute `BloxdHub.exe` to users. It works standalone.

### Option 2: FTP Upload
```powershell
.\deploy-ftp.ps1 -FtpHost ftp.example.com -FtpUser username -FtpPassword password
```

Then users can download from: `ftp://ftp.example.com/BloxdHub.exe`

### Option 3: Web Hosting
Upload to a web server and provide download link:
```
https://example.com/downloads/BloxdHub.exe
```

## Support

- **Issues**: Check localhost:8000 first to verify it's working
- **DevTools**: Press F12 to open built-in console
- **Log Files**: Check `%APPDATA%\BloxdHub\` for app data

## License

See LICENSE file in root directory.
