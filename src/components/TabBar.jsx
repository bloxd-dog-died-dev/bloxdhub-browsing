import React from 'react';

export default function TabBar({ tabs, activeTabId, onSwitchTab, onCloseTab, onNewTab }) {
  return (
    <div className="tab-bar">
      <div className="tabs" id="tabs-container">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => onSwitchTab(tab.id)}
          >
            <span className="tab-favicon">{tab.favicon}</span>
            <span className="tab-title">{tab.title}</span>
            <button
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className="new-tab-btn" onClick={() => onNewTab()} title="New tab">+</button>
      <div className="window-controls">
        <span className="wc minimize"></span>
        <span className="wc maximize"></span>
        <span className="wc close"></span>
      </div>
    </div>
  );
}
