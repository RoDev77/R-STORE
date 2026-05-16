import { db, doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from './firebase-config.js';
import { getDiscordUser, updateUserAfterOrder, isDiscordLoggedIn, fetchUserDataFromFirestore, getUserBalance, deductUserBalance } from './js/discord-auth.js';

// ==================== TOAST NOTIFICATION SYSTEM ====================
function showToast(message, type = 'error') {
  // Hapus toast lama
  const oldToast = document.querySelector('.custom-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
    </div>
    <div class="toast-message">${message}</div>
    <div class="toast-close">
      <i class="fas fa-times"></i>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Animasi masuk
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto close setelah 3 detik
  const timeout = setTimeout(() => {
    closeToast(toast);
  }, 3000);
  
  // Close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    clearTimeout(timeout);
    closeToast(toast);
  });
  
  // Klik di luar
  toast.addEventListener('click', (e) => {
    if (e.target === toast) {
      clearTimeout(timeout);
      closeToast(toast);
    }
  });
}

function closeToast(toast) {
  toast.classList.remove('show');
  setTimeout(() => toast.remove(), 300);
}

// Style untuk toast
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  .custom-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: rgba(26, 26, 48, 0.98);
    backdrop-filter: blur(12px);
    border-radius: 16px;
    padding: 14px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 10000;
    transform: translateX(450px);
    transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    border-left: 4px solid;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    min-width: 280px;
    max-width: 400px;
  }
  
  .custom-toast.show {
    transform: translateX(0);
  }
  
  .custom-toast.error {
    border-left-color: #dc3545;
  }
  .custom-toast.error .toast-icon i {
    color: #dc3545;
  }
  
  .custom-toast.success {
    border-left-color: #28a745;
  }
  .custom-toast.success .toast-icon i {
    color: #28a745;
  }
  
  .custom-toast.warning {
    border-left-color: #ffc107;
  }
  .custom-toast.warning .toast-icon i {
    color: #ffc107;
  }
  
  .custom-toast.info {
    border-left-color: #00d4ff;
  }
  .custom-toast.info .toast-icon i {
    color: #00d4ff;
  }
  
  .toast-icon i {
    font-size: 22px;
  }
  
  .toast-message {
    flex: 1;
    font-size: 13px;
    color: #e0e0e0;
    line-height: 1.4;
  }
  
  .toast-close {
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  
  .toast-close:hover {
    opacity: 1;
  }
  
  .toast-close i {
    font-size: 14px;
    color: #a0a0b0;
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  .shake-animation {
    animation: shake 0.5s ease;
  }
  
  @media (max-width: 640px) {
    .custom-toast {
      bottom: 16px;
      right: 16px;
      left: 16px;
      transform: translateY(100px);
      min-width: auto;
    }
    .custom-toast.show {
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(toastStyle);
// ==================== END TOAST SYSTEM ====================

// DOM Elements
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
const robloxUsernameInput = getElement('robloxUsername');
const customerEmailInput = getElement('customerEmail');
const customerPhoneInput = getElement('customerPhone');

// Config variables
let PRICE_PER_ROBUX = 115;
let CURRENT_STOCK = 0;
let CURRENT_PO = 0;
let PO_LIMIT = 0;

const CONFIG_ID = 'storeSettings';

function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

// 🔥 AMBIL USERNAME ROBLOX DARI FIRESTORE
async function loadRobloxUsernameFromFirestore() {
  if (!isDiscordLoggedIn()) return null;
  
  const user = getDiscordUser();
  if (!user || !user.id) return null;
  
  try {
    const userRef = doc(db, 'users', `discord_${user.id}`);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.robloxData?.username) return data.robloxData.username;
      if (data.robloxUsername) return data.robloxUsername;
    }
    return null;
  } catch (error) {
    console.error('Error loading Roblox username:', error);
    return null;
  }
}

// 🔥 AMBIL INFORMASI KONTAK DARI FIRESTORE
async function loadContactInfoFromFirestore() {
  if (!isDiscordLoggedIn()) return { email: '', phone: '' };
  
  const user = getDiscordUser();
  if (!user || !user.id) return { email: '', phone: '' };
  
  try {
    const userRef = doc(db, 'users', `discord_${user.id}`);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        email: data.email || '',
        phone: data.phone || ''
      };
    }
    return { email: '', phone: '' };
  } catch (error) {
    console.error('Error loading contact info:', error);
    return { email: '', phone: '' };
  }
}

