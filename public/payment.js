import { db } from "./firebase.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   DOM
========================= */
const sendBtn = document.getElementById("sendBtn");
const uploadBox = document.getElementById("uploadBox");
const fileInput = document.getElementById("fileInput");
const previewImg = document.getElementById("preview");

const amountText = document.getElementById("amountText");
const priceText = document.getElementById("priceText");
const deliveryText = document.getElementById("deliveryText");
const usernameInput = document.getElementById("username");

/* =========================
   QUERY PARAMS
========================= */
const params = new URLSearchParams(location.search);
const amount = Number(params.get("amount") || 0);
const price = params.get("price") || "-";
const deliveryType = params.get("delivery") || "-";
const pricePerRobux = Number(params.get("pricePerRobux") || 0);

// Tampilkan ke UI
amountText.textContent = amount ? amount.toLocaleString("id-ID") + " Robux" : "-";
priceText.textContent = price;
deliveryText.textContent = deliveryType ? `⏱️ ${deliveryType}` : "";

// Validasi params basic
if (!amount || amount < 10 || !pricePerRobux) {
  console.warn("Invalid params:", { amount, pricePerRobux, price, deliveryType });
}

/* =========================
   PROOF HANDLING
   - Simpan sebagai DataURL (Base64)
   - Resize biar gak kegedean
========================= */
let proofDataUrl = null;
let proofMeta = null;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function resizeImageDataUrl(dataUrl, maxW = 900, maxH = 900, quality = 0.82) {
  // dataUrl bisa png/jpg. Kita output JPG biar kecil.
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const ratio = Math.min(maxW / width, maxH / height, 1);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", quality);
}

// Klik box = buka file picker
uploadBox.addEventListener("click", () => fileInput.click());

// Saat user pilih file
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  // Validasi file
  if (!file.type.startsWith("image/")) {
    alert("Bukti transfer harus gambar.");
    fileInput.value = "";
    return;
  }

  // Batasi ukuran mentah (misal 5MB) biar gak berat
  if (file.size > 5 * 1024 * 1024) {
    alert("File terlalu besar. Maks 5MB.");
    fileInput.value = "";
    return;
  }

  try {
    // baca -> resize -> set preview
    const raw = await readFileAsDataURL(file);
    const resized = await resizeImageDataUrl(raw, 900, 900, 0.82);

    proofDataUrl = resized;
    proofMeta = {
      originalName: file.name,
      originalSize: file.size,
      mimeType: "image/jpeg",
      resized: true,
      updatedAt: Date.now()
    };

    previewImg.src = resized;
    previewImg.style.display = "block";
    uploadBox.classList.add("done");
    uploadBox.firstChild.textContent = "Bukti ter-upload ✓";
  } catch (e) {
    console.error(e);
    alert("Gagal memproses gambar. Coba file lain.");
    fileInput.value = "";
  }
});

/* =========================
   SUBMIT ORDER
========================= */
sendBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();

  if (!username) return alert("Username wajib diisi");
  if (!amount || amount < 10) return alert("Data pesanan tidak valid. Kembali ke halaman sebelumnya.");
  if (!proofDataUrl) return alert("Upload bukti transfer dulu");

  sendBtn.disabled = true;

  const orderId = "RBX-" + Date.now();

  const order = {
    orderId,
    username,
    amount,
    price,
    pricePerRobux,
    deliveryType,
    status: "PENDING",
    createdAt: serverTimestamp(),

    // Bukti transfer (cepat tanpa Storage)
    proof: {
      dataUrl: proofDataUrl, // Base64 (jpeg kecil)
      meta: proofMeta
    }
  };

  try {
    await setDoc(doc(db, "orders", orderId), order);
    location.href = `process.html?orderId=${encodeURIComponent(orderId)}`;
  } catch (e) {
    console.error(e);
    alert("Gagal membuat pesanan");
    sendBtn.disabled = false;
  }
});
