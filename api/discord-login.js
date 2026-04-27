// File: api/discord-login.js

module.exports = (req, res) => {
  // Ambil dari environment variable
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  
  // Log untuk debugging (cek di Vercel logs)
  console.log('DISCORD_CLIENT_ID:', DISCORD_CLIENT_ID);
  
  if (!DISCORD_CLIENT_ID) {
    console.error('DISCORD_CLIENT_ID is not set!');
    return res.status(500).send('Server configuration error: DISCORD_CLIENT_ID missing');
  }
  
  const REDIRECT_URI = 'https://store.rstudiolab.online/api/discord-callback';
  const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
  
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
  });
  
  console.log('Redirecting to:', `${DISCORD_AUTH_URL}?${params.toString()}`);
  res.redirect(`${DISCORD_AUTH_URL}?${params.toString()}`);
};