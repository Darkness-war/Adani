import { supabase } from "./supabase.js";

/* =========================
   PASSWORD TOGGLE 👁️
========================= */
function setupPasswordToggle(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const wrapper = input.closest(".password-wrapper");
  if (!wrapper) return;

  wrapper.style.position = "relative";

  const eye = document.createElement("span");
  eye.textContent = "👁️";
  eye.style.position = "absolute";
  eye.style.right = "14px";
  eye.style.top = "50%";
  eye.style.transform = "translateY(-50%)";
  eye.style.cursor = "pointer";
  eye.style.fontSize = "16px";
  eye.style.opacity = "0.6";

  eye.onclick = () => {
    input.type = input.type === "password" ? "text" : "password";
    eye.style.opacity = input.type === "text" ? "1" : "0.6";
  };

  wrapper.appendChild(eye);
}

// Register
setupPasswordToggle("password");
setupPasswordToggle("confirmPassword");

// Login
setupPasswordToggle("password");

/* =========================
   REGISTER
========================= */
const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.onclick = async () => {
    const fullName = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
      document.getElementById("confirmPassword").value;

    if (!fullName || !phone || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone
        }
      }
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "🎉 Thank you for joining Uzumaki!\n\nPlease check your email to confirm your account."
    );

    window.location.href = "login.html";
  };
}

/* =========================
   LOGIN
========================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginId").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.toLowerCase().includes("confirm")) {
        alert("Please verify your email before login.");
      } else {
        alert("Invalid email or password");
      }
      return;
    }

    window.location.href = "index.html";
  };
}

/* =========================
   FORGOT PASSWORD
========================= */

const forgotBtn = document.getElementById("forgotPasswordLink");

if (forgotBtn) {
  forgotBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginId")?.value.trim();

    if (!email) {
      alert("Please enter your email first");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://investsafe.vercel.app/reset-password.html"
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert(
      "📧 Password reset email sent!\n\nPlease check your email."
    );
  });
       }
