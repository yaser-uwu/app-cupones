/**
 * Script one-shot: crea perfiles faltantes en Supabase.
 * Ejecutar: node scripts/backfill-profiles.mjs
 */
import { createClient } from '../frontend/node_modules/@supabase/supabase-js/dist/index.mjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../backend/.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: { users }, error } = await supabase.auth.admin.listUsers();
if (error) {
  console.error('Error listando usuarios:', error.message);
  process.exit(1);
}

console.log(`Usuarios encontrados: ${users.length}`);

for (const user of users) {
  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      display_name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.email?.split('@')[0] ??
        'Usuario',
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id' },
  );

  if (upsertError) {
    console.error(`Error en ${user.email}:`, upsertError.message);
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('invite_code')
      .eq('id', user.id)
      .single();
    console.log(`OK ${user.email} -> codigo: ${profile?.invite_code}`);
  }
}

console.log('Listo.');
