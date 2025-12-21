import { supabase } from "./supabase.js";

console.log("[script-mine.js] loaded");

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadUserInfo(user);
  setupButtons(user.id);
  startAutoBalanceRefresh(user.id);
});

// ---------- PROFILE + BALANCE ----------
async function loadUserInfo(user) {
  document.getElementById("profileId").innerText =
    "ID: " + user.id.slice(0, 6) + "...";
  document.getElementById("profileEmail").innerText =
    user.email || "Loading...";

  const { data: profile } = await supabase
    .from("profiles")
    .select("balance")
    .eq("id", user.id)
    .single();

  const bal = profile?.balance || 0;
  updateBalanceUI(bal);
  const wb = document.getElementById("withdrawBalance");
  if (wb) wb.innerText = `₹${bal.toFixed(2)}`;
}

function updateBalanceUI(amount) {
  const el = document.getElementById("profileBalance");
  if (el) el.innerText = `₹${Number(amount).toFixed(2)}`;
}

// ---------- AUTO REFRESH BALANCE ----------
function startAutoBalanceRefresh(userId) {
  setInterval(async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();
    updateBalanceUI(profile?.balance || 0);
  }, 5000);
}

// ---------- BUTTONS / MODALS ----------
function setupButtons(userId) {
  const withdrawBtn = document.getElementById("withdrawBtn");
  const rechargeBtn = document.getElementById("rechargeBtn");
  const txBtn = document.getElementById("transactionHistoryBtn");
  const bankBtn = document.getElementById("bankDetailsBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (rechargeBtn) {
    rechargeBtn.onclick = () => (window.location.href = "recharge.html");
  }

  if (withdrawBtn) {
    withdrawBtn.onclick = () =>
      alert("Withdrawal function will be set up in next step.");
  }

  if (bankBtn) {
    bankBtn.onclick = () =>
      alert("Bank details function will be set up later.");
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    };
  }

  if (txBtn) {
    txBtn.onclick = () => openTxModal(userId);
  }

  // modal close buttons
  const txOverlay = document.getElementById("txModalOverlay");
  const txContainer = document.getElementById("txModalContainer");
  const txClose = document.getElementById("txModalCloseBtn");

  if (txOverlay && txContainer && txClose) {
    txOverlay.onclick = closeTxModal;
    txClose.onclick = closeTxModal;
  }
}

function openTxModal(userId) {
  const overlay = document.getElementById("txModalOverlay");
  const container = document.getElementById("txModalContainer");

  if (overlay && container) {
    overlay.style.display = "block";
    container.style.display = "block";
    loadTransactions(userId);
  }
}

function closeTxModal() {
  const overlay = document.getElementById("txModalOverlay");
  const container = document.getElementById("txModalContainer");

  if (overlay && container) {
    overlay.style.display = "none";
    container.style.display = "none";
  }
}

// ---------- LOAD TRANSACTIONS ----------
async function loadTransactions(userId) {
  const content = document.getElementById("txModalContent");
  if (!content) return;

  content.innerHTML = "<p>Loading transactions...</p>";

  const { data: rows, error } = await supabase
    .from("transactions")
    .select("type, amount, status, details, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    content.innerHTML = "<p>Failed to load transactions.</p>";
    return;
  }

  if (!rows || rows.length === 0) {
    content.innerHTML = "<p>No transactions found.</p>";
    return;
  }

  const html = rows
    .map((tx) => {
      const date = new Date(tx.created_at);
      const timeStr = date.toLocaleString();
      const sign = tx.type === "Deposit" ? "+" : "-";
      const statusClass =
        tx.status === "Success"
          ? "tx-status-success"
          : tx.status === "Pending"
          ? "tx-status-pending"
          : "tx-status-failed";

      return `
        <div class="tx-item">
          <div class="tx-main">
            <span class="tx-type">${tx.type}</span>
            <span class="tx-amount">${sign}₹${Number(tx.amount).toFixed(
              2
            )}</span>
          </div>
          <div class="tx-meta">
            <span class="tx-status ${statusClass}">${tx.status}</span>
            <span class="tx-time">${timeStr}</span>
          </div>
          <div class="tx-details">${tx.details || ""}</div>
        </div>
      `;
    })
    .join("");

  content.innerHTML = html;
                                         }
