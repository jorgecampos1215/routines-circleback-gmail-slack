import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase. Se activa solo cuando existen las variables de entorno
 * VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (en Vercel: Settings → Environment Variables;
 * en local: archivo .env.local). Sin ellas, la plataforma sigue funcionando con localStorage.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null
export const supabaseActivo = supabase !== null
