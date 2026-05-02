import React from 'react';

export default function Navigation({ tab, onNavigate, onGoBack, onGoForward, onGoHome, onReload }) {
  const handleAddressBarKeyDown = (e) => {
    if (e.key === 'Enter') {
      onNavigate(e.target.value);
    }
  };

  const getLockIcon = () => {
    if (!tab?.url || tab.url.startsWith('bloxdhub-search:')) return '🔍';
    if (tab.url.startsWith('https:')) return '🔒';
    return '⚠️';
  };

  return (
    <div className="nav-bar">
      <div className="nav-btn-group">
        <button className="nav-btn" onClick={onGoBack} disabled={!tab || tab.historyIndex <= 0} title="Back">&#8249;</button>
        <button className="nav-btn" onClick={onGoForward} disabled={!tab || tab.historyIndex >= (tab?.history?.length || 0) - 1} title="Forward">&#8250;</button>
        <button className="nav-btn" onClick={onReload} title="Reload">&#8635;</button>
        <button className="nav-btn" onClick={onGoHome} title="Home">&#8962;</button>
      </div>
      <div className="address-bar-wrap">
        <span className="lock-icon" title={getLockIcon() === '🔍' ? 'Search' : getLockIcon() === '🔒' ? 'Secure connection' : 'Not secure'}>
          {getLockIcon()}
        </span>
        <input
          type="text"
          className="address-bar"
          placeholder="Search or enter URL"
          value={tab?.url || ''}
          onChange={(e) => {}}
          onKeyDown={handleAddressBarKeyDown}
          autoComplete="off"
          spellCheck="false"
        />
        <button className="go-btn" onClick={() => onNavigate((document.querySelector('.address-bar') || {}).value)} title="Go">&#10132;</button>
      </div>
      <div className="nav-extras">
        <button className="nav-btn" title="Bookmarks">&#9733;</button>
        <button className="nav-btn" title="Settings">&#8942;</button>
      </div>
    </div>
  );
}
