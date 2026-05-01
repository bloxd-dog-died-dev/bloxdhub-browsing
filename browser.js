/**
 * BloxdHub Browser – browser.js
 *
 * Features
 * ─────────
 * • Multi-tab management
 * • Back / Forward / Reload / Home navigation
 * • Address bar: detects URLs vs search queries
 * • Search results page: uses DuckDuckGo Instant Answers API (JSONP, no CORS)
 *   and supplements with curated web results for common queries
 * • Iframe navigation for actual URLs (falls back to "open in new tab" if blocked)
 * • Keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+R, Ctrl+L, Enter)
 */

(() => {
  'use strict';

  /* ── Constants ──────────────────────────────────────────────────────── */
  const DDG_TIMEOUT_MS        = 8000;   // DuckDuckGo API request timeout
  const IFRAME_CHECK_DELAY_MS = 5000;   // Delay before checking for blocked iframe
  const DDG_SCRIPT_ID         = '_ddg_script';  // ID for the JSONP script element

  /* ── State ──────────────────────────────────────────────────────────── */
  let tabs = [];
  let activeTabId = null;
  let tabCounter = 0;

  /* ── DOM refs ───────────────────────────────────────────────────────── */
  const tabsContainer   = document.getElementById('tabs-container');
  const newTabBtn       = document.getElementById('new-tab-btn');
  const backBtn         = document.getElementById('back-btn');
  const forwardBtn      = document.getElementById('forward-btn');
  const reloadBtn       = document.getElementById('reload-btn');
  const homeBtn         = document.getElementById('home-btn');
  const addressBar      = document.getElementById('address-bar');
  const goBtn           = document.getElementById('go-btn');
  const lockIcon        = document.getElementById('lock-icon');
  const statusBar       = document.getElementById('status-bar');

  const newTabPage      = document.getElementById('new-tab-page');
  const resultsPage     = document.getElementById('results-page');
  const frameWrap       = document.getElementById('frame-wrap');
  const browserFrame    = document.getElementById('browser-frame');
  const frameBlocked    = document.getElementById('frame-blocked');

  const ntbSearch       = document.getElementById('ntb-search');
  const ntbSearchBtn    = document.getElementById('ntb-search-btn');
  const resultsSearch   = document.getElementById('results-search');
  const resultsSearchBtn= document.getElementById('results-search-btn');
  const resultsList     = document.getElementById('results-list');
  const resultsSidebar  = document.getElementById('results-sidebar');
  const resultsLoading  = document.getElementById('results-loading');
  const resultsError    = document.getElementById('results-error');
  const openExternalBtn = document.getElementById('open-external-btn');
  const goBackBlockedBtn= document.getElementById('go-back-blocked-btn');

  /* ── Tab model ──────────────────────────────────────────────────────── */
  function createTab(url = '') {
    const id = ++tabCounter;
    const tab = {
      id,
      url: url || '',
      title: url ? 'Loading…' : 'New Tab',
      favicon: '🌐',
      history: url ? [url] : [],
      historyIndex: url ? 0 : -1,
      view: url ? (isSearchQuery(url) ? 'results' : 'frame') : 'newtab',
    };
    tabs.push(tab);
    renderTabStrip();
    switchTab(id);
    if (url) navigate(url, false);
    return tab;
  }

  function getActiveTab() {
    return tabs.find(t => t.id === activeTabId);
  }

  function switchTab(id) {
    activeTabId = id;
    const tab = getActiveTab();
    renderTabStrip();
    applyTabState(tab);
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (tabs.length === 1) {
      // Replace with a fresh new tab instead of closing
      tabs[0] = { ...tabs[0], url: '', title: 'New Tab', favicon: '🌐',
                  history: [], historyIndex: -1, view: 'newtab' };
      activeTabId = tabs[0].id;
      applyTabState(tabs[0]);
      renderTabStrip();
      return;
    }
    tabs.splice(idx, 1);
    if (activeTabId === id) {
      const newIdx = Math.min(idx, tabs.length - 1);
      switchTab(tabs[newIdx].id);
    } else {
      renderTabStrip();
    }
  }

  /* ── Tab strip rendering ────────────────────────────────────────────── */
  function renderTabStrip() {
    while (tabsContainer.firstChild) tabsContainer.removeChild(tabsContainer.firstChild);
    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
      el.dataset.id = tab.id;

      const fav = document.createElement('span');
      fav.className = 'tab-favicon';
      fav.textContent = tab.favicon;

      const title = document.createElement('span');
      title.className = 'tab-title';
      title.textContent = tab.title;

      const close = document.createElement('button');
      close.className = 'tab-close';
      close.textContent = '×';
      close.title = 'Close tab';
      close.addEventListener('click', e => { e.stopPropagation(); closeTab(tab.id); });

      el.append(fav, title, close);
      el.addEventListener('click', () => switchTab(tab.id));
      tabsContainer.appendChild(el);
    });
  }

  /* ── Apply tab state to the UI ──────────────────────────────────────── */
  function applyTabState(tab) {
    addressBar.value = tab.url || '';
    updateNavButtons(tab);
    updateLock(tab.url);

    // Show the right panel
    if (tab.view === 'newtab') {
      showView('newtab');
    } else if (tab.view === 'results') {
      showView('results');
      const query = extractSearchQuery(tab.url);
      if (query) {
        resultsSearch.value = query;
        runSearch(query);
      }
    } else {
      showView('frame');
      frameBlocked.style.display = 'none';
      if (browserFrame.src !== tab.url) {
        safeSetFrameSrc(tab.url);
      }
    }
  }

  function showView(view) {
    newTabPage.style.display  = view === 'newtab'   ? 'flex'  : 'none';
    resultsPage.style.display = view === 'results'  ? 'flex'  : 'none';
    frameWrap.style.display   = view === 'frame'    ? 'flex'  : 'none';
  }

  /* ── Navigation ─────────────────────────────────────────────────────── */
  function navigate(input, addToHistory = true) {
    const tab = getActiveTab();
    if (!tab) return;

    const url = resolveInput(input.trim());
    tab.url = url;
    addressBar.value = url;
    updateLock(url);
    setStatus('Loading…');

    if (addToHistory) {
      // Truncate forward history
      tab.history = tab.history.slice(0, tab.historyIndex + 1);
      tab.history.push(url);
      tab.historyIndex = tab.history.length - 1;
    }

    if (isSearch(url)) {
      const query = extractSearchQuery(url);
      tab.view = 'results';
      tab.title = query + ' – BloxdHub';
      tab.favicon = '🔍';
      updateTabTitle(tab);
      showView('results');
      resultsSearch.value = query;
      runSearch(query);
    } else {
      tab.view = 'frame';
      tab.favicon = '🌐';
      tab.title = 'Loading…';
      updateTabTitle(tab);
      showView('frame');
      frameBlocked.style.display = 'none';
      safeSetFrameSrc(url);
      scheduleBlockedCheck();
    }
    updateNavButtons(tab);
    setStatus('');
  }

  function goBack() {
    const tab = getActiveTab();
    if (!tab || tab.historyIndex <= 0) return;
    tab.historyIndex--;
    navigate(tab.history[tab.historyIndex], false);
    updateNavButtons(tab);
  }

  function goForward() {
    const tab = getActiveTab();
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    tab.historyIndex++;
    navigate(tab.history[tab.historyIndex], false);
    updateNavButtons(tab);
  }

  function reload() {
    const tab = getActiveTab();
    if (!tab || !tab.url) return;
    if (tab.view === 'results') {
      const q = extractSearchQuery(tab.url);
      if (q) runSearch(q);
    } else if (tab.view === 'frame') {
      try {
        browserFrame.contentWindow.location.reload();
      } catch {
        safeSetFrameSrc(tab.url);
      }
    }
  }

  function goHome() {
    const tab = getActiveTab();
    if (!tab) return;
    tab.url = '';
    tab.view = 'newtab';
    tab.title = 'New Tab';
    tab.favicon = '🌐';
    addressBar.value = '';
    updateTabTitle(tab);
    updateNavButtons(tab);
    updateLock('');
    showView('newtab');
  }

  /* ── URL / query helpers ────────────────────────────────────────────── */
  const SEARCH_BASE = 'bloxdhub-search:';  // internal marker for searches

  function resolveInput(input) {
    if (!input) return '';
    // Already a bloxdhub-search marker (internal)
    if (input.startsWith(SEARCH_BASE)) return input;
    // Only allow http / https URL schemes – anything else is treated as a search
    if (/^https?:\/\//i.test(input)) return input;
    // Bare domain: must start and end with alphanumeric, no consecutive dots,
    // subdomains are allowed (e.g., www.example.co.uk)
    if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(\/.*)?$/i.test(input)) {
      return 'https://' + input;
    }
    // Treat as search
    return SEARCH_BASE + encodeURIComponent(input);
  }

  /**
   * Safely open a URL in a new tab — only http/https URLs are permitted.
   * Prevents javascript: or data: URLs from being opened.
   */
  function safeWindowOpen(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        window.open(parsed.href, '_blank', 'noopener,noreferrer');
      }
    } catch { /* invalid URL — do nothing */ }
  }
   * The URL is parsed and normalized via the URL constructor so that only
   * the sanitized href (not raw user input) is ever assigned to the frame src.
   * Any other scheme (javascript:, data:, etc.) falls back to about:blank.
   */
  function safeSetFrameSrc(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        browserFrame.src = parsed.href;
      } else {
        browserFrame.src = 'about:blank';
      }
    } catch {
      browserFrame.src = 'about:blank';
    }
  }

  function isSearch(url) {
    return url.startsWith(SEARCH_BASE);
  }

  function isSearchQuery(input) {
    return isSearch(resolveInput(input));
  }

  function extractSearchQuery(url) {
    if (!url) return '';
    if (url.startsWith(SEARCH_BASE)) return decodeURIComponent(url.slice(SEARCH_BASE.length));
    // Handle standard search URLs
    try {
      const u = new URL(url);
      return u.searchParams.get('q') || u.searchParams.get('query') || '';
    } catch { return ''; }
  }

  /* ── Nav button state ───────────────────────────────────────────────── */
  function updateNavButtons(tab) {
    backBtn.disabled    = !tab || tab.historyIndex <= 0;
    forwardBtn.disabled = !tab || tab.historyIndex >= tab.history.length - 1;
  }

  function updateLock(url) {
    if (!url || url.startsWith(SEARCH_BASE)) {
      lockIcon.textContent = '🔍';
      lockIcon.title = 'Search';
    } else if (/^https:/i.test(url)) {
      lockIcon.textContent = '🔒';
      lockIcon.title = 'Secure connection';
    } else {
      lockIcon.textContent = '⚠️';
      lockIcon.title = 'Not secure';
    }
  }

  function updateTabTitle(tab) {
    renderTabStrip();
    if (tab.id === activeTabId) {
      document.title = tab.title + ' – BloxdHub Browser';
    }
  }

  function setStatus(msg) {
    statusBar.textContent = msg;
  }

  /* ── Search: DuckDuckGo Instant Answers + curated results ──────────── */
  function runSearch(query) {
    if (!query.trim()) return;

    // Show loading — clear previous results safely
    while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
    while (resultsSidebar.firstChild) resultsSidebar.removeChild(resultsSidebar.firstChild);
    resultsError.style.display = 'none';
    resultsLoading.style.display = 'flex';
    resultsPage.querySelector('.results-body').style.display = 'none';

    // Update address bar
    addressBar.value = SEARCH_BASE + encodeURIComponent(query);
    updateLock('');

    fetchDDGResults(query)
      .then(data => renderResults(query, data))
      .catch(() => renderResults(query, null));
  }

  /**
   * Fetches DuckDuckGo Instant Answer API using JSONP (avoids CORS).
   * Returns a promise that resolves with the parsed JSON object.
   */
  function fetchDDGResults(query) {
    return new Promise((resolve, reject) => {
      const cbName = '_ddgcb_' + Date.now();
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('timeout'));
      }, DDG_TIMEOUT_MS);

      function cleanup() {
        clearTimeout(timeout);
        delete window[cbName];
        const s = document.getElementById(DDG_SCRIPT_ID);
        if (s) s.remove();
      }

      window[cbName] = function(data) {
        cleanup();
        resolve(data);
      };

      const script = document.createElement('script');
      script.id = DDG_SCRIPT_ID;
      const encoded = encodeURIComponent(query);
      script.src = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1&callback=${cbName}`;
      script.onerror = () => { cleanup(); reject(new Error('network error')); };
      document.head.appendChild(script);
    });
  }

  function renderResults(query, ddg) {
    resultsLoading.style.display = 'none';
    resultsPage.querySelector('.results-body').style.display = 'flex';

    resultsList.innerHTML = '';
    resultsSidebar.innerHTML = '';

    // ── Sidebar: instant answer / abstract ──────────────────────────────
    if (ddg && (ddg.Abstract || ddg.Answer)) {
      const card = document.createElement('div');
      card.className = 'sidebar-card';

      if (ddg.Heading) {
        const h = document.createElement('h3');
        h.textContent = ddg.Heading;
        card.appendChild(h);
      }
      if (ddg.Answer) {
        const p = document.createElement('p');
        p.style.cssText = 'font-size:20px;font-weight:700;color:#e8eaed;margin-bottom:6px';
        p.textContent = ddg.Answer;
        card.appendChild(p);
      }
      if (ddg.Abstract) {
        const p = document.createElement('p');
        p.textContent = ddg.Abstract;
        card.appendChild(p);
      }
      if (ddg.AbstractURL) {
        const br = document.createElement('br');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = 'Read more ›';
        a.addEventListener('click', e => { e.preventDefault(); navigate(ddg.AbstractURL); });
        card.append(br, a);
      }
      resultsSidebar.appendChild(card);
    }

    // ── Build result items ───────────────────────────────────────────────
    const items = [];

    // DuckDuckGo Results (if any)
    if (ddg && ddg.Results && ddg.Results.length) {
      ddg.Results.forEach(r => {
        items.push({ title: r.Text, url: r.FirstURL, snippet: '' });
      });
    }

    // DuckDuckGo Related Topics (skip sub-group headers)
    if (ddg && ddg.RelatedTopics && ddg.RelatedTopics.length) {
      ddg.RelatedTopics.forEach(r => {
        if (r.FirstURL && r.Text) {
          // Derive a friendly title from the URL path segment
          let title = r.Text;
          try {
            const seg = new URL(r.FirstURL).pathname.split('/').filter(Boolean).pop();
            if (seg) {
              try {
                title = decodeURIComponent(seg.replace(/_/g, ' '));
              } catch {
                title = seg.replace(/_/g, ' ');  // fall back if percent-encoding is malformed
              }
            }
          } catch { /* invalid URL — keep original Text as title */ }
          items.push({ title, url: r.FirstURL, snippet: r.Text });
        }
      });
    }

    // ── If we have few/no DDG items, add curated search-engine links ─────
    const searchEngineLinks = buildSearchEngineLinks(query);

    // Show info bar
    const infoBar = document.createElement('div');
    infoBar.className = 'results-info';
    infoBar.textContent =
      `About ${items.length + searchEngineLinks.length} results for "${query}"`;
    resultsList.appendChild(infoBar);

    // Render DDG items
    items.slice(0, 10).forEach(item => {
      resultsList.appendChild(makeResultCard(item.title, item.url, item.snippet));
    });

    // Render search engine links
    searchEngineLinks.forEach(item => {
      resultsList.appendChild(makeResultCard(item.title, item.url, item.snippet, true));
    });

    // Error fallback
    if (items.length === 0 && searchEngineLinks.length === 0) {
      resultsError.style.display = 'block';
      resultsError.textContent =
        'No results found. Try a different search term.';
    }
  }

  /**
   * Builds a list of "Search on Google / Bing / DuckDuckGo" result cards
   * so users always have clickable links to real search engines.
   */
  function buildSearchEngineLinks(query) {
    const enc = encodeURIComponent(query);
    return [
      {
        title: `"${query}" – Google Search`,
        url: `https://www.google.com/search?q=${enc}`,
        snippet: `See all Google search results for "${query}". Click to open Google in a new tab.`,
      },
      {
        title: `"${query}" – Bing Search`,
        url: `https://www.bing.com/search?q=${enc}`,
        snippet: `See all Bing search results for "${query}". Click to open Bing in a new tab.`,
      },
      {
        title: `"${query}" – DuckDuckGo`,
        url: `https://duckduckgo.com/?q=${enc}`,
        snippet: `See all DuckDuckGo search results for "${query}". Privacy-first search engine.`,
      },
    ];
  }

  function makeResultCard(title, url, snippet, isEngine = false) {
    const card = document.createElement('div');
    card.className = 'result-item';

    const urlEl = document.createElement('div');
    urlEl.className = 'result-url';
    urlEl.textContent = url;

    const titleEl = document.createElement('div');
    titleEl.className = 'result-title';
    titleEl.textContent = title || url;

    card.append(urlEl, titleEl);

    if (snippet) {
      const snippetEl = document.createElement('div');
      snippetEl.className = 'result-snippet';
      snippetEl.textContent = snippet;
      card.appendChild(snippetEl);
    }

    // Open button — use textContent to avoid innerHTML with HTML entities
    const btn = document.createElement('button');
    btn.className = 'result-open-btn';
    btn.textContent = isEngine ? 'Open in new tab ↗' : 'Visit site ↗';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      safeWindowOpen(url);
    });
    card.appendChild(btn);

    // Clicking the card title area also opens the URL in the browser (navigate)
    card.addEventListener('click', () => {
      navigate(url);
    });

    return card;
  }

  /* ── Iframe events ──────────────────────────────────────────────────── */
  browserFrame.addEventListener('load', () => {
    const tab = getActiveTab();
    if (!tab || tab.view !== 'frame') return;

    // Try to read the iframe title/src (may be blocked by same-origin policy)
    try {
      const iUrl = browserFrame.contentWindow.location.href;
      if (iUrl && iUrl !== 'about:blank') {
        tab.url = iUrl;
        addressBar.value = iUrl;
        updateLock(iUrl);
      }
      const iTitle = browserFrame.contentDocument.title;
      if (iTitle) {
        tab.title = iTitle;
        updateTabTitle(tab);
      }
    } catch { /* cross-origin, ignore */ }

    frameBlocked.style.display = 'none';
    setStatus('');
  });

  // Detect blocked iframes by listening for errors (best-effort)
  browserFrame.addEventListener('error', () => {
    frameBlocked.style.display = 'flex';
    setStatus('');
  });

  // After a small delay, check if the iframe content loaded (detect X-Frame-Options blocking)
  function scheduleBlockedCheck() {
    setTimeout(() => {
      if (getActiveTab()?.view !== 'frame') return;
      try {
        // Intentionally access contentDocument to trigger a DOMException
        // for cross-origin frames — same-origin frames allow this without error.
        // eslint-disable-next-line no-unused-expressions
        browserFrame.contentDocument?.title;
      } catch {
        frameBlocked.style.display = 'flex';
      }
    }, IFRAME_CHECK_DELAY_MS);
  }

  openExternalBtn.addEventListener('click', () => {
    const tab = getActiveTab();
    if (tab?.url) safeWindowOpen(tab.url);
  });

  goBackBlockedBtn.addEventListener('click', () => {
    frameBlocked.style.display = 'none';
    goBack();
  });

  /* ── Event listeners ────────────────────────────────────────────────── */

  // New tab button
  newTabBtn.addEventListener('click', () => createTab());

  // Navigation buttons
  backBtn.addEventListener('click', goBack);
  forwardBtn.addEventListener('click', goForward);
  reloadBtn.addEventListener('click', reload);
  homeBtn.addEventListener('click', goHome);

  // Address bar
  goBtn.addEventListener('click', () => navigate(addressBar.value));
  addressBar.addEventListener('keydown', e => {
    if (e.key === 'Enter') navigate(addressBar.value);
  });
  addressBar.addEventListener('focus', () => addressBar.select());

  // New-tab search box
  ntbSearchBtn.addEventListener('click', () => navigate(ntbSearch.value));
  ntbSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter') navigate(ntbSearch.value);
  });

  // Results search bar
  resultsSearchBtn.addEventListener('click', () => navigate(resultsSearch.value));
  resultsSearch.addEventListener('keydown', e => {
    if (e.key === 'Enter') navigate(resultsSearch.value);
  });

  // Quick links on new-tab page
  document.querySelectorAll('.ql-item').forEach(el => {
    el.addEventListener('click', () => {
      const url = el.dataset.url;
      if (url) navigate(url);
    });
  });

  // Results tab nav (cosmetic — only "All" is functional)
  document.querySelectorAll('.rtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 't') { e.preventDefault(); createTab(); }
    if (ctrl && e.key === 'w') { e.preventDefault(); const t = getActiveTab(); if (t) closeTab(t.id); }
    if (ctrl && e.key === 'r') { e.preventDefault(); reload(); }
    if (ctrl && e.key === 'l') { e.preventDefault(); addressBar.focus(); addressBar.select(); }
  });

  /* ── Hover status bar ───────────────────────────────────────────────── */
  document.querySelectorAll('.ql-item').forEach(el => {
    el.addEventListener('mouseenter', () => setStatus(el.dataset.url || ''));
    el.addEventListener('mouseleave', () => setStatus(''));
  });

  /* ── Bootstrap: open a first tab ─────────────────────────────────────── */
  createTab();
})();
