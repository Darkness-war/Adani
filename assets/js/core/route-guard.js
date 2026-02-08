import { supabase } from "./supabase.js";

if (!profile?.is_admin) {
        window.location.href = '/pages/user/dashboard.html';
        return false;
];

const protectedAdminPages = [
  "/pages/admin/admin-dashboard.html",
  "/pages/admin/users.html",
  "/pages/admin/investments.html",
  "/pages/admin/withdrawals.html",
  "/pages/admin/logs.html"
];

const currentPath = window.location.pathname;

const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  if (
    protectedUserPages.includes(currentPath) ||
    protectedAdminPages.includes(currentPath)
  ) {
    window.location.replace("/pages/auth/login.html");
  }
}
