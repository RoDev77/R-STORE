// File: public/js/discord-auth.js
// Login dengan Discord - Lengkap dengan balance dari Firestore

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

// Ambil role user (admin/member)
function getUserRole() {
  const user = getDiscordUser();
  return user?.role || 'member';
}

// Cek apakah user adalah admin
function isAdmin() {
  return getUserRole() === 'admin';
}

// Ambil saldo user dari localStorage (cache)
function getUserBalance() {
  const user = getDiscordUser();
  return user?.balance || 0;
}

// Ambil total pengeluaran user
function getUserTotalSpent() {
  const user = getDiscordUser();
  return user?.totalSpent || 0;
}

// Fetch data user terbaru dari Firestore
async function fetchUserDataFromFirestore() {
  const user = getDiscordUser();
  if (!user || !user.id) return null;
  
  try {
    const response = await fetch(`/api/user/get-user?discordId=${user.id}`);
    const data = await response.json();
    
    if (data.success && data.user) {
      // Update localStorage dengan data terbaru
      const updatedUser = {
        ...user,
        balance: data.user.balance || 0,
        totalSpent: data.user.totalSpent || 0,
        totalOrders: data.user.totalOrders || 0,
        role: data.user.role || 'member'
      };
      localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(updatedUser));
      
      // Update UI balance
      if (userBalance) {
        userBalance.textContent = `Rp ${(updatedUser.balance || 0).toLocaleString('id-ID')}`;
      }
      
      return updatedUser;
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
  return null;
}

// Tambahkan fungsi untuk menambah balance (deposit)
async function addUserBalance(discordId, amount) {
  try {
    const response = await fetch('/api/user/add-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: discordId,
        amount: amount
      })
    });
    
    const data = await response.json();
    if (data.success) {
      // Update localStorage
      const user = getDiscordUser();
      if (user) {
        user.balance = (user.balance || 0) + amount;
        localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(user));
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding balance:', error);
    return false;
  }
}

// Fungsi untuk mengurangi balance (beli Robux)
async function deductUserBalance(discordId, amount) {
  try {
    const response = await fetch('/api/user/deduct-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: discordId,
        amount: amount
      })
    });
    
    const data = await response.json();
    if (data.success) {
      // Update localStorage
      const user = getDiscordUser();
      if (user) {
        user.balance = (user.balance || 0) - amount;
        localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(user));
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deducting balance:', error);
    return false;
  }
}

// Update data user setelah transaksi
async function updateUserAfterOrder(amount, robuxAmount) {
  const user = getDiscordUser();
  if (!user) return false;
  
  const newBalance = (user.balance || 0) + amount;
  const newTotalSpent = (user.totalSpent || 0) + amount;
  const newTotalOrders = (user.totalOrders || 0) + 1;
  
  try {
    const response = await fetch('/api/user/update-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: user.id,
        balance: newBalance,
        totalSpent: newTotalSpent,
        totalOrders: newTotalOrders,
        lastOrderAmount: amount,
        lastOrderRobux: robuxAmount
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update localStorage
      const updatedUser = {
        ...user,
        balance: newBalance,
        totalSpent: newTotalSpent,
        totalOrders: newTotalOrders
      };
      localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(updatedUser));
      
      // Update UI
      if (userBalance) {
        userBalance.textContent = `Rp ${newBalance.toLocaleString('id-ID')}`;
      }
      
      return true;
    }
  } catch (error) {
    console.error('Error updating balance:', error);
  }
  return false;
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
async function updateUIBasedOnLogin() {
  const isLoggedIn = isDiscordLoggedIn();
  const user = getDiscordUser();
  
  if (isLoggedIn && user) {
    // Sembunyikan "belum login", tampilkan "sudah login"
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'block';
    
    // Set avatar
    if (userAvatar && user.avatar) {
      const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
      userAvatar.src = avatarUrl;
    } else if (userAvatar && user.id) {
      const defaultAvatar = `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;
      userAvatar.src = defaultAvatar;
    }
    
    // Set username dengan format "Username™"
    if (userName) {
      const displayName = user.globalName || user.username;
      userName.textContent = displayName;
    }
    
    // Set saldo dari data user
    if (userBalance) {
      userBalance.textContent = `Rp ${(user.balance || 0).toLocaleString('id-ID')}`;
    }

    // Di dalam fungsi updateUIBasedOnLogin, setelah user login
    const depositLink = document.querySelector('.user-dropdown a[href="deposit.html"]');
    if (depositLink) {
      depositLink.addEventListener('click', (e) => {
        // sudah benar, hanya redirect
      });
    }
    
    // Fetch data terbaru dari Firestore untuk memastikan balance up to date
    await fetchUserDataFromFirestore();
    
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
      
    } catch (e) {
      console.error('Error parsing user data:', e);
      showNotification('Gagal memproses login', 'error');
    }
  }
}

// Setup dropdown menu
function setupDropdown() {
  if (!userInfo || !userDropdown || !userMenu) return;
  
  userInfo.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('show');
    userMenu.classList.toggle('active');
  });
  
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

// Export functions
export { 
  isDiscordLoggedIn, 
  getDiscordUser, 
  getUserBalance, 
  getUserTotalSpent, 
  getUserRole, 
  isAdmin,
  updateUserAfterOrder,
  fetchUserDataFromFirestore,
  addUserBalance,
  deductUserBalance
};