import { db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from './firebase-config.js';

// DOM Elements - dengan pengecekan
const getElement = (id) => {
  const el = document.getElementById(id);
  if (!el) console.warn(`⚠️ Element dengan id "${id}" tidak ditemukan di halaman ini`);
  return el;
};

const loadingScreen = getElement('loadingScreen');
const robuxInput = getElement('robuxInput');
const totalPrice = getElement('totalPrice');
const pricePerRobuxInput = getElement('pricePerRobux');
const deliveryInfo = getElement('deliveryInfo');
const stockAlert = getElement('stockAlert');
const stockTitle = getElement('stockTitle');
const stockDesc = getElement('stockDesc');
const stockReady = getElement('stockReady');
const poAvailable = getElement('poAvailable');
const btnBuy = getElement('btnBuy');
const robuxError = getElement('robuxError');
const detailRobux = getElement('detailRobux');
const detailRate = getElement('detailRate');
const detailTotal = getElement('detailTotal');

// Config variables
let PRICE_PER_ROBUX = 115;
let CURRENT_STOCK = 0;
let CURRENT_PO = 0;
let PO_LIMIT = 0;

const CONFIG_ID = 'storeSettings';

function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

function updateUI() {
  // Cek apakah elemen penting ada
  if (!robuxInput) return;
  
  const robux = Number(robuxInput.value || 0);
  const total = robux * PRICE_PER_ROBUX;
  
  if (totalPrice) totalPrice.textContent = 'Rp ' + formatNumber(total);
  if (detailRobux) detailRobux.textContent = formatNumber(robux);
  if (detailRate) detailRate.textContent = 'Rp ' + formatNumber(PRICE_PER_ROBUX);
  if (detailTotal) detailTotal.textContent = 'Rp ' + formatNumber(total);
  
  if (robuxError) robuxError.classList.remove('show');
  
  if (btnBuy) {
    if (robux < 10) {
      btnBuy.disabled = true;
      if (robux > 0 && robuxError) {
        robuxError.classList.add('show');
      }
    } else {
      btnBuy.disabled = false;
    }
  }
  
  const maxAvailable = CURRENT_STOCK + CURRENT_PO;
  
  if (CURRENT_STOCK <= 0) {
    if (robux <= CURRENT_PO) {
      if (deliveryInfo) deliveryInfo.textContent = '📦 Pre-Order (15 hari kerja)';
      if (stockAlert) stockAlert.className = 'stock-alert out';
      if (stockTitle) stockTitle.textContent = '📦 Pre-Order Mode';
      if (stockDesc) stockDesc.textContent = `Stock habis – Sisa PO: ${formatNumber(CURRENT_PO)} Robux`;
    } else if (robux > 0) {
      if (deliveryInfo) deliveryInfo.textContent = '❌ Melebihi kapasitas PO';
      if (stockAlert) stockAlert.className = 'stock-alert out';
      if (stockTitle) stockTitle.textContent = '❌ Tidak Tersedia';
      if (stockDesc) stockDesc.textContent = `Maksimal PO: ${formatNumber(CURRENT_PO)} Robux`;
      if (btnBuy) btnBuy.disabled = true;
    }
  } else if (robux > CURRENT_STOCK) {
    const instantPart = CURRENT_STOCK;
    const poPart = robux - CURRENT_STOCK;
    
    if (poPart <= CURRENT_PO) {
      if (deliveryInfo) deliveryInfo.textContent = `⚡ ${formatNumber(instantPart)} Instant + 📦 ${formatNumber(poPart)} PO`;
      if (stockAlert) stockAlert.className = 'stock-alert low';
      if (stockTitle) stockTitle.textContent = '⚠️ Stock Terbatas';
      if (stockDesc) stockDesc.textContent = `${formatNumber(CURRENT_STOCK)} instant tersisa, sisanya PO`;
    } else {
      if (deliveryInfo) deliveryInfo.textContent = '❌ Melebihi kapasitas';
      if (stockAlert) stockAlert.className = 'stock-alert out';
      if (stockTitle) stockTitle.textContent = '❌ Tidak Tersedia';
      if (stockDesc) stockDesc.textContent = `Maksimal: ${formatNumber(maxAvailable)} Robux`;
      if (btnBuy) btnBuy.disabled = true;
    }
  } else {
    if (deliveryInfo) deliveryInfo.textContent = '⚡ Pengiriman Instant';
    if (stockAlert) stockAlert.className = 'stock-alert available';
    if (stockTitle) stockTitle.textContent = '✅ Stock Tersedia';
    if (stockDesc) stockDesc.textContent = `${formatNumber(CURRENT_STOCK)} Robux ready untuk pengiriman instant`;
  }
}

function updateStockDisplay() {
  if (stockReady) stockReady.textContent = formatNumber(CURRENT_STOCK);
  if (poAvailable) poAvailable.textContent = formatNumber(CURRENT_PO);
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
    if (pricePerRobuxInput) pricePerRobuxInput.value = 'Rp ' + formatNumber(PRICE_PER_ROBUX);
    updateStockDisplay();
    updateUI();
    
    // Hide loading screen
    if (loadingScreen) loadingScreen.style.display = 'none';
    
    console.log('✅ Config loaded - Harga: Rp', PRICE_PER_ROBUX, '/Robux, Stock:', CURRENT_STOCK);
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    if (loadingScreen) loadingScreen.style.display = 'none';
  }
}

