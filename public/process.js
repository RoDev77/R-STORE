/* ===============================
   FIREBASE
================================ */
import { db } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===============================
   ELEMENT
================================ */
const icon = document.getElementById("icon");
const title = document.getElementById("title");
const msg = document.getElementById("msg");
const detail = document.getElementById("detail");
const btn = document.getElementById("btn");

const oid = document.getElementById("oid");
const user = document.getElementById("user");
const rbx = document.getElementById("rbx");
const price = document.getElementById("price");
const statusEl = document.getElementById("status");

// optional (kalau kamu tambahin di HTML)
const deliveryEl = document.getElementById("delivery");
const rateEl = document.getElementById("rate");

// optional proof
const proofWrap = document.getElementById("proofWrap");
const proofImg = document.getElementById("proofImg");

/* ===============================
   GET ORDER ID
================================ */
const params = new URLSearchParams(location.search);
const orderId = params.get("orderId");

function setNotFound(reason = "Order ID tidak valid") {
  title.textContent = "Order Tidak Ditemukan";
  msg.textContent = reason;
  icon.textContent = "❌";
  btn.style.display = "block";
}

if (!orderId) {
  setNotFound("Order ID tidak ada di URL");
  throw new Error("NO ORDER ID");
}

/* ===============================
   HELPERS
================================ */
function safeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function setStatusUI(status) {
  const s = String(status || "PENDING").toUpperCase();

  if (s === "PENDING") {
    icon.textContent = "⏳";
    title.textContent = "Menunggu Konfirmasi";
    msg.textContent = "Pesanan kamu sedang dicek admin";
    btn.style.display = "none";
  } else if (s === "PROCESSING") {
    icon.textContent = "⚡";
    title.textContent = "Sedang Diproses";
    msg.textContent = "Robux sedang dikirim";
    btn.style.display = "none";
  } else if (s === "SUCCESS") {
    icon.textContent = "✅";
    title.textContent = "Pesanan Berhasil";
    msg.textContent = "Robux berhasil dikirim";
    btn.style.display = "block";
  } else if (s === "FAILED") {
    icon.textContent = "❌";
    title.textContent = "Pesanan Gagal";
    msg.textContent = "Silakan hubungi admin";
    btn.style.display = "block";
  } else {
    // status tak dikenal
    icon.textContent = "ℹ️";
    title.textContent = "Status Diperbarui";
    msg.textContent = `Status: ${s}`;
    btn.style.display = "block";
  }

  return s;
}

/* ===============================
   FIRESTORE LISTENER
================================ */
const orderRef = doc(db, "orders", orderId);

onSnapshot(
  orderRef,
  (snap) => {
    if (!snap.exists()) {
      setNotFound("Data pesanan tidak ada");
      return;
    }

    const d = snap.data() || {};

    // Basic fields
    const amount = safeNumber(d.amount, 0);
    const rate = safeNumber(d.pricePerRobux, 0);

    oid.textContent = d.orderId || orderId;
    user.textContent = d.username || "-";
    rbx.textContent = amount ? amount.toLocaleString("id-ID") : "-";
    price.textContent = d.price || "-";

    const finalStatus = setStatusUI(d.status);
    statusEl.textContent = finalStatus;

    // Optional UI fields
    if (deliveryEl) deliveryEl.textContent = d.deliveryType || "-";
    if (rateEl) rateEl.textContent = rate ? `Rp ${rate.toLocaleString("id-ID")}` : "-";

    // Optional proof display (kalau pakai Base64)
    const proofUrl = d?.proof?.dataUrl;
    if (proofWrap && proofImg) {
      if (typeof proofUrl === "string" && proofUrl.startsWith("data:image/")) {
        proofImg.src = proofUrl;
        proofWrap.style.display = "block";
      } else {
        proofWrap.style.display = "none";
      }
    }

    detail.style.display = "block";
  },
  (err) => {
    console.error("❌ onSnapshot error:", err);
    setNotFound("Gagal memuat data. Coba refresh.");
  }
);
