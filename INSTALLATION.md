# Installation & Deployment Guide for BloxdHub Browser

## For End Users

### Option 1: Portable Executable (Recommended)

1. Navigate to the release page and download `BloxdHub.exe`
2. Double-click to run (no installation needed)
3. The application will start with the browser interface

**Note:** First launch may take a moment to initialize WebView2.

### Option 2: Install from Source

#### Prerequisites
- Windows 10 or later
- .NET 6.0 Runtime or SDK ([Download](https://dotnet.microsoft.com/download))
- WebView2 Runtime ([Download](https://developer.microsoft.com/en-us/microsoft-edge/webview2/))

#### Build Steps

1. Clone or download the repository
2. Open PowerShell in the `CSharpApp` directory
3. Run the build script:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   .\build.ps1
   ```
4. Launch from `.\standalone\BloxdHub.exe`

### Option 3: Installation Package (MSI)

Coming soon - an official Windows installer will be available.

---

## For Developers

### Building for Distribution

To create a fully self-contained executable:

```powershell
cd CSharpApp
dotnet publish -c Release -r win-x64 --self-contained -o .\dist
```

This creates a folder with all dependencies included (larger file size, but no runtime needed).

### Building a Minimal Executable

For a smaller executable that requires .NET Runtime:

```powershell
dotnet publish -c Release -r win-x64 -o .\dist
```

### Creating an Installer (Advanced)

Use WiX Toolset to create an MSI installer:

1. Install WiX: https://wixtoolset.org/
2. Create a WiX project referencing the published files
3. Build to generate `.msi`

---

## File Structure

```
BloxdHub/
├── index.html          # Main HTML interface
├── browser.js          # JavaScript engine
├── style.css           # Styling (Bing-inspired)
├── package.json        # Node dependencies (npm run dev)
└── CSharpApp/          # Windows Forms wrapper
    ├── BloxdHubBrowser.csproj
    ├── BrowserForm.cs
    ├── Program.cs
    ├── build.ps1       # Automated build script
    └── README.md       # Detailed build instructions
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| WebView2 not found | Install from https://developer.microsoft.com/en-us/microsoft-edge/webview2/ |
| .NET Runtime error | Install .NET 6.0+ from https://dotnet.microsoft.com/download |
| Build script error | Run: `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process` |
| HTML files not loading | Ensure `index.html`, `browser.js`, `style.css` are in same folder as exe |

---

## Features

✓ Multi-tab browsing  
✓ Address bar with localhost support  
✓ Search integration (DuckDuckGo, Google, Bing)  
✓ Built-in DevTools (Press F12)  
✓ Bing-inspired UI  
✓ Quick links and shortcuts  
✓ Easter eggs and Konami codes  

---

## Support

For issues, questions, or suggestions, open an issue on GitHub.
