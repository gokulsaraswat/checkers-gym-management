const env = {
  supabaseUrl: process.env.REACT_APP_SUPABASE_URL || '',
  supabaseKey: process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || '',
  rapidApiKey: process.env.REACT_APP_RAPID_API_KEY || '',
};

export const appEnv = env;
export const isSupabaseEnvReady = Boolean(env.supabaseUrl && env.supabaseKey);
export const isRapidApiEnvReady = Boolean(env.rapidApiKey);
