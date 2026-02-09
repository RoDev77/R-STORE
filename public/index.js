/* ===== IMPORT (WAJIB PALING ATAS) ===== */
import { db } from './firebase.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ===== GLOBAL CONFIG ===== */
let PRICE_PER_ROBUX = 115;
let CURRENT_STOCK = 0;
let MAX_STOCK = 100000;

let CURRENT_PO = 0;   // total PO yang sudah masuk (dari firestore)
let PO_LIMIT = 0;     // batas maksimal PO (dari firestore)

/* ===== CACHE DOM ELEMENTS ===== */
const elements = {
  loadingScreen: null,
  progressFill: null,
  progressText: null,

  robuxInput: null,
  pricePerRobuxInput: null,
  totalPrice: null,

  deliveryInfo: null,
  deliveryBadge: null,

  stockAlert: null,
  stockIcon: null,
  stockTitle: null,
  stockDesc: null,
  stockBadge: null,
  stockNumber: null,
  stockMax: null,
  stockProgressFill: null,

  detailRobux: null,
  detailRate: null,
  detailTotal: null,

  btnBuy: null,
};

/* ===== LOADING SCREEN ANIMATION ===== */
function initLoadingScreen() {
  let progress = 0;
  const baseInc = Math.random() * 3 + 2;

  const interval = setInterval(() => {
    progress += baseInc + Math.random() * 2;

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      setTimeout(() => {
        elements.loadingScreen?.classList.add('hidden');
        setTimeout(() => elements.loadingScreen?.remove(), 800);
      }, 500);
    }

    if (elements.progressFill && elements.progressText) {
      elements.progressFill.style.width = `${progress}%`;
      elements.progressText.textContent = `${Math.floor(progress)}%`;
    }
  }, 200);
}

/* ===== ANIMATE NUMBER ===== */
function animateNumber(element, target, duration = 500) {
  if (!element) return;
  const start = parseInt(String(element.textContent).replace(/\D/g, '')) || 0;
  const frames = Math.max(1, Math.floor(duration / 16));
  const increment = (target - start) / frames;

  let current = start;
  let count = 0;

  const timer = setInterval(() => {
    count++;
    current += increment;

    if (count >= frames) {
      current = target;
      clearInterval(timer);
    }

    element.textContent = Math.floor(current).toLocaleString('id-ID');
  }, 16);
}

/* ===== HITUNG DELIVERY + VALIDASI PO ===== */
function computeDelivery(robux) {
  const want = Number(robux) || 0;

  const instant = Math.max(0, Math.min(want, CURRENT_STOCK));
  const po = Math.max(0, want - instant);

  // Jika PO_LIMIT = 0 artinya PO dimatikan (atau belum diset)
  const poEnabled = PO_LIMIT > 0;

  // Sisa kuota PO
  const poRemaining = poEnabled ? Math.max(0, PO_LIMIT - CURRENT_PO) : 0;

  // Kalau butuh PO, cek kuota
  const poOk = (po === 0) || (poEnabled && po <= poRemaining);

  return {
    instant,
    po,
    poEnabled,
    poRemaining,
    poOk,
    deliveryText:
      (want <= 0)
        ? '⚡ Pengiriman Instant'
        : (po === 0)
          ? '⚡ Pengiriman Instant'
          : (instant > 0)
            ? `⚡ ${instant.toLocaleString('id-ID')} Instant + 📦 ${po.toLocaleString('id-ID')} PO`
            : '📦 Pre-Order 15 hari kerja',
  };
}

