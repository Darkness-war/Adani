/* =========================================================
   FILE: login.js
   PATH: assets/js/auth/login.js

   PURPOSE:
   - Handle user login
   - Validate inputs
   - Authenticate with Supabase
   - Redirect on success
========================================================= */

(function () {
  // Redirect if already logged in
  window.redirectIfLoggedIn();

  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");

  if (!form || !emailInput || !passwordInput) {
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorMsg.textContent = "";

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      errorMsg.textContent = "Email and password are required";
      return;
    }

    // Disable button during request
    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    const { error } = await window.supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      errorMsg.textContent = error.message || "Login failed";
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
      return;
    }

    // Success → dashboard
    window.location.replace("/pages/user/dashboard.html");
  });
})();
