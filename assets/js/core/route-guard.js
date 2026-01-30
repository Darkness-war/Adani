/* =========================================================
   FILE: route-guard.js
   PATH: assets/js/core/route-guard.js

   PURPOSE:
   - Protect user pages
   - Protect admin pages
   - Separate user vs admin access
   - Backend (Supabase) is final authority
========================================================= */

/* =========================================================
   USER ROUTE GUARD
   Use on all normal user pages
========================================================= */

window.requireUser = async function () {
  const user = await window.getUser();

  if (!user) {
    window.location.replace("/pages/auth/login.html");
    return null;
  }

  return user;
};

/* =========================================================
   ADMIN ROUTE GUARD
   Real security enforced via Supabase RLS
========================================================= */

window.requireAdmin = async function () {
  const user = await window.getUser();

  if (!user) {
    window.location.replace("/pages/auth/login.html");
    return;
  }

  const { data, error } = await window.supabaseClient
    .from("roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error || !data || data.role !== "admin") {
    try {
      await window.supabaseClient.from("admin_logs").insert({
        user_id: user.id,
        action: "unauthorized_admin_access",
        created_at: new Date().toISOString()
      });
    } catch (e) {}

    window.location.replace("/pages/errors/403.html");
  }
};
