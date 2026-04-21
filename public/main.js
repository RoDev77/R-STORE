import { db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from './firebase-config.js';

// DOM Elements
const loadingScreen = document.getElementById('loadingScreen');
const robuxInput = document.getElementById('robuxInput');
const totalPrice = document.getElementById('totalPrice');
const pricePerRobuxInput = document.getElementById('pricePerRobux');
const deliveryInfo = document.getElementById('deliveryInfo');
const stockAlert = document.getElementById('stockAlert');
const stockTitle = document.getElementById('stockTitle');
const stockDesc = document.getElementById('stockDesc');
const stockReady = document.getElementById('stockReady');
const poAvailable = document.getElementById('poAvailable');
const btnBuy = document.getElementById('btnBuy');
const robuxError = document.getElementById('robuxError');
const detailRobux = document.getElementById('detailRobux');
const detailRate = document.getElementById('detailRate');
const detailTotal = document.getElementById('detailTotal');

// Config variables
let PRICE_PER_ROBUX = 115;
let CURRENT_STOCK = 0;
let CURRENT_PO = 0;
let PO_LIMIT = 0;

const CONFIG_ID = 'storeSettings';

function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

async function loadConfig() {
  try {
    const configRef = doc(db, 'config', CONFIG_ID);
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const data = configSnap.data();
      PRICE_PER_ROBUX = data.pricePerRobux || 115;
      CURRENT_STOCK = data.currentStock || 0;
      CURRENT_PO = data.currentPO || 0;
      PO_LIMIT = data.poLimit || 0;
    } else {
      // Default values if config not exists
      PRICE_PER_ROBUX = 115;
      CURRENT_STOCK = 10000;
      CURRENT_PO = 5000;
      PO_LIMIT = 5000;
    }
    
    // Update UI
    pricePerRobuxInput.value = 'Rp ' + formatNumber(PRICE_PER_ROBUX);
    updateStockDisplay();
    updateUI();
    
    // Hide loading screen
    loadingScreen.style.display = 'none';
    
    console.log('✅ Config loaded');
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    loadingScreen.style.display = 'none';
  }
}

function updateStockDisplay() {
  stockReady.textContent = formatNumber(CURRENT_STOCK);
  poAvailable.textContent = formatNumber(CURRENT_PO);
}

function updateUI() {
  const robux = Number(robuxInput.value || 0);
  const total = robux * PRICE_PER_ROBUX;
  
  totalPrice.textContent = 'Rp ' + formatNumber(total);
  detailRobux.textContent = formatNumber(robux);
  detailRate.textContent = 'Rp ' + formatNumber(PRICE_PER_ROBUX);
  detailTotal.textContent = 'Rp ' + formatNumber(total);
  
  robuxError.classList.remove('show');
  
  if (robux < 10) {
    btnBuy.disabled = true;
    if (robux > 0) {
      robuxError.classList.add('show');
    }
  } else {
    btnBuy.disabled = false;
  }
  
  const maxAvailable = CURRENT_STOCK + CURRENT_PO;
  
  if (CURRENT_STOCK <= 0) {
    if (robux <= CURRENT_PO) {
      deliveryInfo.textContent = '📦 Pre-Order (15 hari kerja)';
      stockAlert.className = 'stock-alert out';
      stockTitle.textContent = '📦 Pre-Order Mode';
      stockDesc.textContent = `Stock habis – Sisa PO: ${formatNumber(CURRENT_PO)} Robux`;
    } else if (robux > 0) {
      deliveryInfo.textContent = '❌ Melebihi kapasitas PO';
      stockAlert.className = 'stock-alert out';
      stockTitle.textContent = '❌ Tidak Tersedia';
      stockDesc.textContent = `Maksimal PO: ${formatNumber(CURRENT_PO)} Robux`;
      btnBuy.disabled = true;
    }
  } else if (robux > CURRENT_STOCK) {
    const instantPart = CURRENT_STOCK;
    const poPart = robux - CURRENT_STOCK;
    
    if (poPart <= CURRENT_PO) {
      deliveryInfo.textContent = `⚡ ${formatNumber(instantPart)} Instant + 📦 ${formatNumber(poPart)} PO`;
      stockAlert.className = 'stock-alert low';
      stockTitle.textContent = '⚠️ Stock Terbatas';
      stockDesc.textContent = `${formatNumber(CURRENT_STOCK)} instant tersisa, sisanya PO`;
    } else {
      deliveryInfo.textContent = '❌ Melebihi kapasitas';
      stockAlert.className = 'stock-alert out';
      stockTitle.textContent = '❌ Tidak Tersedia';
      stockDesc.textContent = `Maksimal: ${formatNumber(maxAvailable)} Robux`;
      btnBuy.disabled = true;
    }
  } else {
    deliveryInfo.textContent = '⚡ Pengiriman Instant';
    stockAlert.className = 'stock-alert available';
    stockTitle.textContent = '✅ Stock Tersedia';
    stockDesc.textContent = `${formatNumber(CURRENT_STOCK)} Robux ready untuk pengiriman instant`;
  }
}

// Fungsi untuk generate Order ID format RBX-xxxxxxxxxx
function generateOrderId() {
  const randomNum = Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
  return `RBX-${randomNum}`;
}

async function submitOrder() {
  const robux = Number(robuxInput.value);
  
  if (robux < 10) {
    alert('❌ Minimal pembelian 10 Robux');
    return;
  }
  
  const total = robux * PRICE_PER_ROBUX;
  const maxAvailable = CURRENT_STOCK + CURRENT_PO;
  
  if (robux > maxAvailable) {
    alert(`❌ Maksimal pembelian saat ini: ${formatNumber(maxAvailable)} Robux`);
    return;
  }
  
  // Generate custom Order ID
  const orderId = generateOrderId();
  
  // Cek apakah ID sudah ada (untuk menghindari duplikasi)
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (orderSnap.exists()) {
    // Jika kebetulan duplikat, generate ulang
    return submitOrder(); // Rekursif generate ulang
  }
  
  // 🔥 HITUNG WAKTU KADALUARSA: 2 JAM DARI SEKARANG
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + 2); // +2 jam
  
  // Create order dengan custom ID
  const orderData = {
    robuxAmount: robux,
    totalPrice: total,
    deliveryInfo: deliveryInfo.textContent,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: expireAt  // 🔥 TAMBAHKAN INI UNTUK TTL
  };
  
  try {
    await setDoc(orderRef, orderData);
    // Redirect ke payment page dengan orderId custom
    window.location.href = `payment.html?orderId=${orderId}`;
  } catch (error) {
    console.error('Error creating order:', error);
    alert('Gagal membuat pesanan. Silakan coba lagi.');
  }
}

robuxInput.addEventListener('input', updateUI);
btnBuy.addEventListener('click', submitOrder);

// Auto-refresh config every 30 seconds
setInterval(() => {
  loadConfig();
}, 30000);

loadConfig();