import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Recharge script loaded");

  // Quick amount buttons
  document.querySelectorAll(".quick-amount-btn, .quick-amount").forEach(btn => {
    btn.addEventListener("click", () => {
      const amount =
        btn.getAttribute("data-amount") ||
        btn.innerText.replace("₹", "").trim();
      document.getElementById("rechargeAmount").value = amount;
    });
  });

  const rechargeBtn = document.getElementById("proceedRecharge");
  if (!rechargeBtn) return;

  rechargeBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const amountInput = document.getElementById("rechargeAmount");
    const amount = parseInt(amountInput.value);

    if (!amount || amount < 120 || amount > 50000) {
      alert("Amount must be between ₹120 and ₹50,000");
      return;
    }

    rechargeBtn.disabled = true;
    rechargeBtn.textContent = "Redirecting…";

    try {
      // 1️⃣ Get logged-in user
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        alert("Please login first");
        window.location.href = "login.html";
        return;
      }

      const user = authData.user;

      // 2️⃣ Generate order ID
      const orderId = "ORD" + Date.now() + Math.floor(Math.random() * 10000);

      // 3️⃣ Get mobile number
      let mobile = localStorage.getItem("userMobile");
      if (!mobile || mobile.length < 10) {
        mobile = prompt("Enter your 10-digit mobile number");
        if (!mobile || mobile.length < 10) {
          alert("Valid mobile number required");
          rechargeBtn.disabled = false;
          rechargeBtn.textContent = "Proceed to Recharge";
          return;
        }
        localStorage.setItem("userMobile", mobile);
      }

      // 4️⃣ Insert payment request (PENDING)
      const { error: payErr } = await supabase
        .from("payment_requests")
        .insert({
          user_id: user.id,
          order_id: orderId,
          amount: amount,
          status: "PENDING",
          payment_method: "Pay0",
          created_at: new Date().toISOString(),
        });

      if (payErr) {
        throw new Error("Payment request failed: " + payErr.message);
      }

      // 5️⃣ Insert transaction (PENDING)
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "Deposit",
        amount: amount,
        status: "PENDING",
        reference_id: orderId,
        details: "Pay0 recharge initiated",
        created_at: new Date().toISOString(),
      });

      // 6️⃣ Call backend → Pay0 create order
      const response = await fetch("/api/pay0-create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          amount: amount,
          user_id: user.id,
          customer_mobile: mobile,
          customer_name: user.email,
        }),
      });

      const result = await response.json();

      // 🔥 FIXED HERE (paymentUrl, not payment_url)
      if (!response.ok || !result.ok || !result.paymentUrl) {
        throw new Error("Payment gateway unavailable");
      }

      // ✅ Redirect to Pay0
      window.location.href = result.paymentUrl;

    } catch (err) {
      console.error("Recharge error:", err);
      alert("Payment gateway temporarily unavailable. Please try again.");
      rechargeBtn.disabled = false;
      rechargeBtn.textContent = "Proceed to Recharge";
    }
  });

  // 🔁 Verify payment when user returns
  checkPaymentReturn();
});

// =======================
// VERIFY PAYMENT ON RETURN
// =======================
async function checkPaymentReturn() {
  try {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    if (!orderId) return;

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    const { data } = await supabase.auth.getUser();
    if (!data?.user) return;

    const res = await fetch("/api/pay0-check-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        user_id: data.user.id,
      }),
    });

    const result = await res.json();

    if (result.ok) {
      alert(`✅ Payment successful!\n₹${result.amount} added to wallet`);
      window.location.reload();
    } else {
      alert("❌ Payment failed or pending");
    }
  } catch (err) {
    console.warn("Payment verification error:", err);
  }
}
