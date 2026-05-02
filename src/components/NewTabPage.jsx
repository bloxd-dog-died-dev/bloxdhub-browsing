import React, { useState } from 'react';

export default function NewTabPage({ onSearch }) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="new-tab-page">
      <div className="ntb-container">
        <div className="ntb-logo">BloxdHub</div>
        <div className="ntb-search-wrap">
          <input
            type="text"
            className="ntb-search"
            id="ntb-search"
            placeholder="Search or type a URL"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="ntb-btn-group">
            <button className="ntb-search-btn" onClick={handleSearch}>Search</button>
            <button className="ntb-lucky-btn">I'm Feeling Lucky</button>
          </div>
        </div>
      </div>
    </div>
  );
}
