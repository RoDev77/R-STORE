// File: public/js/discord-auth.js
// Handle login Discord di frontend

const DISCORD_LOGIN_URL = '/api/discord-login';

// Cek apakah user sudah login
function isDiscordLoggedIn() {
  const token = localStorage.getItem('discord_session_token');
  const user = localStorage.getItem('discord_user');
  return token && user;
}

// Ambil data user yang login
function getDiscordUser() {
  const user = localStorage.getItem('discord_user');
  return user ? JSON.parse(user) : null;
}

// Mulai login Discord
function loginWithDiscord() {
  window.location.href = DISCORD_LOGIN_URL;
}

// Logout
function logoutDiscord() {
  localStorage.removeItem('discord_session_token');
  localStorage.removeItem('discord_user');
  window.location.reload();
}

// Cek parameter dari redirect Discord
function checkDiscordCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionToken = urlParams.get('discord_token');
  const userData = urlParams.get('user');
  const error = urlParams.get('error');
  
  if (error) {
    console.error('Discord login error:', error);
    showNotification('Login Discord gagal: ' + error, 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  if (sessionToken && userData) {
    try {
      const user = JSON.parse(decodeURIComponent(userData));
      
      // Simpan ke localStorage
      localStorage.setItem('discord_session_token', sessionToken);
      localStorage.setItem('discord_user', JSON.stringify(user));
      
      showNotification(`Selamat datang, ${user.globalName || user.username}!`, 'success');
      
      // Bersihkan URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Refresh halaman
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
  }
}

// Verifikasi token ke server (opsional, untuk validasi)
async function verifyDiscordToken() {
  const token = localStorage.getItem('discord_session_token');
  if (!token) return false;
  
  try {
    const response = await fetch('/api/discord-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    const data = await response.json();
    return data.valid;
  } catch (error) {
    return false;
  }
}

// Tampilkan notifikasi
function showNotification(message, type = 'info') {
  // Cek apakah sudah ada container notifikasi
  let container = document.querySelector('.notification-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Tambahkan tombol login Discord ke navbar
function addDiscordButton() {
  const isLoggedIn = isDiscordLoggedIn();
  const user = getDiscordUser();
  
  // Cari tempat untuk menempatkan tombol
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  
  // Hapus tombol lama jika ada
  const oldBtn = document.querySelector('.discord-auth-btn');
  if (oldBtn) oldBtn.remove();
  
  if (isLoggedIn && user) {
    // Tampilkan profil user jika sudah login
    const avatarUrl = user.avatar 
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    
    const userMenu = document.createElement('div');
    userMenu.className = 'discord-user-menu';
    userMenu.innerHTML = `
      <div class="discord-user-info">
        <img src="${avatarUrl}" alt="Avatar" class="discord-avatar">
        <span class="discord-username">${user.globalName || user.username}</span>
        <i class="fas fa-chevron-down"></i>
      </div>
      <div class="discord-dropdown">
        <a href="#" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</a>
      </div>
    `;
    
    navLinks.appendChild(userMenu);
    
    // Event dropdown
    const userInfo = userMenu.querySelector('.discord-user-info');
    const dropdown = userMenu.querySelector('.discord-dropdown');
    userInfo.addEventListener('click', () => {
      dropdown.classList.toggle('show');
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      logoutDiscord();
    });
    
    // Tutup dropdown jika klik di luar
    document.addEventListener('click', (e) => {
      if (!userMenu.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
    
  } else {
    // Tampilkan tombol login
    const discordBtn = document.createElement('a');
    discordBtn.href = '#';
    discordBtn.className = 'discord-auth-btn';
    discordBtn.innerHTML = '<i class="fab fa-discord"></i> Login dengan Discord';
    discordBtn.onclick = (e) => {
      e.preventDefault();
      loginWithDiscord();
    };
    
    navLinks.appendChild(discordBtn);
  }
}

// Style untuk Discord button
function addDiscordStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .discord-auth-btn {
      background: #5865F2;
      color: white !important;
      padding: 8px 20px !important;
      border-radius: 30px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 8px !important;
      transition: all 0.3s !important;
    }
    .discord-auth-btn:hover {
      background: #4752C4 !important;
      transform: translateY(-2px) !important;
    }
    
    .discord-user-menu {
      position: relative;
      cursor: pointer;
    }
    .discord-user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(102,126,234,0.2);
      border-radius: 30px;
      transition: all 0.3s;
    }
    .discord-user-info:hover {
      background: rgba(102,126,234,0.4);
    }
    .discord-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
    }
    .discord-username {
      font-size: 13px;
      font-weight: 600;
    }
    .discord-dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      background: #1a1a30;
      border-radius: 12px;
      padding: 8px 0;
      min-width: 150px;
      border: 1px solid rgba(255,255,255,0.1);
      display: none;
      z-index: 1000;
    }
    .discord-dropdown.show {
      display: block;
    }
    .discord-dropdown a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      color: #fff;
      text-decoration: none;
      font-size: 13px;
    }
    .discord-dropdown a:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .notification-container {
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 9999;
    }
    .notification {
      background: #1a1a30;
      border-radius: 12px;
      padding: 12px 20px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
      border-left: 4px solid #667eea;
      animation: slideIn 0.3s ease;
    }
    .notification.success { border-left-color: #28a745; }
    .notification.error { border-left-color: #dc3545; }
    .notification.fade-out { animation: fadeOut 0.3s ease forwards; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
  addDiscordStyles();
  checkDiscordCallback();
  addDiscordButton();
});