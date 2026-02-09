// track.js
function $(id) {
  return document.getElementById(id);
}

const orderIdInput = $("orderIdInput");
const searchBtn = $("searchBtn");

const loading = $("loading");
const noResult = $("noResult");
const orderResult = $("orderResult");

const statusBadge = $("statusBadge");
const statusTitle = $("statusTitle");
const statusMessage = $("statusMessage");

const detailOrderId = $("detailOrderId");
const detailUsername = $("detailUsername");
const detailRobux = $("detailRobux");
const detailAmount = $("detailAmount");
const detailDelivery = $("detailDelivery");
const detailTime = $("detailTime");

const icon1 = $("icon1");
const icon2 = $("icon2");
const icon3 = $("icon3");
const icon4 = $("icon4");

const time1 = $("time1");
const time2 = $("time2");
const time3 = $("time3");
const time4 = $("time4");

function show(el, on) {
  el.classList.toggle("show", !!on);
}

function normalizeOrderId(raw) {
  const s = String(raw || "").trim();
  // Biar user bisa masukin "RBX-..." atau "rbx-..."
  return s.toUpperCase();
}

// Firestore Timestamp dari API bisa bentuk macam-macam
function toDate(ts) {
  if (!ts) return null;

  // Jika sudah ISO string
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }

  // Firestore Timestamp JSON (admin SDK) kadang { _seconds, _nanoseconds }
  const sec = ts.seconds ?? ts._seconds;
  const nano = ts.nanoseconds ?? ts._nanoseconds ?? 0;

  if (typeof sec === "number") {
    return new Date(sec * 1000 + Math.floor(nano / 1e6));
  }

  // fallback
  try {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function formatID(date) {
  if (!date) return "-";
  return date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function setTimeline(status, createdAt, timeline = {}) {
  // reset inactive
  [icon1, icon2, icon3, icon4].forEach((i) => i.classList.add("inactive"));
  time1.textContent = "-";
  time2.textContent = "-";
  time3.textContent = "-";
  time4.textContent = "-";

  // Step 1: created (selalu ada kalau order ada)
  icon1.classList.remove("inactive");
  time1.textContent = formatID(createdAt);

  const s = String(status || "PENDING").toUpperCase();

  // Kalau kamu punya field timeline di dokumen, akan dipakai.
  const verifiedAt = toDate(timeline.verifiedAt);
  const processingAt = toDate(timeline.processingAt);
  const successAt = toDate(timeline.successAt);

  if (verifiedAt) {
    icon2.classList.remove("inactive");
    time2.textContent = formatID(verifiedAt);
  }

  if (processingAt) {
    icon3.classList.remove("inactive");
    time3.textContent = formatID(processingAt);
  }

  if (successAt) {
    icon4.classList.remove("inactive");
    time4.textContent = formatID(successAt);
  }

  // Fallback timeline berdasarkan status jika timeline belum kamu simpan
  if (!verifiedAt && (s === "PENDING" || s === "PROCESSING" || s === "SUCCESS" || s === "FAILED")) {
    icon2.classList.remove("inactive");
    time2.textContent = "-";
  }
  if (!processingAt && (s === "PROCESSING" || s === "SUCCESS")) {
    icon3.classList.remove("inactive");
    time3.textContent = "-";
  }
  if (!successAt && s === "SUCCESS") {
    icon4.classList.remove("inactive");
    time4.textContent = "-";
  }
}

function setStatusUI(order) {
  const s = String(order.status || "PENDING").toUpperCase();

  if (s === "PENDING") {
    statusBadge.className = "status-badge status-pending";
    statusBadge.textContent = "PENDING";
    statusTitle.textContent = "Menunggu Verifikasi";
    statusMessage.textContent = "Pesanan Anda sedang dicek admin. Mohon tunggu 1–24 jam.";
  } else if (s === "PROCESSING") {
    statusBadge.className = "status-badge status-processing";
    statusBadge.textContent = "PROCESSING";
    statusTitle.textContent = "Sedang Diproses";
    statusMessage.textContent = "Pembayaran sudah diverifikasi. Robux sedang diproses untuk dikirim.";
  } else if (s === "SUCCESS") {
    statusBadge.className = "status-badge status-completed";
    statusBadge.textContent = "SUCCESS";
    statusTitle.textContent = "Pesanan Selesai";
    statusMessage.textContent = `Robux berhasil dikirim ke akun ${order.username || "-"}.`;
  } else if (s === "FAILED") {
    statusBadge.className = "status-badge status-rejected";
    statusBadge.textContent = "FAILED";
    statusTitle.textContent = "Pesanan Gagal";
    statusMessage.textContent = "Pesanan gagal / ditolak. Silakan hubungi admin.";
  } else {
    statusBadge.className = "status-badge";
    statusBadge.textContent = s;
    statusTitle.textContent = "Status Diperbarui";
    statusMessage.textContent = `Status: ${s}`;
  }

  return s;
}

function displayOrder(order) {
  show(orderResult, true);
  show(noResult, false);

  const createdAt = toDate(order.createdAt) || toDate(order.timestamp);

  detailOrderId.textContent = order.orderId || "-";
  detailUsername.textContent = order.username || "-";
  detailRobux.textContent = (Number(order.amount) || 0).toLocaleString("id-ID") + " Robux";
  detailAmount.textContent = order.price || "-";
  detailDelivery.textContent = order.deliveryType || "-";
  detailTime.textContent = formatID(createdAt);

  const st = setStatusUI(order);
  setTimeline(st, createdAt, order.timeline || {});
}

async function searchOrder() {
  const id = normalizeOrderId(orderIdInput.value);
  if (!id) {
    alert("❌ Masukkan Order ID terlebih dahulu!");
    return;
  }

  show(loading, true);
  show(orderResult, false);
  show(noResult, false);

  try {
    const res = await fetch(`/api/order?id=${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store"
    });

    show(loading, false);

    if (!res.ok) {
      show(noResult, true);
      return;
    }

    const data = await res.json();
    displayOrder(data);
  } catch (err) {
    console.error(err);
    show(loading, false);
    show(noResult, true);
  }
}

// events
searchBtn.addEventListener("click", searchOrder);
orderIdInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchOrder();
});

// Optional: auto-fill kalau URL punya ?id=RBX-...
const urlParams = new URLSearchParams(location.search);
const prefill = urlParams.get("id");
if (prefill) {
  orderIdInput.value = prefill;
  searchOrder();
}
