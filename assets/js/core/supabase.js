/* =========================================================
   FILE: supabase.js
   PATH: assets/js/core/supabase.js

   PURPOSE:
   - Single global Supabase client
   - Static HTML compatible (Vercel safe)
   - Security handled via Supabase RLS
========================================================= */

/* ================= SUPABASE CONFIG ================= */
/* PUBLIC KEYS — SAFE BY DESIGN (SECURITY VIA RLS) */

const SUPABASE_URL = "https://zrufavpxsnootmvwybye.supabase.co";
const SUPABASE_ANON_KEY =
  "sb_publishable_EvHDWxi1BcEjcv_UnycVIQ_3T-V_A5s";

/* =========================================================
   SUPABASE CLIENT INITIALIZATION
   NOTE:
   - `supabase` object is provided by CDN
   - Must be loaded BEFORE this file in HTML
========================================================= */

window.supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

/* =========================================================
   GLOBAL HELPERS (USED EVERYWHERE)
========================================================= */

/**
 * Get current session
 * @returns {object|null}
 */
window.getSession = async function () {
  const { data, error } = await window.supabaseClient.auth.getSession();
  if (error) return null;
  return data.session;
};

/**
 * Get logged in user
 * @returns {object|null}
 */
window.getUser = async function () {
  const session = await window.getSession();
  return session ? session.user : null;
};

/**
 * Global logout
 */
window.signOut = async function () {
  await window.supabaseClient.auth.signOut();
  window.location.href = "/pages/auth/login.html";
};