/* ===== UPDATE STOCK UI ===== */
function updateStockUI() {
  if (!elements.stockNumber || !elements.stockProgressFill || !elements.stockAlert) return;

  animateNumber(elements.stockNumber, CURRENT_STOCK);

  if (elements.stockMax) {
    elements.stockMax.textContent = MAX_STOCK.toLocaleString('id-ID');
  }

  const safeMax = Math.max(1, Number(MAX_STOCK) || 1);
  const stockPercentage = Math.min((CURRENT_STOCK / safeMax) * 100, 100);
  elements.stockProgressFill.style.width = `${stockPercentage}%`;

  let statusIconPath = `
    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  `;
  let badgeText = 'TERSEDIA';

  if (CURRENT_STOCK <= 0) {
    statusIconPath = `
      <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
    badgeText = 'HABIS';
  } else if (CURRENT_STOCK < safeMax * 0.3) {
    statusIconPath = `
      <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    `;
    badgeText = 'TERBATAS';
  }

  // amanin query svg
  const svg = elements.stockIcon?.querySelector?.('svg');
  if (svg) svg.innerHTML = statusIconPath;
  if (elements.stockBadge) elements.stockBadge.textContent = badgeText;

  console.log(`📊 Stock UI updated: ${CURRENT_STOCK} / ${MAX_STOCK} (${stockPercentage.toFixed(1)}%)`);
}

/* ===== UPDATE MAIN UI ===== */
function updateUI() {
  if (!elements.robuxInput) return;

  const robux = Number(elements.robuxInput.value) || 0;
  const total = robux * PRICE_PER_ROBUX;

  // Update prices
  if (elements.totalPrice) elements.totalPrice.textContent = `Rp ${total.toLocaleString('id-ID')}`;
  if (elements.pricePerRobuxInput) elements.pricePerRobuxInput.value = `Rp ${PRICE_PER_ROBUX.toLocaleString('id-ID')}`;

  // Update order details
  if (elements.detailRobux) elements.detailRobux.textContent = robux.toLocaleString('id-ID');
  if (elements.detailRate) elements.detailRate.textContent = `Rp ${PRICE_PER_ROBUX.toLocaleString('id-ID')}`;
  if (elements.detailTotal) elements.detailTotal.textContent = `Rp ${total.toLocaleString('id-ID')}`;

  // Delivery logic
  const info = computeDelivery(robux);

  // Teks badge delivery
  if (elements.deliveryInfo) elements.deliveryInfo.textContent = info.deliveryText;

  // Stock alert state (UI)
  if (elements.stockAlert && elements.stockTitle && elements.stockDesc) {
    let alertClass = 'stock-alert available';
    let titleText = 'Stock Tersedia';
    let descText = 'Pengiriman instant tersedia';

    if (robux > 0 && info.po > 0) {
      // butuh PO
      if (!info.poOk) {
        alertClass = 'stock-alert out';
        titleText = 'PO Penuh';
        descText = `Kuota PO habis. Sisa kuota PO: ${info.poRemaining.toLocaleString('id-ID')}`;
      } else if (info.instant > 0) {
        alertClass = 'stock-alert low';
        titleText = 'Stock Terbatas';
        descText = `Sebagian instant, sisanya PO (sisa kuota PO: ${info.poRemaining.toLocaleString('id-ID')})`;
      } else {
        alertClass = 'stock-alert out';
        titleText = 'Pre-Order';
        descText = `Stock habis – pesanan masuk PO (sisa kuota PO: ${info.poRemaining.toLocaleString('id-ID')})`;
      }
    } else if (CURRENT_STOCK <= 0) {
      // input 0 atau user belum isi, tapi stock habis
      alertClass = 'stock-alert out';
      titleText = 'Stock Habis';
      descText = (PO_LIMIT > 0)
        ? `Bisa PO (sisa kuota PO: ${Math.max(0, PO_LIMIT - CURRENT_PO).toLocaleString('id-ID')})`
        : 'Saat ini stock habis';
    }

    elements.stockAlert.className = alertClass;
    elements.stockTitle.textContent = titleText;
    elements.stockDesc.textContent = descText;
  }

  // Disable tombol jika PO tidak memungkinkan
  if (elements.btnBuy) {
    const shouldDisable = robux > 0 && !info.poOk;
    elements.btnBuy.disabled = shouldDisable;
    elements.btnBuy.style.opacity = shouldDisable ? '0.6' : '1';
    elements.btnBuy.style.cursor = shouldDisable ? 'not-allowed' : 'pointer';
  }
}

/* ===== FIRESTORE REALTIME LISTENER ===== */
function initFirestoreListener() {
  const configRef = doc(db, "config", "robux");
  console.log('🔄 Setting up Firestore listener...');

  onSnapshot(configRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn('⚠️ Config document tidak ditemukan');
      return;
    }

    const data = snapshot.data();

    PRICE_PER_ROBUX = Number(data.pricePerRobux ?? 115);
    CURRENT_STOCK = Number(data.currentStock ?? 0);
    MAX_STOCK = Number(data.maxStock ?? 100000);

    CURRENT_PO = Number(data.currentPO ?? 0);
    PO_LIMIT = Number(data.poLimit ?? 0);

    console.log('✅ Config updated:', {
      PRICE_PER_ROBUX,
      CURRENT_STOCK,
      MAX_STOCK,
      CURRENT_PO,
      PO_LIMIT
    });

    updateStockUI();
    updateUI();
  }, (error) => {
    console.error('❌ Firestore error:', error.message);
  });
}

/* ===== SUBMIT ORDER ===== */
function submitOrder() {
  const robux = Number(elements.robuxInput?.value);

  if (!robux || robux < 10) {
    alert('❌ Minimal pembelian 10 Robux');
    elements.robuxInput?.focus?.();
    return;
  }

  if (robux > 1000000) {
    alert('❌ Maksimal pembelian 1,000,000 Robux');
    return;
  }

  const info = computeDelivery(robux);
  if (!info.poOk) {
    alert(`❌ Kuota PO penuh. Sisa kuota PO: ${info.poRemaining.toLocaleString('id-ID')}`);
    return;
  }

  const total = robux * PRICE_PER_ROBUX;

  const params = new URLSearchParams({
    amount: String(robux),
    price: `Rp ${total.toLocaleString('id-ID')}`,
    delivery: info.deliveryText,
    pricePerRobux: String(PRICE_PER_ROBUX),
  });

  window.location.href = `payment.html?${params.toString()}`;
}

/* ===== INITIALIZE APP ===== */
function init() {
  console.log('🚀 Initializing R STORE...');

  // Cache elements
  elements.loadingScreen = document.getElementById('loadingScreen');
  elements.progressFill = document.getElementById('progressBarFill');
  elements.progressText = document.getElementById('progressPercent');

  elements.robuxInput = document.getElementById('robuxInput');
  elements.pricePerRobuxInput = document.getElementById('pricePerRobuxInput');
  elements.totalPrice = document.getElementById('totalPrice');

  elements.deliveryInfo = document.getElementById('deliveryInfo');
  elements.deliveryBadge = document.getElementById('deliveryBadge');

  elements.stockAlert = document.getElementById('stockAlert');
  elements.stockIcon = document.getElementById('stockIcon');
  elements.stockTitle = document.getElementById('stockTitle');
  elements.stockDesc = document.getElementById('stockDesc');
  elements.stockBadge = document.getElementById('stockBadge');
  elements.stockNumber = document.getElementById('stockNumber');
  elements.stockMax = document.getElementById('stockMax');
  elements.stockProgressFill = document.getElementById('stockProgressFill');

  elements.detailRobux = document.getElementById('detailRobux');
  elements.detailRate = document.getElementById('detailRate');
  elements.detailTotal = document.getElementById('detailTotal');

  elements.btnBuy = document.getElementById('btnBuy');

  initLoadingScreen();

  if (elements.robuxInput) {
    elements.robuxInput.addEventListener('input', updateUI);
    elements.robuxInput.addEventListener('keydown', (e) => {
      if (e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
    });
  }

  // Tombol beli (tanpa inline onclick)
  if (elements.btnBuy) {
    elements.btnBuy.addEventListener('click', submitOrder);
  }

  initFirestoreListener();

  updateUI();
  console.log('✅ App initialized successfully');
}

document.addEventListener('DOMContentLoaded', init);

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateUI();
});
