const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fetch = require('node-fetch');

// Konfigurasi - Ganti dengan Client ID dan Secret dari Roblox Creator Dashboard
const ROBLOX_CLIENT_ID = process.env.ROBLOX_CLIENT_ID;
const ROBLOX_CLIENT_SECRET = process.env.ROBLOX_CLIENT_SECRET;
const REDIRECT_URI = `${process.env.BASE_URL}/api/roblox/callback`;

// Store PKCE verifiers dan states (gunakan Redis untuk production)
const oauthSessions = new Map();

// Generate PKCE code verifier dan challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

// Route: Mulai OAuth Roblox
router.get('/auth', (req, res) => {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');
  
  // Simpan session data
  oauthSessions.set(sessionId, {
    codeVerifier,
    state,
    discordId: req.query.discordId,
    createdAt: Date.now()
  });
  
  // Hapus session setelah 10 menit
  setTimeout(() => oauthSessions.delete(sessionId), 10 * 60 * 1000);
  
  const authUrl = `https://apis.roblox.com/oauth/v1/authorize?${new URLSearchParams({
    client_id: ROBLOX_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: 'openid profile',
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  })}`;
  
  // Simpan sessionId ke cookie
  res.cookie('roblox_oauth_session', sessionId, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000
  });
  
  res.redirect(authUrl);
});

// Route: Callback setelah user authorize
router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const sessionId = req.cookies.roblox_oauth_session;
  
  if (error) {
    console.error('Roblox OAuth Error:', error, error_description);
    return res.redirect(`/settings?error=roblox_${error}`);
  }
  
  if (!sessionId || !oauthSessions.has(sessionId)) {
    return res.redirect('/settings?error=session_expired');
  }
  
  const session = oauthSessions.get(sessionId);
  oauthSessions.delete(sessionId);
  
  // Validasi state
  if (state !== session.state) {
    return res.redirect('/settings?error=invalid_state');
  }
  
  try {
    // Tukar code dengan access token
    const tokenResponse = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: ROBLOX_CLIENT_ID,
        client_secret: ROBLOX_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        code_verifier: session.codeVerifier
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.error) {
      console.error('Token error:', tokenData);
      return res.redirect('/settings?error=token_exchange_failed');
    }
    
    // Ambil user info
    const userInfoResponse = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    const robloxUser = await userInfoResponse.json();
    
    // Simpan ke database Firestore
    const { db } = require('./firebase-config');
    const userRef = db.collection('users').doc(`discord_${session.discordId}`);
    
    await userRef.set({
      robloxData: {
        userId: robloxUser.sub,
        username: robloxUser.preferred_username,
        displayName: robloxUser.name,
        avatar: `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUser.sub}&width=100&height=100&format=png`,
        profileUrl: `https://www.roblox.com/users/${robloxUser.sub}/profile`,
        verifiedAt: new Date().toISOString(),
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: Date.now() + (tokenData.expires_in * 1000)
      },
      robloxConnected: true,
      robloxUsername: robloxUser.preferred_username,
      updatedAt: new Date()
    }, { merge: true });
    
    // Mulai refresh token interval (optional)
    scheduleTokenRefresh(session.discordId, tokenData.refresh_token);
    
    res.redirect('/settings?roblox=connected');
    
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/settings?error=callback_failed');
  }
});

// Schedule refresh token
function scheduleTokenRefresh(discordId, refreshToken) {
  // Refresh setiap 14 menit (token valid 15 menit)
  setInterval(async () => {
    try {
      const newToken = await refreshRobloxToken(refreshToken);
      if (newToken) {
        const userRef = db.collection('users').doc(`discord_${discordId}`);
        await userRef.update({
          'robloxData.accessToken': newToken,
          'robloxData.tokenExpiresAt': Date.now() + (14 * 60 * 1000)
        });
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }, 14 * 60 * 1000);
}

// Refresh token function
async function refreshRobloxToken(refreshToken) {
  const response = await fetch('https://apis.roblox.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: ROBLOX_CLIENT_ID,
      client_secret: ROBLOX_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  const data = await response.json();
  return data.access_token;
}

// API: Get Roblox user info (dari database)
router.get('/user/:discordId', async (req, res) => {
  const { discordId } = req.params;
  
  try {
    const userRef = db.collection('users').doc(`discord_${discordId}`);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists || !userDoc.data().robloxData) {
      return res.json({ connected: false });
    }
    
    const { robloxData } = userDoc.data();
    res.json({
      connected: true,
      userId: robloxData.userId,
      username: robloxData.username,
      displayName: robloxData.displayName,
      avatar: robloxData.avatar,
      verifiedAt: robloxData.verifiedAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Disconnect Roblox
router.post('/disconnect', async (req, res) => {
  const { discordId } = req.body;
  
  try {
    const userRef = db.collection('users').doc(`discord_${discordId}`);
    await userRef.update({
      robloxData: null,
      robloxConnected: false,
      robloxUsername: null,
      updatedAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;