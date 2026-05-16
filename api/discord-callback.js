// File: api/discord-callback.js
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  
  if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
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
const ADMIN_DISCORD_IDS = process.env.ADMIN_DISCORD_IDS 
  ? process.env.ADMIN_DISCORD_IDS.split(',')
  : [];

// Fungsi untuk mendapatkan IP address
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['cf-connecting-ip'] ||
         req.connection.remoteAddress || 
         'Tidak tersedia';
}

// Fungsi untuk mendapatkan user agent info
function parseUserAgent(ua) {
  let device = 'Desktop';
  let os = 'Unknown';
  let browser = 'Unknown';
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    device = 'Tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    device = 'Mobile';
  }
  
  if (ua.indexOf('Windows') !== -1) os = 'Windows';
  else if (ua.indexOf('Mac') !== -1) os = 'MacOS';
  else if (ua.indexOf('Linux') !== -1) os = 'Linux';
  else if (ua.indexOf('Android') !== -1) os = 'Android';
  else if (ua.indexOf('iOS') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) os = 'iOS';
  
  if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) browser = 'Chrome';
  else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
  else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
  else if (ua.indexOf('Edg') !== -1) browser = 'Edge';
  else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) browser = 'Opera';
  
  return { device, os, browser };
}

module.exports = async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.redirect('/?error=no_authorization_code');
  }
  
  try {
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
    if (!tokenData.access_token) throw new Error('Gagal mendapatkan access token');
    
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();
    
    const userId = `discord_${discordUser.id}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    const now = admin.firestore.Timestamp.now();
    const isAdmin = ADMIN_DISCORD_IDS.includes(discordUser.id);
    
    if (!userDoc.exists) {
      await userRef.set({
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
      });
    } else {
      await userRef.update({
        lastLogin: now,
        updatedAt: now
      });
    }
    
    const finalDoc = await userRef.get();
    const finalUserData = finalDoc.data();
    
    const sessionToken = jwt.sign(
      {
        userId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        email: discordUser.email,
        role: finalUserData.role,
        balance: finalUserData.balance || 0,
        totalSpent: finalUserData.totalSpent || 0
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // 🔥 CATAT LOGIN KE FIRESTORE (collection login_history)
    const userAgent = req.headers['user-agent'] || '';
    const { device, os, browser } = parseUserAgent(userAgent);
    const ipAddress = getClientIp(req);
    
    await db.collection('login_history').add({
      discordId: discordUser.id,
      discordUsername: discordUser.username,
      discordGlobalName: discordUser.global_name || discordUser.username,
      loginTime: now,
      ip: ipAddress,
      userAgent: userAgent,
      device: device,
      os: os,
      browser: browser,
      sessionToken: sessionToken
    });
    
    // Redirect URL (pertahankan referral code jika ada)
    const referer = req.headers.referer || '/';
    const urlObj = new URL(referer, 'https://store.rstudiolab.online');
    const referralCode = urlObj.searchParams.get('ref');
    const redirectUrl = referralCode ? `/?ref=${referralCode}` : '/';
    
    // Kirim HTML response
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Login Berhasil - R STORE</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #0a0a14 0%, #0f0f1a 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            color: white;
          }
          .container { text-align: center; }
          .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(102,126,234,0.3);
            border-radius: 50%;
            border-top-color: #667eea;
            animation: spin 1s ease-in-out infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <h3>Login Berhasil!</h3>
          <p>Mengalihkan...</p>
        </div>
        <script>
          const userData = {
            id: "${discordUser.id}",
            username: "${discordUser.username}",
            globalName: "${discordUser.global_name || discordUser.username}",
            avatar: "${discordUser.avatar || ''}",
            email: "${discordUser.email || ''}",
            role: "${finalUserData.role}",
            balance: ${finalUserData.balance || 0},
            totalSpent: ${finalUserData.totalSpent || 0}
          };
          
          localStorage.setItem('discord_user', JSON.stringify(userData));
          localStorage.setItem('discord_session_token', '${sessionToken}');
          localStorage.setItem('discord_login_time', new Date().toISOString());
          
          window.location.href = '${redirectUrl}';
        </script>
      </body>
      </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect('/?error=auth_failed');
  }
};