import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from '../utils/supabase';

export default function ResultsPage({ tab, recaptchaToken, onRecaptchaToken }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Test connection on mount
  useEffect(() => {
    async function checkConnection() {
      const result = await testConnection();
      setConnectionStatus(result);
      if (!result.success) {
        setError(`⚠️ Supabase Connection Failed: ${result.error}`);
      }
    }
    checkConnection();
  }, []);

  useEffect(() => {
    if (tab?.url?.startsWith('bloxdhub-search:')) {
      const query = decodeURIComponent(tab.url.slice('bloxdhub-search:'.length));
      setSearchQuery(query);
      performSearch(query);
    }
  }, [tab?.url]);

  const performSearch = async (query) => {
    if (!query.trim()) return;

    if (!supabase || !connectionStatus?.success) {
      setError('❌ Not connected to Supabase. Check your .env.local configuration.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const { data, error: err } = await supabase
        .from('knowledge_base')
        .select('id, title, url, snippet')
        .or(`title.ilike.%${query}%,snippet.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);

      if (err) {
        setError('❌ Error searching knowledge base: ' + err.message);
        setResults([]);
      } else {
        setResults(data || []);
        if (!data || data.length === 0) {
          setError('No results found in knowledge base. Try different keywords.');
        }
      }
    } catch (err) {
      setError('❌ Connection error: ' + err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter') {
      performSearch(searchQuery);
    }
  };

  return (
    <div className="results-page">
      <div className="results-header">
        <input
          type="text"
          className="results-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleSearchSubmit}
          placeholder="Search..."
        />
        <button className="results-search-btn" onClick={() => performSearch(searchQuery)}>Search</button>
      </div>

      <div className="results-body">
        {loading && (
          <div className="results-loading">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        )}

        {error && <div className="results-error">{error}</div>}

        {!loading && results.length > 0 && (
          <div className="results-list">
            <div className="results-info">
              {results.length} results from BloxdHub for "{searchQuery}"
            </div>
            {results.map(result => (
              <div key={result.id} className="result-card">
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="result-title">
                  {result.title}
                </a>
                <div className="result-url">{result.url}</div>
                <div className="result-snippet">{result.snippet}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
