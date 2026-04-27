// File: public/js/discord-auth.js
// Login dengan Discord - Style seperti OxRodi™

const DISCORD_LOGIN_URL = '/api/discord-login';
const JWT_TOKEN_KEY = 'discord_session_token';
const DISCORD_USER_KEY = 'discord_user';

// DOM Elements
const authNotLoggedIn = document.getElementById('authNotLoggedIn');
const authLoggedIn = document.getElementById('authLoggedIn');
const discordLoginBtn = document.getElementById('discordLoginBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userBalance = document.getElementById('userBalance');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo = document.getElementById('userInfo');
const userDropdown = document.getElementById('userDropdown');
const userMenu = document.querySelector('.user-menu');

// Cek apakah user sudah login
function isDiscordLoggedIn() {
  const token = localStorage.getItem(JWT_TOKEN_KEY);
  const user = localStorage.getItem(DISCORD_USER_KEY);
  return token && user;
}

// Ambil data user yang login
function getDiscordUser() {
  const user = localStorage.getItem(DISCORD_USER_KEY);
  return user ? JSON.parse(user) : null;
}

// Ambil saldo user (dari Firestore atau localStorage)
function getUserBalance() {
  // TODO: Ambil dari Firestore nanti
  const savedBalance = localStorage.getItem('user_balance');
  return savedBalance ? parseInt(savedBalance) : 0;
}

// Mulai login Discord
function loginWithDiscord() {
  window.location.href = DISCORD_LOGIN_URL;
}

// Logout
function logoutDiscord() {
  localStorage.removeItem(JWT_TOKEN_KEY);
  localStorage.removeItem(DISCORD_USER_KEY);
  localStorage.removeItem('user_balance');
  updateUIBasedOnLogin();
  showNotification('Anda telah logout', 'info');
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// Tampilkan notifikasi
function showNotification(message, type = 'success') {
  const oldToast = document.querySelector('.notification-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Update UI berdasarkan status login
function updateUIBasedOnLogin() {
  const isLoggedIn = isDiscordLoggedIn();
  const user = getDiscordUser();
  const balance = getUserBalance();
  
  if (isLoggedIn && user) {
    // Sembunyikan "belum login", tampilkan "sudah login"
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'block';
    
    // Set avatar
    if (userAvatar && user.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
      userAvatar.src = avatarUrl;
    } else if (userAvatar && user.id) {
      // Default avatar jika tidak ada custom avatar
      const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;
      userAvatar.src = defaultAvatar;
    }
    
    // Set username dengan format "Username™"
    if (userName) {
      const displayName = user.globalName || user.username;
      userName.textContent = displayName;
    }
    
    // Set saldo
    if (userBalance) {
      userBalance.textContent = `Rp ${balance.toLocaleString('id-ID')}`;
    }
  } else {
    // Tampilkan "belum login", sembunyikan "sudah login"
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'flex';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
  }
}

// Update saldo (dipanggil setelah transaksi)
function updateBalance(newBalance) {
  localStorage.setItem('user_balance', newBalance);
  if (userBalance) {
    userBalance.textContent = `Rp ${newBalance.toLocaleString('id-ID')}`;
  }
}

// Cek parameter dari redirect Discord
function checkDiscordCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('discord_token');
  const userData = urlParams.get('user');
  const error = urlParams.get('error');
  
  if (error) {
    showNotification('Login Discord gagal: ' + error, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  if (sessionToken && userData) {
    try {
      const user = JSON.parse(decodeURIComponent(userData));
      
      // Simpan ke localStorage
      localStorage.setItem(JWT_TOKEN_KEY, sessionToken);
      localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(user));
      
      // Set saldo awal 0
      if (!localStorage.getItem('user_balance')) {
        localStorage.setItem('user_balance', '0');
      }
      
      showNotification(`Selamat datang, ${user.globalName || user.username}!`, 'success');
      
      // Bersihkan URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Update UI
      updateUIBasedOnLogin();
      
    } catch (e) {
      console.error('Error parsing user data:', e);
      showNotification('Gagal memproses login', 'error');
    }
  }
}

// Setup dropdown menu
function setupDropdown() {
  if (!userInfo || !userDropdown || !userMenu) return;
  
  // Toggle dropdown saat klik user info
  userInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
    userMenu.classList.toggle('active');
  });
  
  // Tutup dropdown jika klik di luar
  document.addEventListener('click', (e) => {
    if (!userMenu.contains(e.target)) {
      userDropdown.classList.remove('show');
      userMenu.classList.remove('active');
    }
  });
}

// Event listeners
if (discordLoginBtn) {
  discordLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginWithDiscord();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutDiscord();
  });
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
  checkDiscordCallback();
  updateUIBasedOnLogin();
  setupDropdown();
});

// Export functions untuk digunakan di file lain
export { updateBalance, getUserBalance, isDiscordLoggedIn, getDiscordUser };