// Fungsi untuk generate Order ID format RBX- (13 digit angka)
function generateOrderId() {
  const randomNum = Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
  return `RBX-${randomNum}`;
}

// Elemen Modal
const confirmModal = document.getElementById('confirmModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const confirmOrderBtn = document.getElementById('confirmOrderBtn');

// Variabel untuk menyimpan data sementara
let pendingOrderData = null;

// Update showConfirmModal untuk menampilkan username
function showConfirmModal() {
  // Ambil data dari form
  const robux = Number(robuxInput.value);
  const total = robux * PRICE_PER_ROBUX;
  const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '-';
  const customerPhone = document.getElementById('customerPhone')?.value?.trim() || '-';
  const robloxUsername = document.getElementById('robloxUsername')?.value?.trim() || '-';
  const deliveryText = deliveryInfo ? deliveryInfo.textContent : 'Pengiriman Instant';
  
  // Update modal dengan data
  document.getElementById('confirmRobux').textContent = `${robux.toLocaleString('id-ID')} Robux`;
  document.getElementById('confirmTotal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
  document.getElementById('confirmDelivery').textContent = deliveryText;
  document.getElementById('confirmEmail').textContent = customerEmail || '-';
  document.getElementById('confirmPhone').textContent = customerPhone || '-';
  document.getElementById('confirmUsername').textContent = robloxUsername || '-';
  
  // Tampilkan modal
  confirmModal.classList.add('active');
}

// Fungsi untuk menutup modal
function closeModal() {
  confirmModal.classList.remove('active');
}

// Fungsi untuk melanjutkan ke submit order (dipanggil setelah konfirmasi)
async function proceedSubmitOrder() {
  // Validasi username Roblox
  const robloxUsername = document.getElementById('robloxUsername')?.value?.trim() || '';
  const usernameError = document.getElementById('usernameError');
  
  if (!robloxUsername) {
    if (usernameError) usernameError.classList.add('show');
    alert('❌ Username Roblox wajib diisi!');
    return;
  }
  
  if (usernameError) usernameError.classList.remove('show');
  
  if (!validateUsername(robloxUsername)) {
    alert('❌ Username Roblox tidak valid!');
    return;
  }
  
  // Validasi checkbox terms
  const termsCheckbox = document.getElementById('termsCheckbox');
  const termsError = document.getElementById('termsError');
  
  if (!termsCheckbox || !termsCheckbox.checked) {
    if (termsError) termsError.classList.add('show');
    alert('❌ Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi untuk melanjutkan.');
    return;
  }
  
  if (termsError) termsError.classList.remove('show');
  
  // Validasi minimal salah satu kontak
  const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '';
  const customerPhone = document.getElementById('customerPhone')?.value?.trim() || '';
  
  if (!customerEmail && !customerPhone) {
    alert('❌ Anda wajib mengisi minimal salah satu: Email atau Nomor WhatsApp untuk konfirmasi order.');
    return;
  }
  
  // Validasi format email
  if (customerEmail && !isValidEmail(customerEmail)) {
    alert('❌ Format Email tidak valid. Contoh: nama@domain.com');
    return;
  }
  
  // Validasi format nomor HP
  if (customerPhone && !isValidPhone(customerPhone)) {
    alert('❌ Format Nomor WhatsApp/Telepon tidak valid. Contoh: 081234567890');
    return;
  }
  
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
  
  // Tampilkan loading
  if (btnBuy) {
    btnBuy.disabled = true;
    btnBuy.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Memproses...';
  }
  
  // Generate custom Order ID
  const orderId = generateOrderId();
  
  // Cek apakah ID sudah ada
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (orderSnap.exists()) {
    if (btnBuy) {
      btnBuy.disabled = false;
      btnBuy.innerHTML = '<i class="fas fa-arrow-right"></i> Lanjutkan Pembayaran';
    }
    return proceedSubmitOrder();
  }
  
  // Hitung waktu kadaluarsa: 2 jam dari sekarang
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + 2);
  
  // Create order
  const orderData = {
    robuxAmount: robux,
    totalPrice: total,
    deliveryInfo: deliveryInfo ? deliveryInfo.textContent : 'Pengiriman Instant',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: expireAt,
    customerEmail: customerEmail,
    customerPhone: customerPhone,
    robloxUsername: robloxUsername,  // 🔥 TAMBAHKAN INI
    termsAgreed: true
  };
  
  try {
    await setDoc(orderRef, orderData);
    window.location.href = `payment.html?orderId=${orderId}`;
  } catch (error) {
    console.error('Error creating order:', error);
    alert('Gagal membuat pesanan. Silakan coba lagi.');
    if (btnBuy) {
      btnBuy.disabled = false;
      btnBuy.innerHTML = '<i class="fas fa-arrow-right"></i> Lanjutkan Pembayaran';
    }
  }
}

// Update submitOrder untuk validasi username
async function submitOrder() {
  // Validasi username Roblox
  const robloxUsername = document.getElementById('robloxUsername')?.value?.trim() || '';
  const usernameError = document.getElementById('usernameError');
  
  if (!robloxUsername) {
    if (usernameError) usernameError.classList.add('show');
    alert('❌ Username Roblox wajib diisi!');
    return;
  }
  
  if (usernameError) usernameError.classList.remove('show');
  
  // Validasi format username
  if (!validateUsername(robloxUsername)) {
    alert('❌ Username Roblox tidak valid! Minimal 3 karakter, maksimal 50 karakter, dan tidak boleh mengandung karakter aneh.');
    return;
  }
  
  // Validasi checkbox terms
  const termsCheckbox = document.getElementById('termsCheckbox');
  const termsError = document.getElementById('termsError');
  
  if (!termsCheckbox || !termsCheckbox.checked) {
    if (termsError) termsError.classList.add('show');
    alert('❌ Anda harus menyetujui Syarat & Ketentuan dan Kebijakan Privasi untuk melanjutkan.');
    return;
  }
  
  if (termsError) termsError.classList.remove('show');
  
  // Validasi minimal salah satu kontak
  const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '';
  const customerPhone = document.getElementById('customerPhone')?.value?.trim() || '';
  
  if (!customerEmail && !customerPhone) {
    alert('❌ Anda wajib mengisi minimal salah satu: Email atau Nomor WhatsApp untuk konfirmasi order.');
    return;
  }
  
  // Validasi format email
  if (customerEmail && !isValidEmail(customerEmail)) {
    alert('❌ Format Email tidak valid. Contoh: nama@domain.com');
    return;
  }
  
  // Validasi format nomor HP
  if (customerPhone && !isValidPhone(customerPhone)) {
    alert('❌ Format Nomor WhatsApp/Telepon tidak valid. Contoh: 081234567890');
    return;
  }
  
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
  
  // Tampilkan modal konfirmasi
  showConfirmModal();
}

// Validasi username Roblox
function validateUsername(username) {
  if (!username || username.trim() === '') {
    return false;
  }
  // Minimal 3 karakter, maksimal 50 karakter
  if (username.length < 3 || username.length > 50) {
    return false;
  }
  // Tidak boleh mengandung karakter spesial berbahaya
  const invalidChars = /[<>{}[\]\\]/;
  if (invalidChars.test(username)) {
    return false;
  }
  return true;
}

// Validasi email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
}

// Validasi nomor HP
function isValidPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneRegex = /^(0|62|8)[0-9]{9,12}$/;
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 13;
}

// Event listener modal
if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
if (confirmOrderBtn) confirmOrderBtn.addEventListener('click', () => {
  closeModal();
  proceedSubmitOrder();
});

// Klik di luar modal untuk menutup
if (confirmModal) {
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeModal();
  });
}

// Event listeners - dengan pengecekan
if (robuxInput) {
  robuxInput.addEventListener('input', updateUI);
}

if (btnBuy) {
  btnBuy.addEventListener('click', submitOrder);
}

// Auto-refresh config every 30 seconds
setInterval(() => {
  loadConfig();
}, 30000);

// Tunggu DOM siap sebelum load config
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
  });
} else {
  loadConfig();
}