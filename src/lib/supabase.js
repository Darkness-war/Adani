import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions matching original logic
export const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('uid');
  window.location.href = '/login';
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
