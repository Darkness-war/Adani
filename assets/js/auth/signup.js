/* =========================================================
   FILE: signup.js
   PATH: assets/js/auth/signup.js

   PURPOSE:
   - Handle new user registration
   - Create Supabase auth user
   - Store profile data
   - Redirect on success
========================================================= */

(function () {
  // Redirect if already logged in
  window.redirectIfLoggedIn();

  const form = document.getElementById("signupForm");
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorMsg = document.getElementById("errorMsg");

  if (!form || !fullNameInput || !emailInput || !passwordInput) {
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    errorMsg.textContent = "";

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!fullName || !email || !password) {
      errorMsg.textContent = "All fields are required";
      return;
    }

    if (password.length < 6) {
      errorMsg.textContent = "Password must be at least 6 characters";
      return;
    }

    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    const { data, error } = await window.supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      errorMsg.textContent = error.message || "Signup failed";
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
      return;
    }

    // Optional: auto-login redirect
    window.location.replace("/pages/user/dashboard.html");
  });
})();
