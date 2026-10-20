// The Supabase project that carries online rooms (Realtime broadcast and
// presence; no tables are used). Both values are public by design: the anon
// key only allows what the project's settings allow. Leave them empty to keep
// online play off; VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY override them.
export const SUPABASE={
  url:'',
  anonKey:'',
};
