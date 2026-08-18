import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

type SupabaseRuntimeEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

let runtimeEnv: SupabaseRuntimeEnv | undefined;

export function configureSupabaseAdmin(env: SupabaseRuntimeEnv) {
  runtimeEnv = env;
  _supabaseAdmin = undefined;
}

function createSupabaseAdminClient() {
  const SUPABASE_URL =
    runtimeEnv?.SUPABASE_URL ?? process.env.SUPABASE_URL;

  const SUPABASE_SERVICE_ROLE_KEY =
    runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];

    const message =
      `Missing Supabase environment variable(s): ${missing.join(', ')}.`;

    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

let _supabaseAdmin:
  | ReturnType<typeof createSupabaseAdminClient>
  | undefined;

export const supabaseAdmin = new Proxy(
  {} as ReturnType<typeof createSupabaseAdminClient>,
  {
    get(_, prop, receiver) {
      if (!_supabaseAdmin) {
        _supabaseAdmin = createSupabaseAdminClient();
      }

      return Reflect.get(_supabaseAdmin, prop, receiver);
    },
  },
);
