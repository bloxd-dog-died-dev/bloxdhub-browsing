import React, { useState, useEffect } from 'react';
import { supabase, testConnection } from '../utils/supabase';

export default function DiagnosticsPage() {
  const [status, setStatus] = useState({
    clientInitialized: false,
    envVarsLoaded: false,
    tableExists: false,
    canRead: false,
    error: null
  });

  useEffect(() => {
    async function runDiagnostics() {
      const diagnostics = {
        clientInitialized: !!supabase,
        envVarsLoaded: !!process.env.VITE_SUPABASE_URL,
        tableExists: false,
        canRead: false,
        error: null
      };

      // Test connection
      const connResult = await testConnection();
      if (!connResult.success) {
        diagnostics.error = connResult.error;
        setStatus(diagnostics);
        return;
      }

      // Try to read from knowledge_base table
      try {
        const { data, error } = await supabase
          .from('knowledge_base')
          .select('COUNT(*)', { count: 'exact' })
          .limit(1);

        if (error) {
          if (error.message.includes('does not exist')) {
            diagnostics.error = '❌ Table "knowledge_base" does not exist in Supabase. Need to create it.';
            diagnostics.tableExists = false;
          } else if (error.message.includes('permission')) {
            diagnostics.error = '❌ Permission denied. RLS policies may be blocking access.';
            diagnostics.tableExists = true;
          } else {
            diagnostics.error = `❌ Error: ${error.message}`;
          }
        } else {
          diagnostics.tableExists = true;
          diagnostics.canRead = true;
          diagnostics.error = '✅ All systems operational!';
        }
      } catch (err) {
        diagnostics.error = `❌ Exception: ${err.message}`;
      }

      setStatus(diagnostics);
    }

    runDiagnostics();
  }, []);

  return (
    <div style={{
      padding: '40px',
      maxWidth: '600px',
      margin: '0 auto',
      fontFamily: 'monospace',
      lineHeight: '1.8',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px'
    }}>
      <h2>🔧 Supabase Diagnostics</h2>
      
      <div style={{ marginTop: '20px' }}>
        <p><strong>Supabase Client:</strong> {status.clientInitialized ? '✅ Initialized' : '❌ Not initialized'}</p>
        <p><strong>Environment Variables:</strong> {status.envVarsLoaded ? '✅ Loaded' : '❌ Not loaded'}</p>
        <p><strong>Table Exists:</strong> {status.tableExists ? '✅ Yes' : '❌ No'}</p>
        <p><strong>Can Read Data:</strong> {status.canRead ? '✅ Yes' : '❌ No'}</p>
      </div>

      <div style={{
        backgroundColor: status.error?.includes('✅') ? '#d4edda' : '#f8d7da',
        border: '1px solid ' + (status.error?.includes('✅') ? '#c3e6cb' : '#f5c6cb'),
        borderRadius: '4px',
        padding: '12px',
        marginTop: '20px'
      }}>
        <strong>Status:</strong> {status.error}
      </div>

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <h3>If table doesn't exist, run this in Supabase SQL Editor:</h3>
        <pre style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`CREATE TABLE IF NOT EXISTS knowledge_base (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  snippet TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON knowledge_base 
  FOR SELECT USING (true);

INSERT INTO knowledge_base (title, url, snippet, content) VALUES
('JavaScript', 'https://example.com/js', 'Learn JS', 'JS guide'),
('React', 'https://example.com/react', 'Learn React', 'React guide');`}
        </pre>
      </div>
    </div>
  );
}