// 🔥 UPDATE UI - Isi otomatis semua data dari Firestore
async function updateUserDataFromFirestore() {
  const savedRobloxUsername = await loadRobloxUsernameFromFirestore();
  if (savedRobloxUsername && robloxUsernameInput && !robloxUsernameInput.value.trim()) {
    robloxUsernameInput.value = savedRobloxUsername;
    console.log('✅ Roblox username auto-filled:', savedRobloxUsername);
  }
  
  const contactInfo = await loadContactInfoFromFirestore();
  if (contactInfo.email && customerEmailInput && !customerEmailInput.value.trim()) {
    customerEmailInput.value = contactInfo.email;
    console.log('✅ Email auto-filled:', contactInfo.email);
  }
  if (contactInfo.phone && customerPhoneInput && !customerPhoneInput.value.trim()) {
    customerPhoneInput.value = contactInfo.phone;
    console.log('✅ Phone auto-filled:', contactInfo.phone);
  }
}

function updateUI() {
  if (!robuxInput) return;
  
  const robux = Number(robuxInput.value || 0);
  const total = robux * PRICE_PER_ROBUX;
  
  if (totalPrice) totalPrice.textContent = 'Rp ' + formatNumber(total);
  
  if (robuxError) robuxError.classList.remove('show');
  
  if (btnBuy) {
    if (robux < 50) {
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
    console.log('🔄 Loading config...');
    const configRef = doc(db, 'config', CONFIG_ID);
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      const data = configSnap.data();
      PRICE_PER_ROBUX = data.pricePerRobux || 115;
      CURRENT_STOCK = data.currentStock || 0;
      CURRENT_PO = data.currentPO || 0;
      PO_LIMIT = data.poLimit || 0;
      console.log('✅ Config loaded:', { PRICE_PER_ROBUX, CURRENT_STOCK, CURRENT_PO });
    } else {
      console.warn('⚠️ Config not found, using defaults');
      PRICE_PER_ROBUX = 115;
      CURRENT_STOCK = 10000;
      CURRENT_PO = 5000;
      PO_LIMIT = 5000;
    }
    
    if (pricePerRobuxInput) pricePerRobuxInput.value = 'Rp ' + formatNumber(PRICE_PER_ROBUX);
    updateStockDisplay();
    updateUI();
    
    await updateUserDataFromFirestore();
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    
  } catch (error) {
    console.error('❌ Failed to load config:', error);
    if (stockDesc) stockDesc.textContent = 'Error loading stock: ' + error.message;
    if (loadingScreen) loadingScreen.style.display = 'none';
  }
}

function generateOrderId() {
  const randomNum = Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0');
  return `RBX-${randomNum}`;
}

