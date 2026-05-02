import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('Supabase URL:', supabaseUrl ? '✓ Loaded' : '✗ Missing');
console.log('Supabase Key:', supabaseKey ? '✓ Loaded' : '✗ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_PUBLISHABLE_KEY:', supabaseKey);
}

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Test connection function
export async function testConnection() {
  if (!supabase) {
    console.error('Supabase client not initialized - missing environment variables');
    return { success: false, error: 'Supabase client not initialized' };
  }

  try {
    const { data, error } = await supabase.from('knowledge_base').select('count', { count: 'exact' }).limit(1);
    if (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
    console.log('✓ Connected to Supabase');
    return { success: true };
  } catch (err) {
    console.error('Connection error:', err);
    return { success: false, error: err.message };
  }
}

