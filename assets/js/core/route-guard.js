import { supabase } from "./supabase.js";

const protectedUserPages = [
  "/pages/user/dashboard.html",
  "/pages/user/wallet.html",
  "/pages/user/investments.html",
  "/pages/user/transactions.html",
  "/pages/user/profile.html"
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
