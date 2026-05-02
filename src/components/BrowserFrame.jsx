import React, { useRef, useEffect } from 'react';

export default function BrowserFrame({ url }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && url && !url.startsWith('bloxdhub-search:')) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          iframeRef.current.src = parsed.href;
        } else {
          iframeRef.current.src = 'about:blank';
        }
      } catch {
        iframeRef.current.src = 'about:blank';
      }
    }
  }, [url]);

  return (
    <div className="frame-wrap">
      <iframe
        ref={iframeRef}
        id="browser-frame"
        className="browser-frame"
        src="about:blank"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        title="Browser Frame"
      />
      <div className="frame-blocked" style={{ display: 'none' }}>
        <div className="blocked-content">
          <h2>⛔ Site Blocked</h2>
          <p>This site cannot be loaded in the browser frame.</p>
          <button>Open in new tab</button>
        </div>
      </div>
    </div>
  );
}
