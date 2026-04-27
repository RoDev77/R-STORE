// File: api/discord-callback.js
// Endpoint callback setelah user login di Discord

const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Initialize Firebase Admin (cukup sekali)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://r-store.vercel.app/api/discord-callback';
const JWT_SECRET = process.env.JWT_SECRET || 'rahasia-default-ganti-ini';

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
    
    // 3. Simpan atau update user ke Firestore
    const db = admin.firestore();
    const userRef = db.collection('discord_users').doc(discordUser.id);
    const userDoc = await userRef.get();
    
    const userData = {
      discordId: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name || discordUser.username,
      avatar: discordUser.avatar,
      email: discordUser.email || null,
      lastLogin: admin.firestore.Timestamp.now(),
      loginCount: userDoc.exists ? (userDoc.data().loginCount || 0) + 1 : 1,
    };
    
    if (!userDoc.exists) {
      userData.createdAt = admin.firestore.Timestamp.now();
    }
    
    await userRef.set(userData, { merge: true });
    
    // 4. Buat JWT token untuk session
    const sessionToken = jwt.sign(
      {
        userId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // 5. Redirect ke halaman utama dengan token
    const frontendUrl = process.env.FRONTEND_URL || 'https://r-store.vercel.app';
    res.redirect(`${frontendUrl}/?discord_token=${sessionToken}&user=${encodeURIComponent(JSON.stringify({
      id: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
      email: discordUser.email
    }))}`);
    
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect('/?error=auth_failed');
  }
};