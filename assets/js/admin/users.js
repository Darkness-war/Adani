/* =========================================================
   FILE: users.js
   PATH: assets/js/admin/users.js

   PURPOSE:
   - Admin-only user management
   - List all users with roles
   - Backend (Supabase) is authority
========================================================= */

(function () {
  // Ensure admin access
  window.requireAdmin();

  loadUsers();

  async function loadUsers() {
    const list = document.getElementById("userList");

    const { data: profiles, error } = await window.supabaseClient
      .from("profiles")
      .select("id, email, created_at");

    if (error || !profiles || profiles.length === 0) {
      list.innerHTML = "<li>No users found</li>";
      return;
    }

    list.innerHTML = "";

    for (const user of profiles) {
      const { data: roleData } = await window.supabaseClient
        .from("roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const li = document.createElement("li");

      const left = document.createElement("div");
      left.innerHTML =
        `<div class="user-email">${user.email}</div>` +
        `<div style="font-size:12px; color:var(--color-text-muted);">
           Joined: ${new Date(user.created_at).toLocaleDateString()}
         </div>`;

      const right = document.createElement("div");
      right.className = "user-role";
      right.textContent = roleData?.role || "user";

      li.appendChild(left);
      li.appendChild(right);

      list.appendChild(li);
    }
  }
})();