const confirmModal = document.getElementById('confirmModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const confirmOrderBtn = document.getElementById('confirmOrderBtn');

function showConfirmModal() {
  const robux = Number(robuxInput.value);
  const total = robux * PRICE_PER_ROBUX;
  const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '-';
  const customerPhone = document.getElementById('customerPhone')?.value?.trim() || '-';
  const robloxUsername = document.getElementById('robloxUsername')?.value?.trim() || '-';
  const deliveryText = deliveryInfo ? deliveryInfo.textContent : 'Pengiriman Instant';
  
  document.getElementById('confirmRobux').textContent = `${robux.toLocaleString('id-ID')} Robux`;
  document.getElementById('confirmTotal').textContent = `Rp ${total.toLocaleString('id-ID')}`;
  document.getElementById('confirmDelivery').textContent = deliveryText;
  document.getElementById('confirmEmail').textContent = customerEmail || '-';
  document.getElementById('confirmPhone').textContent = customerPhone || '-';
  document.getElementById('confirmUsername').textContent = robloxUsername || '-';
  
  confirmModal.classList.add('active');
}

function closeModal() {
  confirmModal.classList.remove('active');
}

function highlightElement(element) {
  if (!element) return;
  element.classList.add('shake-animation');
  setTimeout(() => {
    element.classList.remove('shake-animation');
  }, 500);
}

async function proceedSubmitOrder() {
  let robloxUsername = document.getElementById('robloxUsername')?.value?.trim() || '';
  const usernameError = document.getElementById('usernameError');
  
  if (!robloxUsername) {
    const savedUsername = await loadRobloxUsernameFromFirestore();
    if (savedUsername) {
      robloxUsername = savedUsername;
      if (robloxUsernameInput) robloxUsernameInput.value = savedUsername;
      showToast(`Username Roblox terisi otomatis: ${savedUsername}`, 'info');
    }
  }
  
  if (!robloxUsername) {
    if (usernameError) usernameError.classList.add('show');
    highlightElement(robloxUsernameInput);
    showToast('❌ Username Roblox wajib diisi!', 'error');
    return;
  }
  
  if (usernameError) usernameError.classList.remove('show');
  
  if (!validateUsername(robloxUsername)) {
    highlightElement(robloxUsernameInput);
    showToast('❌ Username Roblox tidak valid!', 'error');
    return;
  }
  
  const termsCheckbox = document.getElementById('termsCheckbox');
  const termsError = document.getElementById('termsError');
  
  if (!termsCheckbox || !termsCheckbox.checked) {
    if (termsError) termsError.classList.add('show');
    highlightElement(document.querySelector('.terms-checkbox'));
    showToast('❌ Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.', 'error');
    return;
  }
  
  if (termsError) termsError.classList.remove('show');
  
  const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '';
  const customerPhone = document.getElementById('customerPhone')?.value?.trim() || '';
  
  if (!customerEmail && !customerPhone) {
    showToast('❌ Anda wajib mengisi minimal salah satu: Email atau WhatsApp', 'error');
    return;
  }
  
  if (customerEmail && !isValidEmail(customerEmail)) {
    showToast('❌ Format Email tidak valid. Contoh: nama@domain.com', 'error');
    return;
  }
  
  if (customerPhone && !isValidPhone(customerPhone)) {
    showToast('❌ Format Nomor WhatsApp tidak valid. Contoh: 081234567890', 'error');
    return;
  }
  
  const robux = Number(robuxInput.value);
  
  if (robux < 50) {
    showToast('❌ Minimal pembelian 50 Robux', 'error');
    return;
  }
  
  const maxAvailable = CURRENT_STOCK + CURRENT_PO;
  
  if (robux > maxAvailable) {
    showToast(`❌ Maksimal pembelian saat ini: ${formatNumber(maxAvailable)} Robux`, 'error');
    return;
  }
  
  if (btnBuy) {
    btnBuy.disabled = true;
    btnBuy.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Memproses...';
  }
  
  const orderId = generateOrderId();
  const orderRef = doc(db, 'orders', orderId);
  const orderSnap = await getDoc(orderRef);
  
  if (orderSnap.exists()) {
    if (btnBuy) {
      btnBuy.disabled = false;
      btnBuy.innerHTML = '<i class="fas fa-arrow-right"></i> Lanjutkan Pembayaran';
    }
    return proceedSubmitOrder();
  }
  
  const expireAt = new Date();
  expireAt.setHours(expireAt.getHours() + 2);
  
  const discordUser = getDiscordUser();
  const discordId = discordUser ? discordUser.id : null;
  
  const orderData = {
    robuxAmount: robux,
    totalPrice: total,
    deliveryInfo: deliveryInfo ? deliveryInfo.textContent : 'Pengiriman Instant',
    status: 'pending',
    paymentMethod: 'qris',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expireAt: expireAt,
    customerEmail: customerEmail,
    customerPhone: customerPhone,
    robloxUsername: robloxUsername,
    termsAgreed: true,
    discordId: discordId
  };
  
  try {
    await setDoc(orderRef, orderData);
    window.location.href = `payment.html?orderId=${orderId}`;
  } catch (error) {
    console.error('Error creating order:', error);
    showToast('❌ Gagal membuat pesanan. Silakan coba lagi.', 'error');
    if (btnBuy) {
      btnBuy.disabled = false;
      btnBuy.innerHTML = '<i class="fas fa-arrow-right"></i> Lanjutkan Pembayaran';
    }
  }
}

async function submitOrder() {
  let robloxUsername = document.getElementById('robloxUsername')?.value?.trim() || '';
  const usernameError = document.getElementById('usernameError');
  
  if (!robloxUsername) {
    const savedUsername = await loadRobloxUsernameFromFirestore();
    if (savedUsername) {
      robloxUsername = savedUsername;
      if (robloxUsernameInput) robloxUsernameInput.value = savedUsername;
      showToast(`Username Roblox terisi otomatis: ${savedUsername}`, 'info');
    }
  }
  
  if (!robloxUsername) {
    if (usernameError) usernameError.classList.add('show');
    highlightElement(robloxUsernameInput);
    showToast('❌ Username Roblox wajib diisi!', 'error');
    return;
  }
  
  if (usernameError) usernameError.classList.remove('show');
  
  if (!validateUsername(robloxUsername)) {
    highlightElement(robloxUsernameInput);
    showToast('❌ Username Roblox tidak valid!', 'error');
    return;
  }
  
  const termsCheckbox = document.getElementById('termsCheckbox');
  const termsError = document.getElementById('termsError');
  
  if (!termsCheckbox || !termsCheckbox.checked) {
    if (termsError) termsError.classList.add('show');
    highlightElement(document.querySelector('.terms-checkbox'));
    showToast('❌ Anda harus menyetujui Syarat & Ketentuan untuk melanjutkan.', 'error');
    return;
  }
  
  if (termsError) termsError.classList.remove('show');
  
  const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '';
  const customerPhone = document.getElementById('customerPhone')?.value?.trim() || '';
  
  if (!customerEmail && !customerPhone) {
    showToast('❌ Anda wajib mengisi minimal salah satu: Email atau WhatsApp', 'error');
    return;
  }
  
  if (customerEmail && !isValidEmail(customerEmail)) {
    showToast('❌ Format Email tidak valid. Contoh: nama@domain.com', 'error');
    return;
  }
  
  if (customerPhone && !isValidPhone(customerPhone)) {
    showToast('❌ Format Nomor WhatsApp tidak valid. Contoh: 081234567890', 'error');
    return;
  }
  
  const robux = Number(robuxInput.value);
  
  if (robux < 50) {
    showToast('❌ Minimal pembelian 50 Robux', 'error');
    return;
  }
  
  showConfirmModal();
}

function validateUsername(username) {
  if (!username || username.trim() === '') return false;
  if (username.length < 3 || username.length > 50) return false;
  const invalidChars = /[<>{}[\]\\]/;
  if (invalidChars.test(username)) return false;
  return true;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const cleanPhone = phone.replace(/\D/g, '');
  const phoneRegex = /^(0|62|8)[0-9]{9,12}$/;
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10 && cleanPhone.length <= 13;
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
if (confirmOrderBtn) confirmOrderBtn.addEventListener('click', () => {
  closeModal();
  proceedSubmitOrder();
});

if (confirmModal) {
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) closeModal();
  });
}

if (robuxInput) {
  robuxInput.addEventListener('input', updateUI);
}

if (btnBuy) {
  btnBuy.addEventListener('click', submitOrder);
}

if (robloxUsernameInput) {
  robloxUsernameInput.addEventListener('focus', async () => {
    if (!robloxUsernameInput.value.trim()) {
      const savedUsername = await loadRobloxUsernameFromFirestore();
      if (savedUsername) {
        robloxUsernameInput.value = savedUsername;
        showToast(`Username terisi dari koneksi Roblox`, 'info');
      }
    }
  });
}

setInterval(() => {
  loadConfig();
}, 30000);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
  });
} else {
  loadConfig();
}