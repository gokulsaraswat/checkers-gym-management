import { createClient } from '@supabase/supabase-js';

import { appEnv, isSupabaseEnvReady } from '../app/config/env';

export const isSupabaseConfigured = isSupabaseEnvReady;

export const supabase = isSupabaseConfigured
  ? createClient(appEnv.supabaseUrl, appEnv.supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  : null;
