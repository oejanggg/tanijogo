import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvxhlwcjazqdyuwvhkfc.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_MhoKDp4pH63P1p9iXqTJRg_JaTBI66b';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);