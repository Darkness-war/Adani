import { supabase } from "./supabase.js";

let CURRENT_USER = null;

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  CURRENT_USER = user;

  setupTabs();
  await setupReferralLink(user.id);
  await loadFriends(user.id);
  await loadEarnings(user.id);
  setupSearch();
});

// ---------- TABS ----------
function setupTabs() {
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tab-button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.tab;
      document
        .querySelectorAll(".tab-content")
        .forEach((sec) => sec.classList.remove("active"));
      document.getElementById(tab).classList.add("active");
    });
  });

  document.querySelectorAll(".friends-sub-tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".friends-sub-tab-button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const tab = btn.dataset.friendTab;
      document
        .querySelectorAll(".friends-tab-content")
        .forEach((sec) => sec.classList.remove("active"));
      document.getElementById(tab).classList.add("active");
    });
  });
}

// ---------- REFERRAL LINK ----------
async function setupReferralLink(userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .single();

  const code = profile?.referral_code || userId;
  const link = `${window.location.origin}/register.html?ref=${code}`;

  const linkEl = document.getElementById("referralLinkText");
  linkEl.innerText = link;

  document.getElementById("copyReferralBtn").onclick = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
      showToast("Referral link copied!");
    } else {
      const temp = document.createElement("input");
      temp.value = link;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
      showToast("Referral link copied!");
    }
  };
}

// ---------- FRIEND LIST ----------
async function loadFriends(userId) {
  // all users directly referred by me
  const { data: friends, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("referred_by", userId);

  const allList = document.getElementById("allFriendList");
  const joinedList = document.getElementById("joinedFriendList");

  allList.innerHTML = "";
  joinedList.innerHTML = "";

  if (error || !friends || friends.length === 0) {
    allList.innerHTML = `<div class="loading-state">No friends yet</div>`;
    joinedList.innerHTML = `<div class="loading-state">No joined users yet</div>`;
    return;
  }

  // check which ones have done recharges (i.e. gave me level 1 earnings)
  const { data: earnings } = await supabase
    .from("referral_earnings")
    .select("from_user_id")
    .eq("user_id", userId)
    .eq("level", 1);

  const joinedSet = new Set((earnings || []).map((e) => e.from_user_id));

  friends.forEach((f) => {
    const joined = joinedSet.has(f.id);

    const rowHtml = `
      <div class="friend-item">
        <div class="friend-info">
          <span class="friend-name">${f.full_name || "User"}</span>
          <span class="friend-phone">${f.phone || "N/A"}</span>
        </div>
        <span style="font-weight:600;color:${joined ? "green" : "gray"};">
          ${joined ? "Joined ✔" : "Pending"}
        </span>
      </div>
    `;

    allList.insertAdjacentHTML("beforeend", rowHtml);
    if (joined) joinedList.insertAdjacentHTML("beforeend", rowHtml);
  });
}

// ---------- SEARCH ----------
function setupSearch() {
  const input = document.getElementById("searchFriends");
  const allList = document.getElementById("allFriendList");

  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    allList.querySelectorAll(".friend-item").forEach((item) => {
      const name = item.querySelector(".friend-name").innerText.toLowerCase();
      const phone = item
        .querySelector(".friend-phone")
        .innerText.toLowerCase();
      item.style.display =
        name.includes(q) || phone.includes(q) ? "flex" : "none";
    });
  });
}

// ---------- EARNINGS (Total / Available / Locked) ----------
async function loadEarnings(userId) {
  const { data: rows } = await supabase
    .from("referral_earnings")
    .select("amount, status, created_at")
    .eq("user_id", userId);

  let total = 0;
  let available = 0;
  let locked = 0;

  (rows || []).forEach((r) => {
    const amt = Number(r.amount) || 0;
    total += amt;
    if (r.status === "ready") available += amt;
    else if (r.status === "locked") locked += amt;
  });

  const amounts = document.querySelectorAll(".earnings-amount");
  if (amounts[0]) amounts[0].innerText = `₹${total.toFixed(2)}`;
  if (amounts[1]) amounts[1].innerText = `₹${available.toFixed(2)}`;
  if (amounts[2]) amounts[2].innerText = `₹${locked.toFixed(2)}`;

  setupRedeemButton(userId, available);
}

// ---------- REDEEM ----------
function setupRedeemButton(userId, available) {
  const btn = document.getElementById("redeemRewardBtn");
  if (!btn) return;

  btn.onclick = async () => {
    if (available <= 0) return showToast("No redeemable balance!");

    try {
      // 1) move amount to main wallet
      const { error: rpcErr } = await supabase.rpc("increment_wallet_balance", {
        p_user_id: userId,
        p_amount: available,
      });
      if (rpcErr) throw rpcErr;

      // 2) mark all 'ready' earnings as redeemed
      await supabase
        .from("referral_earnings")
        .update({ status: "redeemed" })
        .eq("user_id", userId)
        .eq("status", "ready");

      showToast("Redeemed successfully!");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error(err);
      showToast("Redeem failed!", true);
    }
  };
}

// ---------- TOAST ----------
function showToast(msg, error = false) {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.remove("error");
  if (error) toast.classList.add("error");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
      }
