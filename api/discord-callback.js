// File: api/discord-callback.js
// Menyimpan user ke Firestore setelah login Discord

const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Gunakan service account dari environment variable
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    // Fallback untuk development
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credential: admin.credential.applicationDefault()
    });
  }
}

const db = admin.firestore();
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://store.rstudiolab.online/api/discord-callback';
const JWT_SECRET = process.env.JWT_SECRET || 'DHAmxoe9MDpmze29mmfoi2kdPODMDmxk92247jDkXNi2Jdi922JDndX218rndDN';

// Daftar user admin (Discord ID yang punya akses admin)
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS 
  ? process.env.ADMIN_DISCORD_IDS.split(',')
  : ['123456789']; // Ganti dengan Discord ID admin kamu

module.exports = async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_authorization_code');
  }
  
  try {
    // 1. Tukar code dengan access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Gagal mendapatkan access token');
    }
    
    // 2. Ambil data user dari Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const discordUser = await userResponse.json();
    
    // 3. Cek atau buat user di Firestore
    const userId = `discord_${discordUser.id}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    const now = admin.firestore.Timestamp.now();
    const isAdmin = ADMIN_DISCORD_IDS.includes(discordUser.id);
    
    let userData = {};
    
    if (!userDoc.exists) {
      // User baru: buat data awal
      userData = {
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name || discordUser.username,
        avatar: discordUser.avatar,
        email: discordUser.email || null,
        role: isAdmin ? 'admin' : 'member',
        balance: 0,
        totalSpent: 0,
        totalOrders: 0,
        createdAt: now,
        lastLogin: now,
        updatedAt: now
      };
    } else {
      // User sudah ada: update lastLogin
      userData = {
        lastLogin: now,
        updatedAt: now
      };
      
      // Update role jika perlu (misal user jadi admin)
      if (isAdmin && userDoc.data().role !== 'admin') {
        userData.role = 'admin';
      }
    }
    
    await userRef.set(userData, { merge: true });
    
    // 4. Ambil data lengkap user
    const finalUserData = userDoc.exists 
      ? { ...userDoc.data(), ...userData }
      : userData;
    
    // 5. Buat JWT token untuk session
    const sessionToken = jwt.sign(
      {
        userId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
        role: finalUserData.role || (isAdmin ? 'admin' : 'member'),
        balance: finalUserData.balance || 0,
        totalSpent: finalUserData.totalSpent || 0
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // 6. Redirect ke halaman utama dengan token
    const frontendUrl = process.env.FRONTEND_URL || 'https://store.rstudiolab.online';
    const userPayload = encodeURIComponent(JSON.stringify({
      id: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
      email: discordUser.email,
      role: finalUserData.role || (isAdmin ? 'admin' : 'member'),
      balance: finalUserData.balance || 0,
      totalSpent: finalUserData.totalSpent || 0
    }));
    
    res.redirect(`${frontendUrl}/?discord_token=${sessionToken}&user=${userPayload}`);
    
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect('/?error=auth_failed');
  }
};