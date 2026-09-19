import { createServerClient } from '@supabase/ssr';
import type { Database } from './types';

export function createServerSupabaseClient(request: Request) {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  return createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') || '';
          return cookieHeader.split(';').map(c => {
            const [name, ...rest] = c.split('=');
            return {
              name: name.trim(),
              value: rest.join('=').trim()
            };
          });
        },
        setAll() {
          // This client is used in beforeLoad (read-only context).
          // Cookies are set by the browser client during login.
        }
      },
    }
  );
}
