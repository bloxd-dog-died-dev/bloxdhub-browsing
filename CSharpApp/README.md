# BloxdHub Windows App

This is a Windows Forms desktop application wrapper for BloxdHub Browser.

## Requirements

- .NET 6.0 SDK or later
- Visual Studio 2022 (or Visual Studio Code with C# extension)
- WebView2 Runtime (will be installed automatically on most Windows systems)

## Build Instructions

### Option 1: Using Visual Studio

1. Open `BloxdHubBrowser.csproj` in Visual Studio
2. Select **Build** → **Build Solution** (Ctrl+Shift+B)
3. Select **Build** → **Publish** for a standalone executable

### Option 2: Using Command Line (PowerShell/CMD)

```powershell
cd c:\Users\eliks\bloxdhub-browsing\CSharpApp
dotnet build -c Release
dotnet publish -c Release -o .\publish
```

### Option 3: Create Self-Contained Executable

```powershell
dotnet publish -c Release -r win-x64 --self-contained -o .\standalone
```

## Installation

### As Executable
Simply run the built `.exe` file from the publish folder.

### As Installer (Optional)
For creating an installer (.msi):
1. Install WiX Toolset: https://wixtoolset.org/
2. Create a WiX project referencing the published files
3. Build to generate an `.msi` installer

## Running

Double-click `BloxdHub.exe` to launch the application.

The app will:
- Look for `index.html`, `browser.js`, and `style.css` in the same directory
- Fall back to `http://localhost:8000` if files aren't found (requires npm dev server running)
- Store data in `C:\Users\{YourUsername}\AppData\Roaming\BloxdHub\`

## Features

- Full browser simulation with tabs
- Search integration (DuckDuckGo, Google, Bing)
- Built-in DevTools (F12)
- Localhost support (`localhost:8000`, etc.)
- Quick links and shortcuts
- Cross-site fallback to search results

## Troubleshooting

- **WebView2 not found**: Install from https://developer.microsoft.com/en-us/microsoft-edge/webview2/
- **Files not loading**: Ensure `index.html`, `browser.js`, and `style.css` are in the same directory as the executable
- **Localhost not loading**: Ensure dev server is running: `npm run dev`

## Development

To modify the browser:
1. Edit `index.html`, `browser.js`, and `style.css` in the root directory
2. Rebuild the C# app to include updated files
3. Run the new executable

## Creating an Installer

For a professional installer experience:

```powershell
# Install MSIX Packaging Tools (Optional)
# Then use the automated installer creation from Visual Studio
# Project → Create App Packages → ...
```
