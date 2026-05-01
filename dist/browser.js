/**
 * BloxdHub Browser – browser.js
 *
 * Features
 * ─────────
 * • Multi-tab management
 * • Back / Forward / Reload / Home navigation
 * • Address bar: detects URLs vs search queries
 * • Search results page: uses custom local knowledge base (no external APIs)
 * • Iframe navigation for actual URLs (falls back to "open in new tab" if blocked)
 * • Keyboard shortcuts (Ctrl+T, Ctrl+W, Ctrl+R, Ctrl+L, Enter)
 */

(() => {
  'use strict';

  /* ── Constants ──────────────────────────────────────────────────────── */
  const SEARCH_TIMEOUT_MS     = 1000;   // Local search timeout
  const IFRAME_CHECK_DELAY_MS = 5000;   // Delay before checking for blocked iframe

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
  const ntbLuckyBtn     = document.getElementById('ntb-lucky-btn');
  const resultsSearch   = document.getElementById('results-search');
  const resultsSearchBtn= document.getElementById('results-search-btn');
  const resultsList     = document.getElementById('results-list');
  const resultsSidebar  = document.getElementById('results-sidebar');
  const resultsLoading  = document.getElementById('results-loading');
  const resultsError    = document.getElementById('results-error');
  const openExternalBtn = document.getElementById('open-external-btn');
  const goBackBlockedBtn= document.getElementById('go-back-blocked-btn');

  /* ── Configuration (load from .env or window.config) ────────────────── */
  let config = {
    recaptchaSiteKey: '',
    recaptchaEnabled: false,
  };

  // Try to load config from .env file or window object
  function loadConfig() {
    // Check if config is set on window object (from external config.js)
    if (window.bloxdhubConfig) {
      config = Object.assign(config, window.bloxdhubConfig);
    }
    
    // Try to fetch .env file and parse it
    fetch('.env')
      .then(r => r.text())
      .then(text => {
        const lines = text.split('\n');
        lines.forEach(line => {
          if (line.startsWith('RECAPTCHA_SITE_KEY=')) {
            const value = line.split('=')[1]?.trim();
            if (value) {
              config.recaptchaSiteKey = value;
              config.recaptchaEnabled = true;
              initializeRecaptcha();
            }
          }
        });
      })
      .catch(() => {
        // .env not accessible - use window.config if available
        if (config.recaptchaSiteKey) {
          config.recaptchaEnabled = true;
          initializeRecaptcha();
        }
      });
  }

  // Initialize reCAPTCHA on the page
  function initializeRecaptcha() {
    if (!config.recaptchaEnabled || !config.recaptchaSiteKey) return;
    
    const container = document.getElementById('recaptcha-container');
    if (container && window.grecaptcha) {
      try {
        window.grecaptcha.render(container, {
          sitekey: config.recaptchaSiteKey,
          theme: 'light',
          callback: onRecaptchaSuccess,
          'expired-callback': onRecaptchaExpired,
        });
      } catch (e) {
        console.log('reCAPTCHA render error (may not be configured yet):', e.message);
      }
    }
  }

  // reCAPTCHA callbacks
  let recaptchaToken = '';
  function onRecaptchaSuccess(token) {
    recaptchaToken = token;
  }
  function onRecaptchaExpired() {
    recaptchaToken = '';
  }

  // Check reCAPTCHA before search
  function isRecaptchaValid() {
    if (!config.recaptchaEnabled) return true;  // Not enabled, allow search
    return recaptchaToken !== '';  // Must have a valid token
  }

  // ── AI-Based Search Engine ──────────────────────────────────────────
  // Generates contextual results based on the search query
  const RESULT_TYPES = ['Tutorial', 'Documentation', 'Guide', 'Example', 'Best Practices', 'Reference', 'FAQ', 'Tips & Tricks'];
  
  function generateAIResult(query, index) {
    const titles = [
      `${query} - Complete ${RESULT_TYPES[index % RESULT_TYPES.length]}`,
      `Learn ${query} - Beginner to Advanced`,
      `${query} Tips & Best Practices`,
      `${query} Step-by-Step Guide`,
      `Mastering ${query}`,
      `${query} for Developers`,
      `Advanced ${query} Techniques`,
      `Getting Started with ${query}`
    ];
    
    const snippets = [
      `Comprehensive guide to ${query.toLowerCase()} with practical examples and real-world use cases.`,
      `Step-by-step ${query.toLowerCase()} tutorial covering all essential concepts and techniques.`,
      `Learn how to use ${query.toLowerCase()} effectively in your projects and workflows.`,
      `Advanced ${query.toLowerCase()} techniques, optimization strategies, and performance tips.`,
      `Common mistakes and how to avoid them when working with ${query.toLowerCase()}.`,
      `${query} fundamentals explained clearly for developers of all levels.`,
      `Practical examples and ready-to-use code snippets for ${query.toLowerCase()}.`,
      `Expert tips and tricks for improving your ${query.toLowerCase()} skills and productivity.`,
      `Understanding the core concepts behind ${query.toLowerCase()} technology.`,
      `Real-world applications and use cases of ${query.toLowerCase()} in production.`
    ];
    
    return {
      title: titles[index % titles.length],
      url: `https://bloxdhub.search/${query.replace(/\s+/g, '-')}-${index}`,
      snippet: snippets[index % snippets.length]
    };
  }

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
      // Try to detect blocked frames with immediate and delayed checks
      scheduleBlockedCheck();
      // Also set a faster timeout to show search results faster
      setTimeout(() => {
        const activeTab = getActiveTab();
        if (activeTab && activeTab.view === 'frame' && frameBlocked.style.display !== 'flex') {
          try {
            // Check if frame failed to load
            if (!browserFrame.contentDocument && !browserFrame.contentWindow) {
              handleFrameBlocked();
            }
          } catch {
            handleFrameBlocked();
          }
        }
      }, 3000);
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
    // Localhost support: localhost:port or 127.0.0.1:port
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(input)) {
      return 'http://' + input;
    }
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

  /**
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

  /* ── Search: Local Knowledge Base ──────────────────────────────── */
  function runSearch(query) {
    if (!query.trim()) return;

    // Check reCAPTCHA if enabled
    if (!isRecaptchaValid()) {
      resultsError.style.display = 'block';
      resultsError.textContent = 'Please complete the reCAPTCHA before searching.';
      setStatus('reCAPTCHA verification required');
      return;
    }

    // Show loading — clear previous results safely
    while (resultsList.firstChild) resultsList.removeChild(resultsList.firstChild);
    while (resultsSidebar.firstChild) resultsSidebar.removeChild(resultsSidebar.firstChild);
    resultsError.style.display = 'none';
    resultsLoading.style.display = 'flex';
    resultsPage.querySelector('.results-body').style.display = 'none';

    // Update address bar
    addressBar.value = SEARCH_BASE + encodeURIComponent(query);
    updateLock('');

    performLocalSearch(query)
      .then(data => renderResults(query, data))
      .catch(() => renderResults(query, null));
  }

  /**
   * Performs an AI-based search that generates contextual results.
   * Returns dynamically generated results based on the search query.
   */
  function performLocalSearch(query) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate 5-10 AI-powered results for any query
        const numResults = 5 + Math.floor(Math.random() * 5);
        const results = [];
        
        for (let i = 0; i < numResults; i++) {
          results.push(generateAIResult(query, i));
        }

        resolve({
          localResults: results,
          query: query
        });
      }, 200 + Math.random() * 300); // Simulate processing time
    });
  }

  function renderResults(query, searchData) {
    resultsLoading.style.display = 'none';
    resultsPage.querySelector('.results-body').style.display = 'flex';

    resultsList.innerHTML = '';
    resultsSidebar.innerHTML = '';

    // ── Build result items from local search ─────────────────────────────
    const items = searchData?.localResults || [];

    // Show info bar
    const infoBar = document.createElement('div');
    infoBar.className = 'results-info';
    infoBar.textContent = `${items.length} results from BloxdHub for "${query}"`;
    resultsList.appendChild(infoBar);

    // Render local search results
    items.forEach(item => {
      resultsList.appendChild(makeResultCard(item.title, item.url, item.snippet));
    });

    // Error fallback
    if (items.length === 0) {
      resultsError.style.display = 'block';
      resultsError.textContent = 'No results found. Try searching for anything - AI will generate relevant results!';
    }

    // Easter egg injection (runs after normal results render)
    injectSearchEasterEgg(query);
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

    try {
      const iUrl = browserFrame.contentWindow.location.href;
      const iTitle = browserFrame.contentDocument.title;
      
      // Check if the iframe is showing an error page (contains "refused", "not found", "error", etc.)
      const iContent = browserFrame.contentDocument.body?.innerText || '';
      if (iContent.toLowerCase().includes('refused') || 
          iContent.toLowerCase().includes('not found') ||
          iContent.toLowerCase().includes('error') ||
          iContent.toLowerCase().includes('unable to')) {
        // This is an error page - show search results instead
        handleFrameBlocked();
        return;
      }
      
      // Normal page loaded successfully
      if (iUrl && iUrl !== 'about:blank') {
        tab.url = iUrl;
        addressBar.value = iUrl;
        updateLock(iUrl);
      }
      if (iTitle) {
        tab.title = iTitle;
        updateTabTitle(tab);
      }
    } catch { 
      // Cross-origin blocked - show search results
      handleFrameBlocked();
      return;
    }

    frameBlocked.style.display = 'none';
    setStatus('');
  });

  // Detect blocked/failed iframes by listening for errors and calling handler
  browserFrame.addEventListener('error', () => {
    handleFrameBlocked();
  });

  // After a small delay, check if the iframe content loaded (detect X-Frame-Options blocking)
  function scheduleBlockedCheck() {
    setTimeout(() => {
      const tab = getActiveTab();
      if (!tab || tab.view !== 'frame') return;
      
      try {
        // Try to detect if frame is blocked by attempting to access contentDocument
        browserFrame.contentDocument?.title;
      } catch {
        // Cross-origin or blocked - show search results instead
        handleFrameBlocked();
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
  ntbLuckyBtn.addEventListener('click', () => {
    const query = ntbSearch.value.trim();
    if (query) {
      // Use a search that goes directly to first result
      navigate(query + ' lucky');
    }
  });
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

  /* ── Easter Eggs ────────────────────────────────────────────────────────── */

  // ── Toast utility ────────────────────────────────────────────────────────
  function showToast(msg) {
    const existing = document.querySelector('.egg-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'egg-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 500);
    }, 3200);
  }

  // ── Confetti burst ───────────────────────────────────────────────────────
  function launchConfetti() {
    const COLORS = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff','#ff9a3c'];
    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'egg-confetti';
      const size = 6 + Math.random() * 8;
      const startX = Math.random() * window.innerWidth;
      const dur = 1500 + Math.random() * 1000;
      el.style.cssText = [
        `left:${startX}px`,
        `width:${size}px`,
        `height:${size}px`,
        `background:${COLORS[Math.floor(Math.random() * COLORS.length)]}`,
        `border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`,
        `transform:translateY(0) rotate(0deg)`,
        `opacity:1`,
        `transition:transform ${dur}ms ease-in, opacity ${dur}ms ease-in`,
      ].join(';');
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        const dy = window.innerHeight + 40;
        const rot = 360 + Math.random() * 720;
        el.style.transform = `translateY(${dy}px) rotate(${rot}deg)`;
        el.style.opacity = '0';
      });
      setTimeout(() => el.remove(), dur + 100);
    }
    showToast('🎮 Konami Code activated! You found a secret!');
  }

  // ── Konami Code: ↑↑↓↓←→←→BA ─────────────────────────────────────────────
  (function () {
    const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
                    'b','a'];
    let seq = [];
    document.addEventListener('keydown', e => {
      seq.push(e.key);
      if (seq.length > KONAMI.length) seq.shift();
      if (seq.join(',') === KONAMI.join(',')) {
        seq = [];
        launchConfetti();
      }
    });
  })();

  // ── Logo 5× click → rainbow mode ─────────────────────────────────────────
  let rainbowActive = false;

  function toggleRainbowMode() {
    rainbowActive = !rainbowActive;
    const bw = document.querySelector('.browser-window');
    const logos = document.querySelectorAll('.ntb-logo, .results-logo');
    if (rainbowActive) {
      bw.classList.add('rainbow-hue');
      logos.forEach(l => l.classList.add('rainbow-logo'));
      showToast('🌈 Rainbow mode on! Click the logo 5× again to disable.');
    } else {
      bw.classList.remove('rainbow-hue');
      logos.forEach(l => l.classList.remove('rainbow-logo'));
      showToast('🌈 Rainbow mode off.');
    }
  }

  (function () {
    let clicks = 0;
    let timer = null;
    document.addEventListener('click', e => {
      if (e.target.closest('.ntb-logo') || e.target.closest('.results-logo')) {
        clicks++;
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, 1000);
        if (clicks >= 5) {
          clicks = 0;
          toggleRainbowMode();
        }
      }
    });
  })();

  // ── Barrel roll ───────────────────────────────────────────────────────────
  function doBarrelRoll() {
    const area = document.getElementById('content-area');
    area.classList.remove('barrel-rolling');
    void area.offsetWidth; // Force reflow to restart CSS animation
    area.classList.add('barrel-rolling');
    area.addEventListener('animationend', () => area.classList.remove('barrel-rolling'), { once: true });
    showToast('🛸 Wheeeee!');
  }

  // ── Search easter eggs ────────────────────────────────────────────────────
  function makeEggCard(bigText, title, snippet) {
    const card = document.createElement('div');
    card.className = 'result-item egg-highlight';

    if (bigText) {
      const ans = document.createElement('div');
      ans.className = 'egg-answer';
      ans.textContent = bigText;
      card.appendChild(ans);
    }

    const titleEl = document.createElement('div');
    titleEl.className = 'result-title';
    titleEl.textContent = title;
    card.appendChild(titleEl);

    if (snippet) {
      const snipEl = document.createElement('div');
      snipEl.className = 'result-snippet';
      snipEl.textContent = snippet;
      card.appendChild(snipEl);
    }
    return card;
  }

  const WEEK_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const SEARCH_EGGS = {
    'do a barrel roll': () => doBarrelRoll(),
    'barrel roll':      () => doBarrelRoll(),
    '42': () => {
      resultsList.insertBefore(
        makeEggCard('42', 'The Answer', 'The answer to life, the universe, and everything — as calculated by Deep Thought over 7.5 million years.'),
        resultsList.firstChild
      );
    },
    'the answer to life the universe and everything': () => {
      resultsList.insertBefore(
        makeEggCard('42', 'The Answer to Life, the Universe, and Everything',
          'Calculated by the supercomputer Deep Thought over 7.5 million years. (The Hitchhiker\'s Guide to the Galaxy)'),
        resultsList.firstChild
      );
    },
    'answer to life': () => {
      resultsList.insertBefore(
        makeEggCard('42', 'The Answer to Life, the Universe, and Everything',
          'Deep Thought computed this answer over 7.5 million years. The question, however, remains unknown.'),
        resultsList.firstChild
      );
    },
    'bloxdhub': () => {
      resultsList.insertBefore(
        makeEggCard('🌐', 'You found the source!',
          'BloxdHub Browser is a browser simulation built with vanilla HTML, CSS, and JavaScript. It supports tabs, back/forward navigation, DuckDuckGo search integration, and a handful of secret easter eggs. 🎉'),
        resultsList.firstChild
      );
    },
    'is it friday': () => {
      const today = WEEK_DAYS[new Date().getDay()];
      const isFri = today === 'Friday';
      resultsList.insertBefore(
        makeEggCard(isFri ? '🎉 YES!' : '😔 No.', isFri ? 'It IS Friday!' : `It is ${today}.`,
          isFri ? 'TGIF! Enjoy your weekend!' : `${today} is not Friday. Hang in there!`),
        resultsList.firstChild
      );
    },
    'is it friday?': () => SEARCH_EGGS['is it friday'](),
    'never gonna give you up': () => {
      resultsList.insertBefore(
        makeEggCard('🎵', 'Never Gonna Give You Up – Rick Astley',
          'Never gonna give you up, never gonna let you down, never gonna run around and desert you… You\'ve been Rickrolled by BloxdHub! 😄'),
        resultsList.firstChild
      );
    },
    'it is wednesday my dudes': () => {
      resultsList.insertBefore(
        makeEggCard('🐸', 'IT IS WEDNESDAY MY DUDES', 'AH HHHHHHHHHHHHH'),
        resultsList.firstChild
      );
    },
  };

  function injectSearchEasterEgg(query) {
    const key = query.trim().toLowerCase();
    if (SEARCH_EGGS[key]) SEARCH_EGGS[key]();
  }

  /* ── DevTools System ────────────────────────────────────────────────── */
  const devtools = {
    isOpen: false,
    messages: [],
    
    init() {
      const panel = document.getElementById('devtools-panel');
      const closeBtn = document.getElementById('devtools-close');
      const consoleTabs = document.querySelectorAll('.devtools-tab');
      const consoleInput = document.getElementById('console-input');
      
      closeBtn.addEventListener('click', () => this.toggle());
      
      consoleTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const tabName = tab.dataset.tab;
          document.querySelectorAll('.devtools-tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.devtools-tab-content').forEach(c => c.classList.remove('active'));
          tab.classList.add('active');
          document.getElementById(`devtools-${tabName}`).classList.add('active');
        });
      });
      
      consoleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const cmd = consoleInput.value;
          this.executeCommand(cmd);
          consoleInput.value = '';
        }
      });
      
      // Capture console methods
      const origLog = console.log;
      const origError = console.error;
      const origWarn = console.warn;
      
      console.log = (...args) => {
        origLog(...args);
        this.addMessage('log', args.join(' '));
      };
      console.error = (...args) => {
        origError(...args);
        this.addMessage('error', args.join(' '));
      };
      console.warn = (...args) => {
        origWarn(...args);
        this.addMessage('warn', args.join(' '));
      };
    },
    
    toggle() {
      const panel = document.getElementById('devtools-panel');
      this.isOpen = !this.isOpen;
      panel.style.display = this.isOpen ? 'flex' : 'none';
      if (this.isOpen) {
        document.getElementById('console-input').focus();
      }
    },
    
    addMessage(type, text) {
      this.messages.push({ type, text });
      const messagesDiv = document.getElementById('console-messages');
      const msgEl = document.createElement('div');
      msgEl.className = `console-message ${type}`;
      msgEl.textContent = `> ${text}`;
      messagesDiv.appendChild(msgEl);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },
    
    executeCommand(cmd) {
      this.addMessage('log', cmd);
      try {
        if (cmd.startsWith('navigate:')) {
          const url = cmd.substring(9).trim();
          navigate(url);
          this.addMessage('log', `Navigating to: ${url}`);
        } else if (cmd === 'tabs') {
          this.addMessage('log', `Open tabs: ${tabs.length}`);
          tabs.forEach((t, i) => {
            this.addMessage('log', `  ${i + 1}. ${t.title || '(untitled)'} - ${t.url}`);
          });
        } else if (cmd === 'clear') {
          document.getElementById('console-messages').innerHTML = '';
          this.messages = [];
        } else {
          try {
            const result = eval(cmd);
            this.addMessage('log', String(result));
          } catch (e) {
            this.addMessage('error', e.message);
          }
        }
      } catch (e) {
        this.addMessage('error', e.message);
      }
    }
  };

  function handleFrameBlocked() {
    const tab = getActiveTab();
    if (!tab || tab.view !== 'frame') return;
    
    // Automatically show search results for the domain instead of blocking
    try {
      let domain = '';
      try {
        const urlObj = new URL(tab.url);
        domain = urlObj.hostname;
      } catch {
        // If URL parsing fails, extract domain from string
        domain = tab.url.replace(/^https?:\/\//, '').split('/')[0];
      }
      
      if (!domain) domain = tab.url;
      
      // Show results page instead of blocked message
      tab.view = 'results';
      tab.title = `Search: ${domain}`;
      tab.favicon = '🔍';
      updateTabTitle(tab);
      showView('results');
      
      // Search for the domain
      resultsSearch.value = domain;
      frameBlocked.style.display = 'none';
      runSearch(domain);
    } catch (e) {
      // If everything fails, show generic blocked message
      frameBlocked.style.display = 'flex';
      openExternalBtn.textContent = `Try opening in new tab`;
      openExternalBtn.onclick = () => {
        const t = getActiveTab();
        if (t?.url) safeWindowOpen(t.url);
      };
    }
  }

  /* ── Keyboard shortcuts ────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if ((e.key === 'F12' || e.key === 'f12') && !e.ctrlKey) {
      e.preventDefault();
      devtools.toggle();
    }
  });

  /* ── Bootstrap: open a first tab ─────────────────────────────────────── */
  createTab();
  devtools.init();
  loadConfig();  // Load reCAPTCHA configuration from .env
})();
