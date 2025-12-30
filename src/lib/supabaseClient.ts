import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. Supabase client will use a fallback that returns errors. Fill .env.local and restart dev server.');
}

// If envs are present, create a real client. Otherwise export a fallback that fails gracefully.
let supabaseClient: SupabaseClient | any;
if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Minimal fallback with the auth methods used by the app.
  supabaseClient = {
    auth: {
      async getSession() {
        return { data: { session: null } };
      },
      async signInWithPassword() {
        return { error: { message: 'Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and restart.' } };
      },
      async resetPasswordForEmail() {
        return { error: { message: 'Supabase not configured.' } };
      },
      async signOut() {
        return { error: { message: 'Supabase not configured.' } };
      }
    }
  };
}

export const supabase = supabaseClient;
