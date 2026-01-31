/* =========================================================
   FILE: profile.js
   PATH: assets/js/user/profile.js

   PURPOSE:
   - Protect profile route
   - Load user profile data
   - Update full name securely
========================================================= */

(function () {
  window.requireUser().then(function (user) {
    if (!user) return;
    loadProfile(user);
  });

  async function loadProfile(user) {
    const nameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");

    nameInput.value = user.user_metadata?.full_name || "";
    emailInput.value = user.email;
  }

  const form = document.getElementById("profileForm");
  const msg = document.getElementById("profileMsg");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    msg.textContent = "";

    const fullName = document.getElementById("fullName").value.trim();

    if (!fullName) {
      msg.textContent = "Name cannot be empty";
      return;
    }

    const { error } = await window.supabaseClient.auth.updateUser({
      data: { full_name: fullName }
    });

    if (error) {
      msg.textContent = error.message || "Update failed";
      return;
    }

    msg.textContent = "Profile updated successfully";
  });
})();
