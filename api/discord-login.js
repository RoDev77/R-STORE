// File: api/discord-login.js
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1032176001150636052';
const REDIRECT_URI = 'https://r-store.vercel.app/api/discord-callback';

module.exports = (req, res) => {
  const DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
  
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify email',
  });
  
  res.redirect(`${DISCORD_AUTH_URL}?${params.toString()}`);
};