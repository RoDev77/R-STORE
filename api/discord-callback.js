// File: api/discord-callback.js
// TANPA node-fetch, pakai fetch bawaan Node.js 18+

const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  const { code } = req.query;
  
  console.log('Callback received with code:', code ? 'YES' : 'NO');
  
  if (!code) {
    return res.redirect('/?error=no_authorization_code');
  }
  
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const REDIRECT_URI = 'https://store.rstudiolab.online/api/discord-callback';
  const JWT_SECRET = process.env.JWT_SECRET || 'JWT_SECRET=DHAmxoe9MDpmze29mmfoi2kdPODMDmxk92247jDkXNi2Jdi922JDndX218rndDN';
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error('Discord credentials missing!');
    return res.redirect('/?error=server_config');
  }
  
  try {
    // 1. Tukar code dengan access token
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: REDIRECT_URI,
    });
    
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      console.error('Failed to get access token:', tokenData);
      throw new Error('Gagal mendapatkan access token');
    }
    
    // 2. Ambil data user dari Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    
    const discordUser = await userResponse.json();
    
    if (!discordUser.id) {
      console.error('Failed to get user data:', discordUser);
      throw new Error('Gagal mendapatkan data user');
    }
    
    // 3. Buat JWT token untuk session
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
    
    // 4. Redirect ke halaman utama dengan token
    const frontendUrl = process.env.FRONTEND_URL || 'https://store.rstudiolab.online';
    const userData = encodeURIComponent(JSON.stringify({
      id: discordUser.id,
      username: discordUser.username,
      globalName: discordUser.global_name,
      avatar: discordUser.avatar,
      email: discordUser.email
    }));
    
    console.log('Login successful for user:', discordUser.username);
    res.redirect(`${frontendUrl}/?discord_token=${sessionToken}&user=${userData}`);
    
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect('/?error=auth_failed');
  }
};