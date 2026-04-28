// File: api/user/get-user.js
const admin = require('firebase-admin');

// Inisialisasi (sama seperti di test.js yang berhasil)
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS headers - HARUS ADA
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Hanya menerima GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { discordId } = req.query;
  
  if (!discordId) {
    return res.status(400).json({ success: false, error: 'Missing discordId' });
  }

  try {
    const userRef = db.collection('users').doc(`discord_${discordId}`);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const userData = userDoc.data();

    return res.status(200).json({
      success: true,
      user: {
        discordId: userData.discordId,
        username: userData.username,
        globalName: userData.globalName,
        avatar: userData.avatar,
        email: userData.email,
        role: userData.role,
        balance: userData.balance || 0,
        totalSpent: userData.totalSpent || 0,
        totalOrders: userData.totalOrders || 0
      }
    });
  } catch (error) {
    console.error('Error in get-user:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};