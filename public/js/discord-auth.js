// File: public/js/discord-auth.js
// Login dengan Discord - Manual tanpa Firebase Auth

const DISCORD_LOGIN_URL = '/api/discord-login';
const JWT_TOKEN_KEY = 'discord_session_token';
const DISCORD_USER_KEY = 'discord_user';

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
  window.location.reload();
}

// Tampilkan notifikasi
function showNotification(message, type = 'success') {
  // Hapus notifikasi lama
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

// Update UI berdasarkan status login
function updateDiscordUI() {
  const isLoggedIn = isDiscordLoggedIn();
  const user = getDiscordUser();
  
  const discordLoginBtn = document.getElementById('discordLoginBtn');
  const discordUserMenu = document.getElementById('discordUserMenu');
  const discordAvatar = document.getElementById('discordAvatar');
  const discordUsername = document.getElementById('discordUsername');
  
  if (isLoggedIn && user) {
    // Sembunyikan tombol login
    if (discordLoginBtn) discordLoginBtn.style.display = 'none';
    
    // Tampilkan user menu
    if (discordUserMenu) {
      discordUserMenu.style.display = 'block';
    }
    
    // Set avatar
    if (discordAvatar && user.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`;
      discordAvatar.src = avatarUrl;
      discordAvatar.style.display = 'inline-block';
    }
    
    // Set username
    if (discordUsername) {
      discordUsername.textContent = user.globalName || user.username;
    }
    
    // Setup dropdown
    const userInfo = discordUserMenu?.querySelector('.discord-user-info');
    const dropdown = discordUserMenu?.querySelector('.discord-dropdown');
    
    if (userInfo && dropdown) {
      // Toggle dropdown
      userInfo.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      };
      
      // Tutup dropdown jika klik di luar
      document.addEventListener('click', () => {
        dropdown.classList.remove('show');
      });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('discordLogoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        logoutDiscord();
      };
    }
    
  } else {
    // Tampilkan tombol login
    if (discordLoginBtn) discordLoginBtn.style.display = 'inline-flex';
    if (discordUserMenu) discordUserMenu.style.display = 'none';
  }
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
  checkDiscordCallback();
  updateDiscordUI();
  
  // Pasang event listener untuk tombol login
  const discordLoginBtn = document.getElementById('discordLoginBtn');
  if (discordLoginBtn) {
    discordLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginWithDiscord();
    });
  }
});