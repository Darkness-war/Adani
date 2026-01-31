/* =========================================================
   FILE: forgot-password.js
   PATH: assets/js/auth/forgot-password.js

   PURPOSE:
   - Handle password reset request
   - Send reset email via Supabase
   - Show success / error messages
========================================================= */

(function () {
  const form = document.getElementById("resetForm");
  const emailInput = document.getElementById("email");
  const successMsg = document.getElementById("successMsg");
  const errorMsg = document.getElementById("errorMsg");

  if (!form || !emailInput) {
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    successMsg.textContent = "";
    errorMsg.textContent = "";

    const email = emailInput.value.trim();

    if (!email) {
      errorMsg.textContent = "Email is required";
      return;
    }

    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    const { error } =
      await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/pages/auth/login.html"
      });

    if (error) {
      errorMsg.textContent = error.message || "Failed to send reset email";
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Reset Link";
      return;
    }

    successMsg.textContent =
      "Password reset link sent. Please check your email.";
    submitBtn.textContent = "Email Sent";
  });
})();
