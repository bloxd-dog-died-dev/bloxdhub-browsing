# BloxdHub Browser

A web-based browser application styled like Google Chrome / Microsoft Edge.

![BloxdHub Browser – New Tab Page](https://github.com/user-attachments/assets/bae3c811-2ca4-44db-b929-c362cb711293)

## Features

- **Tab management** — open multiple tabs, close individual tabs, keyboard shortcuts (Ctrl+T / Ctrl+W)
- **Navigation bar** — Back, Forward, Reload, Home buttons and an address bar
- **Smart address bar** — automatically detects whether you're typing a URL or a search query
- **Actual search results** — searches use the DuckDuckGo Instant Answers API to show real results, plus direct links to Google, Bing and DuckDuckGo
- **Quick links** — new-tab page shows shortcuts to Google, YouTube, Wikipedia, Reddit, GitHub and Twitch
- **Iframe navigation** — URLs load inside the browser; sites that block embedding show a friendly fallback with an "Open in new tab" button
- **Keyboard shortcuts** — `Ctrl+T` new tab, `Ctrl+W` close tab, `Ctrl+R` reload, `Ctrl+L` focus address bar

## Usage

Open `index.html` in any modern web browser — no build step or server required.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Browser UI structure |
| `style.css` | Dark Chrome/Edge-like theme |
| `browser.js` | All browser logic |
