// File: api/user/update-balance.js

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  const { discordId, balance, totalSpent } = req.body;
  
  if (!discordId) {
    return res.status(400).json({ success: false, error: 'Missing discordId' });
  }
  
  try {
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    
    const updateData = {
      updatedAt: admin.firestore.Timestamp.now()
    };
    
    if (balance !== undefined) updateData.balance = balance;
    if (totalSpent !== undefined) updateData.totalSpent = totalSpent;
    
    await userRef.update(updateData);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating user balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};