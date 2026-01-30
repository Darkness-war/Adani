/* =========================================================
   FILE: auth.js
   PATH: assets/js/core/auth.js

   PURPOSE:
   - Central authentication handling
   - Login / signup redirect logic
   - Session protection for user pages
   - Static HTML safe (no imports, no modules)
========================================================= */

/* =========================================================
   REQUIRE AUTHENTICATION
   Use on ALL protected pages
========================================================= */

window.requireAuth = async function () {
  const session = await window.getSession();

  if (!session) {
    window.location.replace("/pages/auth/login.html");
    return null;
  }

  return session.user;
};

/* =========================================================
   REDIRECT IF USER ALREADY LOGGED IN
   Use on login / signup pages
========================================================= */

window.redirectIfLoggedIn = async function () {
  const session = await window.getSession();

  if (session) {
    window.location.replace("/pages/user/dashboard.html");
  }
};

/* =========================================================
   GLOBAL AUTH STATE LISTENER
   Handles auto logout / token expiry
========================================================= */

window.supabaseClient.auth.onAuthStateChange(function (event) {
  if (event === "SIGNED_OUT") {
    window.location.replace("/pages/auth/login.html");
  }
});
