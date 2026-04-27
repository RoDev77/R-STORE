// File: public/js/discord-auth.js
// Login dengan Discord

const DISCORD_LOGIN_URL = '/api/discord-login';
const JWT_TOKEN_KEY = 'discord_session_token';
const DISCORD_USER_KEY = 'discord_user';

// DOM Elements
const authNotLoggedIn = document.getElementById('authNotLoggedIn');
const authLoggedIn = document.getElementById('authLoggedIn');
const discordLoginBtn = document.getElementById('discordLoginBtn');
const discordAvatar = document.getElementById('discordAvatar');
const discordUsername = document.getElementById('discordUsername');
const discordLogoutBtn = document.getElementById('discordLogoutBtn');
const discordUserInfo = document.getElementById('discordUserInfo');
const discordDropdown = document.getElementById('discordDropdown');

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

// Mulai login Discord
function loginWithDiscord() {
  window.location.href = DISCORD_LOGIN_URL;
}

// Logout
function logoutDiscord() {
  localStorage.removeItem(JWT_TOKEN_KEY);
  localStorage.removeItem(DISCORD_USER_KEY);
  updateUIBasedOnLogin();
  window.location.reload();
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
  
  if (isLoggedIn && user) {
    // Sembunyikan "belum login", tampilkan "sudah login"
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'block';
    
    // Set avatar
    if (discordAvatar && user.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`;
      discordAvatar.src = avatarUrl;
      discordAvatar.style.display = 'inline-block';
    } else if (discordAvatar) {
      discordAvatar.style.display = 'none';
    }
    
    // Set username
    if (discordUsername) {
      discordUsername.textContent = user.globalName || user.username;
    }
  } else {
    // Tampilkan "belum login", sembunyikan "sudah login"
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'flex';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
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
      
      showNotification(`Selamat datang, ${user.globalName || user.username}!`, 'success');
      
      // Bersihkan URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Update UI
      updateUIBasedOnLogin();
      
      // Refresh halaman untuk update UI
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (e) {
      console.error('Error parsing user data:', e);
      showNotification('Gagal memproses login', 'error');
    }
  }
}

// Setup dropdown menu
function setupDropdown() {
  if (!discordUserInfo || !discordDropdown) return;
  
  // Toggle dropdown saat klik avatar/username
  discordUserInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    discordDropdown.classList.toggle('show');
  });
  
  // Tutup dropdown jika klik di luar
  document.addEventListener('click', () => {
    discordDropdown.classList.remove('show');
  });
}

// Event listeners
if (discordLoginBtn) {
  discordLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginWithDiscord();
  });
}

if (discordLogoutBtn) {
  discordLogoutBtn.addEventListener('click', (e) => {
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