// File: api/user/deduct-balance.js
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  const { discordId, amount } = req.body;
  
  if (!discordId || !amount) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  try {
    const userId = `discord_${discordId}`;
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists()) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const currentBalance = userDoc.data().balance || 0;
    if (currentBalance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }
    
    const newBalance = currentBalance - amount;
    
    await userRef.update({
      balance: newBalance,
      totalSpent: admin.firestore.FieldValue.increment(amount),
      updatedAt: admin.firestore.Timestamp.now()
    });
    
    res.status(200).json({ success: true, newBalance });
  } catch (error) {
    console.error('Error deducting balance:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};