// File: public/js/discord-auth.js
// Login dengan Discord - Lengkap dengan balance dari Firestore

import { db, doc, setDoc, getDoc } from '../firebase-config.js';

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

// Bersihkan token dari URL jika ada (untuk keamanan)
function cleanDiscordTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('discord_token') || urlParams.has('user')) {
    urlParams.delete('discord_token');
    urlParams.delete('user');
    const newSearch = urlParams.toString();
    const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}
cleanDiscordTokenFromURL();

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

function getUserRole() {
  const user = getDiscordUser();
  return user?.role || 'member';
}

function isAdmin() {
  return getUserRole() === 'admin';
}

function getUserBalance() {
  const user = getDiscordUser();
  return user?.balance || 0;
}

function getUserTotalSpent() {
  const user = getDiscordUser();
  return user?.totalSpent || 0;
}

async function fetchUserDataFromFirestore() {
  const user = getDiscordUser();
  if (!user || !user.id) return null;
  
  try {
    const response = await fetch(`/api/user/get-user?discordId=${user.id}`);
    const data = await response.json();
    
    if (data.success && data.user) {
      const updatedUser = {
        ...user,
        balance: data.user.balance || 0,
        totalSpent: data.user.totalSpent || 0,
        totalOrders: data.user.totalOrders || 0,
        role: data.user.role || 'member'
      };
      localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(updatedUser));
      
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

async function addUserBalance(discordId, amount) {
  try {
    const response = await fetch('/api/user/add-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, amount })
    });
    const data = await response.json();
    if (data.success) {
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

async function deductUserBalance(discordId, amount) {
  try {
    const response = await fetch('/api/user/deduct-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, amount })
    });
    const data = await response.json();
    if (data.success) {
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
      const updatedUser = {
        ...user,
        balance: newBalance,
        totalSpent: newTotalSpent,
        totalOrders: newTotalOrders
      };
      localStorage.setItem(DISCORD_USER_KEY, JSON.stringify(updatedUser));
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

function loginWithDiscord() {
  window.location.href = DISCORD_LOGIN_URL;
}

function logoutDiscord() {
  localStorage.removeItem(JWT_TOKEN_KEY);
  localStorage.removeItem(DISCORD_USER_KEY);
  updateUIBasedOnLogin();
  showNotification('Anda telah logout', 'info');
  setTimeout(() => window.location.reload(), 500);
}

function showNotification(message, type = 'success') {
  const oldToast = document.querySelector('.notification-toast');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `notification-toast ${type}`;
  toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i><span>${message}</span>`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

async function updateUIBasedOnLogin() {
  const isLoggedIn = isDiscordLoggedIn();
  const user = getDiscordUser();
  
  if (isLoggedIn && user) {
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'none';
    if (authLoggedIn) authLoggedIn.style.display = 'block';
    
    if (userAvatar && user.avatar) {
      userAvatar.src = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
    } else if (userAvatar && user.id) {
      userAvatar.src = `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png`;
    }
    
    if (userName) userName.textContent = user.globalName || user.username;
    if (userBalance) userBalance.textContent = `Rp ${(user.balance || 0).toLocaleString('id-ID')}`;
    
    await fetchUserDataFromFirestore();
  } else {
    if (authNotLoggedIn) authNotLoggedIn.style.display = 'flex';
    if (authLoggedIn) authLoggedIn.style.display = 'none';
  }
}

// 🔥 FUNGSI UTAMA: Simpan data user ke Firestore (dipanggil dari HTML response atau saat login)
async function saveDiscordUserToFirestore(user) {
  if (!user || !user.id) return false;
  
  try {
    const userRef = doc(db, 'users', `discord_${user.id}`);
    const userSnap = await getDoc(userRef);
    const nowISO = new Date().toISOString();
    
    if (!userSnap.exists()) {
      // FIRST LOGIN - simpan semua termasuk discordVerifiedAt
      await setDoc(userRef, {
        discordId: user.id,
        discordUsername: user.username,
        discordGlobalName: user.globalName || user.username,
        discordAvatar: user.avatar,
        discordEmail: user.email || null,
        discordVerifiedAt: nowISO,
        discordConnected: true,
        balance: 0,
        totalSpent: 0,
        totalOrders: 0,
        role: 'member',
        createdAt: nowISO,
        lastLogin: nowISO
      });
      console.log('✅ First login - saved discordVerifiedAt:', nowISO);
      return true;
    } else {
      const existingData = userSnap.data();
      if (!existingData.discordVerifiedAt) {
        await setDoc(userRef, { discordVerifiedAt: nowISO, lastLogin: nowISO }, { merge: true });
        console.log('✅ Added missing discordVerifiedAt:', nowISO);
      } else {
        await setDoc(userRef, { lastLogin: nowISO }, { merge: true });
        console.log('✅ Existing user - discordVerifiedAt already:', existingData.discordVerifiedAt);
      }
      return true;
    }
  } catch (error) {
    console.error('Error saving discord user:', error);
    return false;
  }
}

// 🔥 CEK APAKAH USER BARU LOGIN (dipanggil dari halaman utama saat load)
async function checkAndSaveUserFromLocalStorage() {
  const user = getDiscordUser();
  const token = localStorage.getItem(JWT_TOKEN_KEY);
  
  if (user && token) {
    console.log('✅ User found in localStorage:', user.username);
    await saveDiscordUserToFirestore(user);
    await updateUIBasedOnLogin();
  } else {
    updateUIBasedOnLogin();
  }
}

// Setup dropdown menu
function setupDropdown() {
  const checkInterval = setInterval(() => {
    const userInfoEl = document.getElementById('userInfo');
    const userDropdownEl = document.getElementById('userDropdown');
    const userMenuEl = document.querySelector('.user-menu');
    
    if (userInfoEl && userDropdownEl && userMenuEl) {
      clearInterval(checkInterval);
      
      let backdrop = document.querySelector('.dropdown-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'dropdown-backdrop';
        document.body.appendChild(backdrop);
      }
      
      const finalUserInfo = document.getElementById('userInfo');
      const finalUserDropdown = document.getElementById('userDropdown');
      const finalUserMenu = document.querySelector('.user-menu');
      const finalBackdrop = document.querySelector('.dropdown-backdrop');
      
      if (finalUserInfo && finalUserDropdown && finalUserMenu) {
        finalUserInfo.addEventListener('click', (e) => {
          e.stopPropagation();
          finalUserDropdown.classList.toggle('show');
          finalUserMenu.classList.toggle('active');
          if (finalBackdrop) finalBackdrop.classList.toggle('show');
        });
        
        if (finalBackdrop) {
          finalBackdrop.addEventListener('click', () => {
            finalUserDropdown.classList.remove('show');
            finalUserMenu.classList.remove('active');
            finalBackdrop.classList.remove('show');
          });
        }
        
        document.addEventListener('click', (e) => {
          if (!finalUserMenu.contains(e.target)) {
            finalUserDropdown.classList.remove('show');
            finalUserMenu.classList.remove('active');
            if (finalBackdrop) finalBackdrop.classList.remove('show');
          }
        });
      }
    }
  }, 100);
  setTimeout(() => clearInterval(checkInterval), 5000);
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
  checkAndSaveUserFromLocalStorage();
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
  deductUserBalance,
  saveDiscordUserToFirestore
};