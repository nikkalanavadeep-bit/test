const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

function initSupabase(url, key) {
  const supabaseUrl = url || process.env.SUPABASE_URL;
  const supabaseKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey && supabaseUrl.trim() && supabaseKey.trim() && !supabaseUrl.includes('your-project')) {
    try {
      supabaseClient = createClient(supabaseUrl.trim(), supabaseKey.trim(), {
        auth: {
          persistSession: false
        }
      });
      return supabaseClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err.message);
      supabaseClient = null;
      return null;
    }
  }

  supabaseClient = null;
  return null;
}

// Initial attempt
initSupabase();

function getSupabaseClient() {
  if (!supabaseClient) {
    initSupabase();
  }
  return supabaseClient;
}

function isSupabaseConfigured() {
  return Boolean(getSupabaseClient());
}

function getSupabaseStatus() {
  const isConfigured = isSupabaseConfigured();
  const rawUrl = process.env.SUPABASE_URL || '';
  let maskedUrl = null;

  if (rawUrl && rawUrl.length > 10) {
    try {
      const parsed = new URL(rawUrl);
      maskedUrl = `${parsed.protocol}//${parsed.hostname.slice(0, 8)}...${parsed.hostname.slice(-8)}`;
    } catch {
      maskedUrl = `${rawUrl.slice(0, 12)}...`;
    }
  }

  return {
    isConfigured,
    maskedUrl
  };
}

module.exports = {
  getSupabaseClient,
  isSupabaseConfigured,
  getSupabaseStatus,
  initSupabase
};
