import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from './utils/supabase';
import TabBar from './components/TabBar';
import Navigation from './components/Navigation';
import NewTabPage from './components/NewTabPage';
import ResultsPage from './components/ResultsPage';
import BrowserFrame from './components/BrowserFrame';
import DiagnosticsPage from './components/DiagnosticsPage';
import './App.css';

export default function App() {
  const [tabs, setTabs] = useState([{ id: 1, title: 'New Tab', url: '', view: 'newtab', favicon: '🌐', history: [], historyIndex: -1 }]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [tabCounter, setTabCounter] = useState(1);
  const [recaptchaToken, setRecaptchaToken] = useState('');

  const getActiveTab = useCallback(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);

  const createTab = useCallback((url = '') => {
    const newId = tabCounter + 1;
    setTabCounter(newId);
    const newTab = {
      id: newId,
      url: url || '',
      title: url ? 'Loading…' : 'New Tab',
      favicon: url ? '🌐' : '🌐',
      history: url ? [url] : [],
      historyIndex: url ? 0 : -1,
      view: url ? (isSearchQuery(url) ? 'results' : 'frame') : 'newtab',
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newId);
    return newTab;
  }, [tabCounter]);

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      if (prev.length === 1) {
        return [{ id: prev[0].id, url: '', title: 'New Tab', favicon: '🌐', history: [], historyIndex: -1, view: 'newtab' }];
      }
      return prev.filter(t => t.id !== id);
    });
    if (activeTabId === id) {
      setActiveTabId(tabs[0].id);
    }
  }, [activeTabId, tabs]);

  const switchTab = useCallback((id) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id, updates) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const isSearchQuery = (input) => {
    if (input.startsWith('bloxdhub-diag:')) return true;
    if (input.startsWith('bloxdhub-search:')) return true;
    if (/^https?:\/\//i.test(input)) return false;
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(input)) return false;
    if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(\/.*)?$/i.test(input)) return false;
    return true;
  };

  const resolveInput = (input) => {
    if (!input) return '';
    if (input.startsWith('bloxdhub-diag:')) return input;
    if (input.startsWith('bloxdhub-search:')) return input;
    if (/^https?:\/\//i.test(input)) return input;
    if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(input)) return 'http://' + input;
    if (/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(\/.*)?$/i.test(input)) return 'https://' + input;
    return 'bloxdhub-search:' + encodeURIComponent(input);
  };

  const navigate = useCallback((input, addToHistory = true) => {
    const url = resolveInput(input.trim());
    const activeTab = getActiveTab();
    if (!activeTab) return;

    updateTab(activeTab.id, { url });

    if (addToHistory) {
      const newHistory = activeTab.history.slice(0, activeTab.historyIndex + 1);
      newHistory.push(url);
      updateTab(activeTab.id, { history: newHistory, historyIndex: newHistory.length - 1 });
    }

    if (url.startsWith('bloxdhub-diag:')) {
      updateTab(activeTab.id, { view: 'diagnostics', title: 'Diagnostics', favicon: '🔧' });
    } else if (url.startsWith('bloxdhub-search:')) {
      const query = decodeURIComponent(url.slice('bloxdhub-search:'.length));
      updateTab(activeTab.id, { view: 'results', title: query + ' – BloxdHub', favicon: '🔍' });
    } else {
      updateTab(activeTab.id, { view: 'frame', favicon: '🌐', title: 'Loading…' });
    }
  }, [getActiveTab, updateTab]);

  const goBack = useCallback(() => {
    const activeTab = getActiveTab();
    if (!activeTab || activeTab.historyIndex <= 0) return;
    const newIndex = activeTab.historyIndex - 1;
    updateTab(activeTab.id, { historyIndex: newIndex });
    navigate(activeTab.history[newIndex], false);
  }, [getActiveTab, navigate, updateTab]);

  const goForward = useCallback(() => {
    const activeTab = getActiveTab();
    if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1) return;
    const newIndex = activeTab.historyIndex + 1;
    updateTab(activeTab.id, { historyIndex: newIndex });
    navigate(activeTab.history[newIndex], false);
  }, [getActiveTab, navigate, updateTab]);

  const goHome = useCallback(() => {
    const activeTab = getActiveTab();
    if (!activeTab) return;
    updateTab(activeTab.id, { url: '', view: 'newtab', title: 'New Tab', favicon: '🌐' });
  }, [getActiveTab, updateTab]);

  const reload = useCallback(() => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.url) return;
    if (activeTab.view === 'results') {
      // Re-search
      const query = decodeURIComponent(activeTab.url.slice('bloxdhub-search:'.length));
      // Will be handled by ResultsPage component
    }
  }, [getActiveTab]);

  const activeTab = getActiveTab();

  // Handle keyboard shortcut to open diagnostics
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.altKey && e.key === 'd') {
        e.preventDefault();
        navigate('bloxdhub-diag:');
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  return (
    <div className="browser-window">
      <TabBar tabs={tabs} activeTabId={activeTabId} onSwitchTab={switchTab} onCloseTab={closeTab} onNewTab={createTab} />
      <Navigation tab={activeTab} onNavigate={navigate} onGoBack={goBack} onGoForward={goForward} onGoHome={goHome} onReload={reload} />
      
      <div className="browser-content">
        {activeTab?.view === 'newtab' && <NewTabPage onSearch={(q) => navigate('bloxdhub-search:' + encodeURIComponent(q))} />}
        {activeTab?.view === 'results' && <ResultsPage tab={activeTab} recaptchaToken={recaptchaToken} onRecaptchaToken={setRecaptchaToken} />}
        {activeTab?.view === 'diagnostics' && <DiagnosticsPage />}
        {activeTab?.view === 'frame' && <BrowserFrame url={activeTab?.url} />}
      </div>
    </div>
  );
}
