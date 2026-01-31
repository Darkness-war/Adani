requireAuth();

(async function () {
  const user = await getUser();
  if (!user) return;

  document.getElementById("emailText").innerText = user.email;
  document.getElementById("fullName").value =
    user.user_metadata?.full_name || "";

  document.getElementById("avatarInitial").innerText =
    (user.user_metadata?.full_name || user.email)[0].toUpperCase();

  const form = document.getElementById("profileForm");
  const msg = document.getElementById("profileMsg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.innerText = "";

    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();

    const { error } = await supabaseClient.auth.updateUser({
      data: {
        full_name: fullName,
        phone: phone
      }
    });

    if (error) {
      msg.innerText = error.message;
      msg.style.color = "red";
      return;
    }

    msg.innerText = "Profile updated successfully";
    msg.style.color = "green";
  });
})();
